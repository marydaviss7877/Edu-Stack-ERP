import { randomBytes } from 'crypto';
import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { Types } from 'mongoose';
import { InventoryItem } from '../models/InventoryItem';
import { InventoryTransaction, InventoryTransactionType } from '../models/InventoryTransaction';
import { Expense } from '../models/Expense';
import { ProcurementRequest } from '../models/ProcurementRequest';
import { Vendor } from '../models/Vendor';
import { Challan } from '../models/Challan';
import { Payroll } from '../models/Payroll';
import { Branch } from '../models/Branch';
import { IncomeEntry } from '../models/IncomeEntry';
import { calculateOperatingResult } from '../utils/finance';
import { postExpensePayment, postIncomeReceived } from '../services/ledgerService';

export const EXPENSE_CATEGORIES = [
  'Salaries & Benefits', 'Utilities', 'Rent & Rates', 'Repairs & Maintenance',
  'Teaching & Laboratory Supplies', 'IT & Software', 'Library', 'Transport',
  'Security', 'Cleaning & Sanitation', 'Examinations', 'Student Activities',
  'Marketing & Admissions', 'Professional Services', 'Government Fees & Taxes',
  'Scholarships & Financial Aid', 'Capital Purchases', 'Other',
];

const ASSET_CATEGORIES = [
  'Land & Buildings', 'Furniture & Fixtures', 'Computers & IT Equipment',
  'Laboratory Equipment', 'Library Assets', 'Vehicles', 'Generators & Solar',
  'Security & Surveillance', 'Sports Equipment', 'Medical & First Aid',
  'Teaching Aids', 'Office Equipment', 'Electrical & HVAC', 'Consumable Stores',
  'Uniforms & Stationery', 'Cleaning Supplies', 'Other',
];

const INCOME_CATEGORIES = [
  'Admission & Registration', 'Transport', 'Hostel', 'Canteen', 'Grants',
  'Donations', 'Endowment', 'Rent & Facility Hire', 'Asset Disposal',
  'Bank & Investment Income', 'Events & Activities', 'Other',
];

function orgObjectId(req: Request): Types.ObjectId {
  return new Types.ObjectId(req.user!.orgId || req.orgId!);
}

function readScope(req: Request): Record<string, unknown> {
  const filter: Record<string, unknown> = { orgId: orgObjectId(req) };
  if (req.user!.role === 'group_admin') {
    const requested = (req.query.branchId as string | undefined) || req.user!.branchId;
    if (requested && Types.ObjectId.isValid(requested)) filter.branchId = new Types.ObjectId(requested);
  } else if (req.user!.branchId) {
    filter.branchId = new Types.ObjectId(req.user!.branchId);
  }
  return filter;
}

function writeBranchId(req: Request): Types.ObjectId | null {
  const value = req.user!.role === 'group_admin'
    ? (req.body.branchId as string | undefined) || req.user!.branchId
    : req.user!.branchId;
  return value && Types.ObjectId.isValid(value) ? new Types.ObjectId(value) : null;
}

function reportPeriod(req: Request): { start: Date; end: Date; month: string } {
  const month = /^\d{4}-\d{2}$/.test(String(req.query.month || ''))
    ? String(req.query.month)
    : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const [year, monthNo] = month.split('-').map(Number);
  return {
    month,
    start: new Date(year, monthNo - 1, 1),
    end: new Date(year, monthNo, 1),
  };
}

function autoReference(prefix: string): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `${prefix}-${date}-${randomBytes(3).toString('hex').toUpperCase()}`;
}

function validationFailed(req: Request, res: Response): boolean {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;
  res.status(422).json({ success: false, errors: errors.array() });
  return true;
}

export const createInventoryItemValidators = [
  body('name').trim().notEmpty(),
  body('type').isIn(['fixed_asset', 'consumable']),
  body('category').trim().notEmpty(),
  body('quantity').optional().isFloat({ min: 0 }),
  body('unitCost').optional().isFloat({ min: 0 }),
];

export async function getInventoryMetadata(_req: Request, res: Response): Promise<void> {
  res.json({
    success: true,
    data: {
      currency: 'PKR',
      assetCategories: ASSET_CATEGORIES,
      expenseCategories: EXPENSE_CATEGORIES,
      incomeCategories: INCOME_CATEGORIES,
      procurementMethods: ['petty_purchase', 'quotation', 'open_bidding', 'direct_contracting', 'framework', 'other'],
      note: 'Approval limits and procurement methods must be configured for the institution’s province and public/private status.',
    },
  });
}

export async function listInventoryItems(req: Request, res: Response): Promise<void> {
  const filter = readScope(req);
  for (const key of ['type', 'category', 'status', 'condition']) {
    if (req.query[key]) filter[key] = req.query[key];
  }
  if (req.query.lowStock === 'true') filter.$expr = { $lte: ['$availableQuantity', '$reorderLevel'] };
  if (req.query.search) {
    const search = String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [{ name: new RegExp(search, 'i') }, { assetCode: new RegExp(search, 'i') }, { serialNo: new RegExp(search, 'i') }];
  }
  const items = await InventoryItem.find(filter)
    .populate('branchId', 'name code')
    .populate('custodianId', 'name role')
    .populate('vendorId', 'name ntn')
    .sort({ updatedAt: -1 })
    .limit(Math.min(Number(req.query.limit) || 100, 2000))
    .lean();
  res.json({ success: true, data: items });
}

export async function createInventoryItem(req: Request, res: Response): Promise<void> {
  if (validationFailed(req, res)) return;
  const branchId = writeBranchId(req);
  if (!branchId) {
    res.status(400).json({ success: false, message: 'A valid branchId is required' });
    return;
  }
  const quantity = Number(req.body.quantity ?? 1);
  const item = await InventoryItem.create({
    ...req.body,
    orgId: orgObjectId(req),
    branchId,
    assetCode: req.body.assetCode?.trim() || autoReference(req.body.type === 'consumable' ? 'STK' : 'AST'),
    quantity,
    availableQuantity: Number(req.body.availableQuantity ?? quantity),
    createdById: req.user!.id,
  });
  await InventoryTransaction.create({
    orgId: orgObjectId(req), branchId, itemId: item._id, type: 'opening', quantity,
    unitCost: item.unitCost, occurredAt: item.purchaseDate || new Date(), performedById: req.user!.id,
  });
  res.status(201).json({ success: true, data: item });
}

export async function updateInventoryItem(req: Request, res: Response): Promise<void> {
  const allowed = [
    'name', 'description', 'category', 'subcategory', 'unit', 'reorderLevel', 'unitCost',
    'salvageValue', 'purchaseDate', 'inServiceDate', 'usefulLifeMonths', 'depreciationMethod',
    'location', 'department', 'custodianId', 'vendorId', 'serialNo', 'modelNo',
    'warrantyExpiry', 'fundingSource', 'condition', 'status', 'notes', 'isSellable', 'salePrice',
  ];
  const update: Record<string, unknown> = {};
  for (const key of allowed) if (req.body[key] !== undefined) update[key] = req.body[key];
  const item = await InventoryItem.findOneAndUpdate(
    { _id: req.params.id, ...readScope(req) }, update, { new: true, runValidators: true }
  );
  if (!item) {
    res.status(404).json({ success: false, message: 'Inventory item not found' });
    return;
  }
  res.json({ success: true, data: item });
}

export const inventoryTransactionValidators = [
  body('type').isIn(['receipt', 'issue', 'return', 'transfer', 'adjustment', 'maintenance', 'verification', 'loss', 'disposal']),
  body('quantity').isFloat({ min: 0 }),
];

export async function recordInventoryTransaction(req: Request, res: Response): Promise<void> {
  if (validationFailed(req, res)) return;
  const item = await InventoryItem.findOne({ _id: req.params.id, ...readScope(req) });
  if (!item) {
    res.status(404).json({ success: false, message: 'Inventory item not found' });
    return;
  }
  const type = req.body.type as InventoryTransactionType;
  const quantity = Number(req.body.quantity);
  if (['issue', 'loss', 'disposal'].includes(type) && quantity > item.availableQuantity) {
    res.status(409).json({ success: false, message: 'Quantity exceeds available stock' });
    return;
  }
  if (['receipt', 'return'].includes(type)) {
    item.quantity += quantity;
    item.availableQuantity += quantity;
  } else if (['issue', 'loss', 'disposal'].includes(type)) {
    item.availableQuantity -= quantity;
    if (type === 'disposal' && item.type === 'fixed_asset' && item.availableQuantity === 0) item.status = 'disposed';
    if (type === 'loss' && item.type === 'fixed_asset' && item.availableQuantity === 0) item.status = 'lost';
  } else if (type === 'adjustment') {
    item.availableQuantity = quantity;
    item.quantity = Math.max(item.quantity, quantity);
  } else if (type === 'maintenance') {
    item.status = 'under_maintenance';
  } else if (type === 'verification') {
    item.lastVerifiedAt = new Date();
    item.nextVerificationDue = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  } else if (type === 'transfer' && req.body.toLocation) {
    item.location = req.body.toLocation;
  }
  await item.save();
  const transaction = await InventoryTransaction.create({
    orgId: item.orgId,
    branchId: item.branchId,
    itemId: item._id,
    type,
    quantity,
    unitCost: req.body.unitCost,
    fromLocation: req.body.fromLocation,
    toLocation: req.body.toLocation,
    issuedToId: req.body.issuedToId,
    referenceNo: req.body.referenceNo,
    occurredAt: req.body.occurredAt || new Date(),
    notes: req.body.notes,
    performedById: req.user!.id,
    approvedById: req.body.approvedById,
  });
  res.status(201).json({ success: true, data: { item, transaction } });
}

export async function listInventoryTransactions(req: Request, res: Response): Promise<void> {
  const filter = readScope(req);
  if (req.query.itemId) filter.itemId = req.query.itemId;
  if (req.query.type) filter.type = req.query.type;
  const records = await InventoryTransaction.find(filter)
    .populate('itemId', 'assetCode name category unit')
    .populate('performedById', 'name role')
    .sort({ occurredAt: -1 })
    .limit(Math.min(Number(req.query.limit) || 100, 500))
    .lean();
  res.json({ success: true, data: records });
}

export async function getInventoryDashboard(req: Request, res: Response): Promise<void> {
  const scope = readScope(req);
  const items = await InventoryItem.find(scope).lean();
  const now = new Date();
  let acquisitionCost = 0;
  let accumulatedDepreciation = 0;
  let monthlyDepreciation = 0;
  let lowStock = 0;
  let verificationOverdue = 0;
  let maintenanceDue = 0;

  for (const item of items) {
    if (item.status === 'disposed') continue;
    const cost = item.unitCost * item.quantity;
    acquisitionCost += cost;
    if (item.type === 'consumable' && item.availableQuantity <= item.reorderLevel) lowStock++;
    if (item.nextVerificationDue && item.nextVerificationDue < now) verificationOverdue++;
    if (item.status === 'under_maintenance' || item.condition === 'poor' || item.condition === 'unserviceable') maintenanceDue++;
    if (item.type === 'fixed_asset' && item.depreciationMethod === 'straight_line' && item.usefulLifeMonths) {
      const depreciable = Math.max(0, cost - item.salvageValue);
      const perMonth = depreciable / item.usefulLifeMonths;
      const start = item.inServiceDate || item.purchaseDate || item.createdAt;
      const monthsUsed = Math.max(0, (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth());
      if (monthsUsed < item.usefulLifeMonths) monthlyDepreciation += perMonth;
      accumulatedDepreciation += Math.min(depreciable, perMonth * monthsUsed);
    }
  }

  const [pendingExpenses, pendingProcurements] = await Promise.all([
    Expense.countDocuments({ ...scope, status: 'submitted' }),
    ProcurementRequest.countDocuments({ ...scope, status: 'submitted' }),
  ]);
  res.json({
    success: true,
    data: {
      totalItems: items.length,
      fixedAssets: items.filter((i) => i.type === 'fixed_asset' && i.status !== 'disposed').length,
      consumables: items.filter((i) => i.type === 'consumable').length,
      acquisitionCost: Math.round(acquisitionCost),
      accumulatedDepreciation: Math.round(accumulatedDepreciation),
      netBookValue: Math.round(acquisitionCost - accumulatedDepreciation),
      monthlyDepreciation: Math.round(monthlyDepreciation),
      lowStock,
      verificationOverdue,
      maintenanceDue,
      pendingExpenses,
      pendingProcurements,
    },
  });
}

export const createExpenseValidators = [
  body('expenseDate').isISO8601(),
  body('category').trim().notEmpty(),
  body('description').trim().notEmpty(),
  body('grossAmount').isFloat({ min: 0.01 }),
];

export async function listExpenses(req: Request, res: Response): Promise<void> {
  const filter = readScope(req);
  if (req.query.status) filter.status = req.query.status;
  if (req.query.category) filter.category = req.query.category;
  const expenses = await Expense.find(filter)
    .populate('branchId', 'name code')
    .populate('vendorId', 'name ntn taxStatus')
    .populate('approvedById', 'name')
    .sort({ expenseDate: -1, createdAt: -1 })
    .limit(Math.min(Number(req.query.limit) || 100, 500))
    .lean();
  res.json({ success: true, data: expenses });
}

export async function createExpense(req: Request, res: Response): Promise<void> {
  if (validationFailed(req, res)) return;
  const branchId = writeBranchId(req);
  if (!branchId) {
    res.status(400).json({ success: false, message: 'A valid branchId is required' });
    return;
  }
  const gross = Number(req.body.grossAmount);
  const deductions = Number(req.body.withholdingTax || 0) + Number(req.body.otherDeductions || 0);
  const expense = await Expense.create({
    ...req.body,
    orgId: orgObjectId(req),
    branchId,
    voucherNo: req.body.voucherNo?.trim() || autoReference('EXP'),
    netPaid: Number(req.body.netPaid ?? Math.max(0, gross - deductions)),
    status: req.body.status === 'submitted' ? 'submitted' : 'draft',
    submittedById: req.body.status === 'submitted' ? req.user!.id : undefined,
    createdById: req.user!.id,
  });
  res.status(201).json({ success: true, data: expense });
}

export const createIncomeValidators = [
  body('receivedAt').isISO8601(),
  body('category').trim().notEmpty(),
  body('description').trim().notEmpty(),
  body('amount').isFloat({ min: 0.01 }),
  body('paymentMethod').isIn(['cash', 'bank_transfer', 'cheque', 'jazzcash', 'easypaisa', 'other']),
];

export async function listIncome(req: Request, res: Response): Promise<void> {
  const filter = readScope(req);
  if (req.query.category) filter.category = req.query.category;
  const records = await IncomeEntry.find(filter)
    .populate('branchId', 'name code')
    .populate('createdById', 'name role')
    .sort({ receivedAt: -1 })
    .limit(Math.min(Number(req.query.limit) || 100, 500))
    .lean();
  res.json({ success: true, data: records });
}

export async function createIncome(req: Request, res: Response): Promise<void> {
  if (validationFailed(req, res)) return;
  const branchId = writeBranchId(req);
  if (!branchId) {
    res.status(400).json({ success: false, message: 'A valid branchId is required' });
    return;
  }
  const record = await IncomeEntry.create({
    ...req.body,
    orgId: orgObjectId(req),
    branchId,
    receiptNo: req.body.receiptNo?.trim() || autoReference('INC'),
    createdById: req.user!.id,
  });
  if (record.status === 'received') {
    void postIncomeReceived(String(record.orgId), String(record.branchId), record.amount, record.paymentMethod, String(record._id), req.user!.id);
  }
  res.status(201).json({ success: true, data: record });
}

export async function updateExpenseStatus(req: Request, res: Response): Promise<void> {
  const expense = await Expense.findOne({ _id: req.params.id, ...readScope(req) });
  if (!expense) {
    res.status(404).json({ success: false, message: 'Expense not found' });
    return;
  }
  const action = String(req.params.action);
  const role = req.user!.role;
  if (['approve', 'reject'].includes(action) && !['group_admin', 'branch_principal'].includes(role)) {
    res.status(403).json({ success: false, message: 'Only Group Admin or Principal can approve or reject expenses' });
    return;
  }
  if (action === 'pay' && !['group_admin', 'accountant'].includes(role)) {
    res.status(403).json({ success: false, message: 'Only Group Admin or Accountant can record payment' });
    return;
  }
  if (action === 'submit' && ['draft', 'rejected'].includes(expense.status)) {
    expense.status = 'submitted';
    expense.submittedById = new Types.ObjectId(req.user!.id);
  } else if (action === 'approve' && expense.status === 'submitted') {
    expense.status = 'approved';
    expense.approvedById = new Types.ObjectId(req.user!.id);
    expense.approvedAt = new Date();
  } else if (action === 'reject' && expense.status === 'submitted') {
    expense.status = 'rejected';
    expense.rejectionReason = req.body.reason || 'Rejected';
  } else if (action === 'pay' && expense.status === 'approved') {
    expense.status = 'paid';
    expense.paidById = new Types.ObjectId(req.user!.id);
    expense.paidAt = new Date();
    expense.paymentMethod = req.body.paymentMethod || expense.paymentMethod || 'bank_transfer';
    expense.paymentReference = req.body.paymentReference || expense.paymentReference;
  } else {
    res.status(409).json({ success: false, message: `Cannot ${action} an expense in ${expense.status} status` });
    return;
  }
  await expense.save();
  if (action === 'pay') {
    void postExpensePayment(String(expense.orgId), String(expense.branchId), expense.category, expense.netPaid, expense.paymentMethod, String(expense._id), req.user!.id);
  }
  res.json({ success: true, data: expense });
}

export async function listVendors(req: Request, res: Response): Promise<void> {
  const vendors = await Vendor.find({ orgId: orgObjectId(req) }).sort({ name: 1 }).lean();
  res.json({ success: true, data: vendors });
}

export async function createVendor(req: Request, res: Response): Promise<void> {
  if (!req.body.name?.trim()) {
    res.status(422).json({ success: false, message: 'Vendor name is required' });
    return;
  }
  const vendor = await Vendor.create({ ...req.body, orgId: orgObjectId(req) });
  res.status(201).json({ success: true, data: vendor });
}

export async function listProcurements(req: Request, res: Response): Promise<void> {
  const filter = readScope(req);
  if (req.query.status) filter.status = req.query.status;
  const records = await ProcurementRequest.find(filter)
    .populate('branchId', 'name code')
    .populate('vendorId', 'name ntn status')
    .populate('requestedById', 'name role')
    .populate('approvedById', 'name')
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(req.query.limit) || 100, 500))
    .lean();
  res.json({ success: true, data: records });
}

export async function createProcurement(req: Request, res: Response): Promise<void> {
  const branchId = writeBranchId(req);
  if (!branchId || !req.body.title?.trim() || !Array.isArray(req.body.items) || req.body.items.length === 0) {
    res.status(422).json({ success: false, message: 'branchId, title, and at least one item are required' });
    return;
  }
  const estimatedTotal = req.body.items.reduce(
    (sum: number, item: { quantity?: number; estimatedUnitCost?: number }) => sum + Number(item.quantity || 0) * Number(item.estimatedUnitCost || 0), 0
  );
  const record = await ProcurementRequest.create({
    ...req.body,
    orgId: orgObjectId(req),
    branchId,
    requestNo: req.body.requestNo?.trim() || autoReference('PR'),
    purpose: req.body.purpose || req.body.title,
    estimatedTotal,
    requestedById: req.user!.id,
  });
  res.status(201).json({ success: true, data: record });
}

export async function updateProcurementStatus(req: Request, res: Response): Promise<void> {
  const record = await ProcurementRequest.findOne({ _id: req.params.id, ...readScope(req) });
  if (!record) {
    res.status(404).json({ success: false, message: 'Procurement request not found' });
    return;
  }
  const action = String(req.params.action);
  if (['approve', 'reject'].includes(action) && !['group_admin', 'branch_principal'].includes(req.user!.role)) {
    res.status(403).json({ success: false, message: 'Only Group Admin or Principal can approve or reject procurement' });
    return;
  }
  if (action === 'approve' && record.status === 'submitted') {
    record.status = 'approved';
    record.approvedById = new Types.ObjectId(req.user!.id);
    record.approvedAt = new Date();
  } else if (action === 'reject' && record.status === 'submitted') {
    record.status = 'rejected';
    record.rejectionReason = req.body.reason || 'Rejected';
  } else if (action === 'submit' && record.status === 'draft') {
    record.status = 'submitted';
  } else {
    res.status(409).json({ success: false, message: `Cannot ${action} a request in ${record.status} status` });
    return;
  }
  await record.save();
  res.json({ success: true, data: record });
}

async function calculateDepreciation(scope: Record<string, unknown>, end: Date): Promise<number> {
  const assets = await InventoryItem.find({ ...scope, type: 'fixed_asset', status: { $ne: 'disposed' } }).lean();
  let total = 0;
  for (const asset of assets) {
    if (asset.depreciationMethod !== 'straight_line' || !asset.usefulLifeMonths) continue;
    const start = asset.inServiceDate || asset.purchaseDate || asset.createdAt;
    if (start >= end) continue;
    const monthsUsed = Math.max(0, (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth());
    if (monthsUsed < asset.usefulLifeMonths) {
      total += Math.max(0, asset.unitCost * asset.quantity - asset.salvageValue) / asset.usefulLifeMonths;
    }
  }
  return total;
}

export async function getFinanceSummary(req: Request, res: Response): Promise<void> {
  const scope = readScope(req);
  const { start, end, month } = reportPeriod(req);
  const includeBenchmarks = req.query.includeBenchmarks !== 'false';
  const now = new Date();
  const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(now.getDate() - 30);
  const sixtyDaysAgo = new Date(now); sixtyDaysAgo.setDate(now.getDate() - 60);
  const [revenueAgg, otherIncomeAgg, expenseAgg, payrollAgg, depreciation, receivableAgg, feeBillingAgg, receivableAgeAgg, branches] = await Promise.all([
    Challan.aggregate([
      { $match: scope }, { $unwind: '$payments' },
      { $match: { 'payments.paidAt': { $gte: start, $lt: end } } },
      { $group: { _id: null, total: { $sum: '$payments.amount' } } },
    ]),
    IncomeEntry.aggregate([
      { $match: { ...scope, status: 'received', receivedAt: { $gte: start, $lt: end } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Expense.aggregate([
      { $match: { ...scope, status: 'paid', paidAt: { $gte: start, $lt: end } } },
      { $group: { _id: null, total: { $sum: '$netPaid' } } },
    ]),
    Payroll.aggregate([
      { $match: { ...scope, status: 'paid', paidAt: { $gte: start, $lt: end } } },
      { $group: { _id: null, total: { $sum: '$netPay' } } },
    ]),
    calculateDepreciation(scope, end),
    Challan.aggregate([
      { $match: { ...scope, status: { $in: ['unpaid', 'partial', 'overdue'] } } },
      { $group: { _id: null, outstanding: { $sum: { $subtract: ['$netAmount', '$paidAmount'] } } } },
    ]),
    Challan.aggregate([
      { $match: { ...scope, month } },
      { $group: { _id: null, billed: { $sum: '$netAmount' }, collected: { $sum: '$paidAmount' } } },
    ]),
    Challan.aggregate([
      { $match: { ...scope, status: { $in: ['unpaid', 'partial', 'overdue'] } } },
      { $project: {
        outstanding: { $subtract: ['$netAmount', '$paidAmount'] },
        bucket: { $switch: { branches: [
          { case: { $lt: ['$dueDate', sixtyDaysAgo] }, then: 'over60' },
          { case: { $lt: ['$dueDate', thirtyDaysAgo] }, then: 'days31to60' },
        ], default: 'current' } },
      } },
      { $group: { _id: '$bucket', amount: { $sum: '$outstanding' }, accounts: { $sum: 1 } } },
    ]),
    includeBenchmarks && ['group_admin', 'branch_principal'].includes(req.user!.role)
      ? Branch.find({ orgId: orgObjectId(req), status: 'active' }).select('name code').lean()
      : Promise.resolve([]),
  ]);

  const feeRevenue = Number(revenueAgg[0]?.total || 0);
  const otherIncome = Number(otherIncomeAgg[0]?.total || 0);
  const operatingExpenses = Number(expenseAgg[0]?.total || 0);
  const payroll = Number(payrollAgg[0]?.total || 0);
  const result = calculateOperatingResult({ feeRevenue, otherIncome, operatingExpenses, payroll, depreciation });

  let allBranchPerformance: Array<{
    branchId: Types.ObjectId; name: string; code: string; revenue: number; cashExpenses: number;
    cashSurplus: number; depreciation: number; operatingSurplus: number; operatingMargin: number; outstandingFees: number;
  }> = [];
  if (branches.length) {
    allBranchPerformance = await Promise.all(branches.map(async (branch) => {
      const branchScope = { orgId: orgObjectId(req), branchId: branch._id };
      const [r, oi, e, p, d, outstanding] = await Promise.all([
        Challan.aggregate([{ $match: branchScope }, { $unwind: '$payments' }, { $match: { 'payments.paidAt': { $gte: start, $lt: end } } }, { $group: { _id: null, total: { $sum: '$payments.amount' } } }]),
        IncomeEntry.aggregate([{ $match: { ...branchScope, status: 'received', receivedAt: { $gte: start, $lt: end } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
        Expense.aggregate([{ $match: { ...branchScope, status: 'paid', paidAt: { $gte: start, $lt: end } } }, { $group: { _id: null, total: { $sum: '$netPaid' } } }]),
        Payroll.aggregate([{ $match: { ...branchScope, status: 'paid', paidAt: { $gte: start, $lt: end } } }, { $group: { _id: null, total: { $sum: '$netPay' } } }]),
        calculateDepreciation(branchScope, end),
        Challan.aggregate([{ $match: { ...branchScope, status: { $in: ['unpaid', 'partial', 'overdue'] } } }, { $group: { _id: null, total: { $sum: { $subtract: ['$netAmount', '$paidAmount'] } } } }]),
      ]);
      const branchResult = calculateOperatingResult({
        feeRevenue: Number(r[0]?.total || 0), otherIncome: Number(oi[0]?.total || 0),
        operatingExpenses: Number(e[0]?.total || 0), payroll: Number(p[0]?.total || 0), depreciation: d,
      });
      return {
        branchId: branch._id, name: branch.name, code: branch.code,
        revenue: Math.round(branchResult.totalRevenue),
        cashExpenses: Math.round(Number(e[0]?.total || 0) + Number(p[0]?.total || 0)),
        cashSurplus: Math.round(branchResult.cashSurplus), depreciation: Math.round(d),
        operatingSurplus: Math.round(branchResult.operatingSurplus),
        operatingMargin: Number(branchResult.operatingMargin.toFixed(1)),
        outstandingFees: Math.round(Number(outstanding[0]?.total || 0)),
      };
    }));
  }

  const sortedBranches = [...allBranchPerformance].sort((a, b) => b.operatingMargin - a.operatingMargin);
  const currentBranchIndex = sortedBranches.findIndex((branch) => String(branch.branchId) === String(req.user!.branchId || ''));
  const peerBenchmark = req.user!.role === 'branch_principal' && currentBranchIndex >= 0 ? {
    rank: currentBranchIndex + 1,
    branchCount: sortedBranches.length,
    groupAverageMargin: sortedBranches.length
      ? Number((sortedBranches.reduce((sum, branch) => sum + branch.operatingMargin, 0) / sortedBranches.length).toFixed(1))
      : 0,
    branchMargin: sortedBranches[currentBranchIndex].operatingMargin,
  } : null;
  const ageing = Object.fromEntries(receivableAgeAgg.map((row) => [row._id, { amount: Math.round(row.amount), accounts: row.accounts }]));
  const billed = Number(feeBillingAgg[0]?.billed || 0);
  const collected = Number(feeBillingAgg[0]?.collected || 0);

  res.json({
    success: true,
    data: {
      month,
      currency: 'PKR',
      feeRevenue: Math.round(feeRevenue),
      otherIncome: Math.round(otherIncome),
      totalRevenue: Math.round(result.totalRevenue),
      operatingExpenses: Math.round(operatingExpenses),
      payroll: Math.round(payroll),
      depreciation: Math.round(depreciation),
      cashSurplus: Math.round(result.cashSurplus),
      operatingSurplus: Math.round(result.operatingSurplus),
      operatingMargin: Number(result.operatingMargin.toFixed(1)),
      outstandingFees: Math.round(Number(receivableAgg[0]?.outstanding || 0)),
      feeRecoveryRate: billed > 0 ? Number(((collected / billed) * 100).toFixed(1)) : 0,
      feeBilled: Math.round(billed),
      feeCollected: Math.round(collected),
      receivableAgeing: {
        current: ageing.current || { amount: 0, accounts: 0 },
        days31to60: ageing.days31to60 || { amount: 0, accounts: 0 },
        over60: ageing.over60 || { amount: 0, accounts: 0 },
      },
      terminology: 'For nonprofit/public institutions, read profit as operating surplus (or deficit).',
      dataAsOf: now.toISOString(),
      branchPerformance: includeBenchmarks && req.user!.role === 'group_admin' ? allBranchPerformance : [],
      peerBenchmark,
    },
  });
}
