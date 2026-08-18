import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { StaffClearance } from '../models/StaffClearance';
import { StaffAdvance } from '../models/StaffAdvance';
import { InventoryItem } from '../models/InventoryItem';
import { orgBranchScope } from '../utils/orgBranchScope';

export async function listClearances(req: Request, res: Response): Promise<void> {
  const { orgId, branchId } = req.user!;
  const filter: Record<string, unknown> = orgBranchScope({ orgId: orgId!, branchId });
  if (req.query.status) filter.status = req.query.status;
  const records = await StaffClearance.find(filter)
    .populate('staffId', 'name email role')
    .populate('initiatedById', 'name')
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();
  res.json({ success: true, data: records });
}

export async function initiateClearance(req: Request, res: Response): Promise<void> {
  const { orgId, branchId } = req.user!;
  const { staffId, reason } = req.body;
  if (!staffId || !reason) { res.status(422).json({ success: false, message: 'staffId and reason are required' }); return; }

  const existing = await StaffClearance.findOne({ orgId, branchId, staffId, status: 'pending' });
  if (existing) { res.status(409).json({ success: false, message: 'A clearance is already in progress for this staff member' }); return; }

  const record = await StaffClearance.create({ orgId, branchId, staffId, reason, initiatedById: req.user!.id });
  res.status(201).json({ success: true, data: record });
}

/** Full clearance picture for a record — outstanding advances/loans and assigned assets, computed live. */
export async function getClearanceStatus(req: Request, res: Response): Promise<void> {
  const { orgId, branchId } = req.user!;
  const record = await StaffClearance.findOne({ _id: req.params.id, orgId, branchId }).populate('staffId', 'name email role').lean();
  if (!record) { res.status(404).json({ success: false, message: 'Clearance record not found' }); return; }

  const [outstandingAdvances, assignedAssets] = await Promise.all([
    StaffAdvance.find({ orgId, branchId, staffId: record.staffId, status: 'active', balanceRemaining: { $gt: 0 } }).lean(),
    InventoryItem.find({ orgId, branchId, custodianId: record.staffId, status: { $ne: 'disposed' } }).select('name assetCode category').lean(),
  ]);

  res.json({
    success: true,
    data: {
      clearance: record,
      outstandingAdvances,
      outstandingAdvanceTotal: outstandingAdvances.reduce((s, a) => s + a.balanceRemaining, 0),
      assignedAssets,
    },
  });
}

export async function updateClearanceChecklist(req: Request, res: Response): Promise<void> {
  const { orgId, branchId } = req.user!;
  const allowed = ['advancesCleared', 'assetsReturned', 'duesSettled', 'notes'];
  const update: Record<string, unknown> = {};
  for (const k of allowed) if (req.body[k] !== undefined) update[k] = req.body[k];

  const record = await StaffClearance.findOneAndUpdate({ _id: req.params.id, orgId, branchId, status: 'pending' }, update, { new: true });
  if (!record) { res.status(404).json({ success: false, message: 'Pending clearance record not found' }); return; }
  res.json({ success: true, data: record });
}

export async function completeClearance(req: Request, res: Response): Promise<void> {
  const { orgId, branchId } = req.user!;
  const record = await StaffClearance.findOne({ _id: req.params.id, orgId, branchId });
  if (!record) { res.status(404).json({ success: false, message: 'Clearance record not found' }); return; }
  if (record.status !== 'pending') { res.status(400).json({ success: false, message: 'Clearance already completed' }); return; }
  if (!record.advancesCleared || !record.assetsReturned || !record.duesSettled) {
    res.status(400).json({ success: false, message: 'All checklist items must be confirmed before completing clearance' });
    return;
  }

  record.status = 'cleared';
  record.clearedAt = new Date();
  record.clearedById = new Types.ObjectId(req.user!.id);
  await record.save();
  res.json({ success: true, data: record });
}
