import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { Types } from 'mongoose';
import { Branch } from '../models/Branch';
import { Student } from '../models/Student';
import { Challan } from '../models/Challan';
import { User } from '../models/User';

export const createBranchValidators = [
  body('name').trim().notEmpty(),
  body('city').trim().notEmpty(),
  body('code').optional().trim(),
  body('address').optional().trim(),
];

function autoCode(name: string): string {
  const initials = name.trim().split(/\s+/).map(w => w[0]?.toUpperCase() ?? '').join('');
  const suffix = Date.now().toString(36).slice(-3).toUpperCase();
  return `${initials}${suffix}`;
}

export async function createBranch(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ success: false, errors: errors.array() });
    return;
  }

  const orgId = req.user!.orgId || req.body.orgId;
  if (!orgId) {
    res.status(400).json({ success: false, message: 'orgId is required' });
    return;
  }

  const code = req.body.code?.trim() || autoCode(req.body.name);
  const address = req.body.address?.trim() || '-';

  const existing = await Branch.findOne({ orgId, code });
  if (existing) {
    res.status(409).json({ success: false, message: 'Branch code already exists in this organization' });
    return;
  }

  const branch = await Branch.create({ ...req.body, code, address, orgId });
  res.status(201).json({ success: true, data: branch });
}

export async function listBranches(req: Request, res: Response): Promise<void> {
  const orgId = req.user!.orgId || req.params.orgId;
  const branches = await Branch.find({ orgId }).sort({ name: 1 }).lean();
  res.json({ success: true, data: branches });
}

export async function getBranch(req: Request, res: Response): Promise<void> {
  const orgId = req.user!.orgId;
  const branch = await Branch.findOne({ _id: req.params.id, orgId });
  if (!branch) {
    res.status(404).json({ success: false, message: 'Branch not found' });
    return;
  }
  res.json({ success: true, data: branch });
}

export async function updateBranch(req: Request, res: Response): Promise<void> {
  const orgId = req.user!.orgId;
  const allowed = ['name', 'address', 'city', 'phone', 'email', 'principalName', 'status', 'settings', 'logoUrl'];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) update[key] = req.body[key];
  }

  const branch = await Branch.findOneAndUpdate({ _id: req.params.id, orgId }, update, { new: true, runValidators: true });
  if (!branch) {
    res.status(404).json({ success: false, message: 'Branch not found' });
    return;
  }
  res.json({ success: true, data: branch });
}

export async function deleteBranch(req: Request, res: Response): Promise<void> {
  const orgId = req.user!.orgId;
  const branch = await Branch.findOneAndUpdate(
    { _id: req.params.id, orgId },
    { status: 'inactive' },
    { new: true }
  );
  if (!branch) {
    res.status(404).json({ success: false, message: 'Branch not found' });
    return;
  }
  res.json({ success: true, message: 'Branch deactivated' });
}

export async function getBranchStats(req: Request, res: Response): Promise<void> {
  const orgId = new Types.ObjectId(req.user!.orgId!);
  const month = (req.query.month as string) ||
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  const [branches, studentAgg, feeAgg, staffAgg] = await Promise.all([
    Branch.find({ orgId: req.user!.orgId }).sort({ name: 1 }).lean(),

    Student.aggregate([
      { $match: { orgId, status: 'active' } },
      { $group: { _id: '$branchId', count: { $sum: 1 } } },
    ]),

    Challan.aggregate([
      { $match: { orgId, month } },
      { $group: { _id: { branchId: '$branchId', status: '$status' }, totalPaid: { $sum: '$paidAmount' }, totalNet: { $sum: '$netAmount' } } },
    ]),

    User.aggregate([
      { $match: { orgId, active: true, role: { $in: ['branch_principal', 'teacher', 'coordinator', 'accountant', 'it_admin'] } } },
      { $group: { _id: '$branchId', count: { $sum: 1 } } },
    ]),
  ]);

  const studentMap = new Map<string, number>(
    (studentAgg as { _id: Types.ObjectId; count: number }[]).map(s => [s._id.toString(), s.count])
  );
  const staffMap = new Map<string, number>(
    (staffAgg as { _id: Types.ObjectId | null; count: number }[])
      .filter(s => s._id != null)
      .map(s => [s._id!.toString(), s.count])
  );

  const feeByBranch = new Map<string, { collected: number; pending: number }>();
  for (const f of feeAgg as { _id: { branchId: Types.ObjectId; status: string }; totalPaid: number; totalNet: number }[]) {
    const bid = f._id.branchId?.toString();
    if (!bid) continue;
    if (!feeByBranch.has(bid)) feeByBranch.set(bid, { collected: 0, pending: 0 });
    const entry = feeByBranch.get(bid)!;
    if (f._id.status === 'paid') {
      entry.collected += f.totalPaid;
    } else if (['unpaid', 'partial', 'overdue'].includes(f._id.status)) {
      entry.pending += (f.totalNet - f.totalPaid);
    }
  }

  const data = (branches as (typeof branches[0] & { _id: Types.ObjectId })[]).map(b => {
    const bid = b._id.toString();
    const fees = feeByBranch.get(bid) ?? { collected: 0, pending: 0 };
    return {
      _id: b._id,
      name: b.name,
      code: b.code,
      city: b.city,
      status: b.status,
      principalName: b.principalName,
      studentCount: studentMap.get(bid) ?? 0,
      staffCount: staffMap.get(bid) ?? 0,
      feeCollected: fees.collected,
      feePending: fees.pending,
    };
  });

  res.json({ success: true, data });
}
