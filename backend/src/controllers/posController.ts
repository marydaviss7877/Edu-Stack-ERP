import { Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { Types } from 'mongoose';
import { InventoryItem } from '../models/InventoryItem';
import { InventoryTransaction } from '../models/InventoryTransaction';
import { IncomeEntry } from '../models/IncomeEntry';
import { POSSale, IPOSSale } from '../models/POSSale';
import { orgBranchScope } from '../utils/orgBranchScope';
import { postPosSale } from '../services/ledgerService';

function saleNo(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `POS-${date}-${randomBytes(3).toString('hex').toUpperCase()}`;
}

export async function listSellableItems(req: Request, res: Response): Promise<void> {
  const filter = { ...orgBranchScope({ orgId: req.orgId!, branchId: req.user!.branchId }), isSellable: true };
  const items = await InventoryItem.find(filter).select('name assetCode category salePrice availableQuantity unit').sort({ name: 1 }).lean();
  res.json({ success: true, data: items });
}

export async function listSales(req: Request, res: Response): Promise<void> {
  const { orgId, branchId } = req.user!;
  const filter: Record<string, unknown> = orgBranchScope({ orgId: orgId!, branchId });
  if (req.query.status) filter.status = req.query.status;
  if (req.query.start || req.query.end) {
    const range: Record<string, Date> = {};
    if (req.query.start) range.$gte = new Date(String(req.query.start));
    if (req.query.end) range.$lt = new Date(String(req.query.end));
    filter.soldAt = range;
  }
  const sales = await POSSale.find(filter).populate('soldById', 'name').sort({ soldAt: -1 }).limit(500).lean();
  res.json({ success: true, data: sales });
}

export async function getDailySummary(req: Request, res: Response): Promise<void> {
  const { orgId, branchId } = req.user!;
  const dayStr = String(req.query.date || new Date().toISOString().slice(0, 10));
  const start = new Date(`${dayStr}T00:00:00`);
  const end = new Date(`${dayStr}T23:59:59.999`);
  const scope = orgBranchScope({ orgId: orgId!, branchId });

  const sales = await POSSale.find({ ...scope, soldAt: { $gte: start, $lte: end }, status: 'completed' }).lean();
  const byMethod: Record<string, number> = {};
  for (const s of sales) byMethod[s.paymentMethod] = (byMethod[s.paymentMethod] || 0) + s.total;

  res.json({
    success: true,
    data: {
      date: dayStr,
      saleCount: sales.length,
      totalRevenue: Math.round(sales.reduce((sum, s) => sum + s.total, 0)),
      byMethod,
    },
  });
}

interface CheckoutLine { itemId: string; qty: number }

export async function checkout(req: Request, res: Response): Promise<void> {
  const { orgId, branchId } = req.user!;
  if (!branchId) { res.status(400).json({ success: false, message: 'A branch context is required' }); return; }

  const lines = req.body.items as CheckoutLine[] | undefined;
  const paymentMethod = req.body.paymentMethod as IPOSSale['paymentMethod'] | undefined;
  const discount = Number(req.body.discount || 0);
  const customerName = req.body.customerName as string | undefined;

  const VALID_METHODS: IPOSSale['paymentMethod'][] = ['cash', 'bank_transfer', 'cheque', 'jazzcash', 'easypaisa', 'other'];
  if (!Array.isArray(lines) || lines.length === 0 || !paymentMethod || !VALID_METHODS.includes(paymentMethod)) {
    res.status(422).json({ success: false, message: 'items[] and a valid paymentMethod are required' });
    return;
  }

  const items = await InventoryItem.find({ orgId, branchId, _id: { $in: lines.map((l) => l.itemId) }, isSellable: true });
  const itemMap = new Map(items.map((i) => [String(i._id), i]));

  const saleLines: { itemId: Types.ObjectId; name: string; qty: number; unitPrice: number; lineTotal: number }[] = [];
  for (const line of lines) {
    const item = itemMap.get(line.itemId);
    const qty = Number(line.qty);
    if (!item) { res.status(404).json({ success: false, message: `Product not found or not sellable: ${line.itemId}` }); return; }
    if (qty <= 0) { res.status(422).json({ success: false, message: `Invalid quantity for ${item.name}` }); return; }
    if (qty > item.availableQuantity) { res.status(409).json({ success: false, message: `Not enough stock for ${item.name} (${item.availableQuantity} available)` }); return; }
    saleLines.push({ itemId: item._id as Types.ObjectId, name: item.name, qty, unitPrice: item.salePrice, lineTotal: qty * item.salePrice });
  }

  const subtotal = saleLines.reduce((sum, l) => sum + l.lineTotal, 0);
  const total = Math.max(0, subtotal - discount);

  const sale = await POSSale.create({
    orgId, branchId, saleNo: saleNo(), items: saleLines, subtotal, discount, total,
    paymentMethod, customerName, status: 'completed', soldById: req.user!.id, soldAt: new Date(),
  });

  for (const line of saleLines) {
    const item = itemMap.get(String(line.itemId))!;
    item.availableQuantity -= line.qty;
    await item.save();
    await InventoryTransaction.create({
      orgId, branchId, itemId: item._id, type: 'issue', quantity: line.qty,
      unitCost: item.unitCost, referenceNo: sale.saleNo, occurredAt: sale.soldAt,
      notes: `POS sale ${sale.saleNo}`, performedById: req.user!.id,
    });
  }

  const income = await IncomeEntry.create({
    orgId, branchId, receiptNo: sale.saleNo, receivedAt: sale.soldAt, category: 'Canteen',
    description: `POS sale ${sale.saleNo}${customerName ? ` — ${customerName}` : ''}`,
    amount: total, paymentMethod, status: 'received', createdById: req.user!.id,
  });

  void postPosSale(orgId!, branchId, total, paymentMethod, String(sale._id), req.user!.id);

  res.status(201).json({ success: true, data: { sale, incomeEntryId: income._id } });
}

export async function voidSale(req: Request, res: Response): Promise<void> {
  const { orgId, branchId } = req.user!;
  const sale = await POSSale.findOne({ _id: req.params.id, orgId, branchId });
  if (!sale) { res.status(404).json({ success: false, message: 'Sale not found' }); return; }
  if (sale.status === 'voided') { res.status(400).json({ success: false, message: 'Sale already voided' }); return; }

  sale.status = 'voided';
  sale.voidedReason = req.body.reason || 'Voided';
  await sale.save();

  for (const line of sale.items) {
    const item = await InventoryItem.findOne({ _id: line.itemId, orgId, branchId });
    if (!item) continue;
    item.availableQuantity += line.qty;
    await item.save();
    await InventoryTransaction.create({
      orgId, branchId, itemId: item._id, type: 'return', quantity: line.qty,
      referenceNo: sale.saleNo, occurredAt: new Date(), notes: `Void of POS sale ${sale.saleNo}`, performedById: req.user!.id,
    });
  }

  await IncomeEntry.findOneAndUpdate({ orgId, branchId, receiptNo: sale.saleNo }, { status: 'void' });

  res.json({ success: true, data: sale });
}
