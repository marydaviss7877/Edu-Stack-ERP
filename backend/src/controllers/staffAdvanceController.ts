import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { body, validationResult } from 'express-validator';
import { StaffAdvance } from '../models/StaffAdvance';
import { orgBranchScope } from '../utils/orgBranchScope';
import { postAdvanceDisbursement } from '../services/ledgerService';

export const createAdvanceValidators = [
  body('staffId').isMongoId(),
  body('type').isIn(['advance', 'loan']),
  body('amount').isFloat({ min: 1 }),
  body('reason').trim().notEmpty(),
  body('installmentsTotal').optional().isInt({ min: 1 }),
];

export async function listAdvances(req: Request, res: Response): Promise<void> {
  const { orgId, branchId, role, id: userId } = req.user!;
  const filter: Record<string, unknown> = orgBranchScope({ orgId: orgId!, branchId });
  if (req.query.status) filter.status = req.query.status;
  if (req.query.staffId) filter.staffId = req.query.staffId;
  if (role === 'teacher') filter.staffId = userId;

  const records = await StaffAdvance.find(filter)
    .populate('staffId', 'name email role')
    .populate('approvedById', 'name')
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();
  res.json({ success: true, data: records });
}

export async function createAdvance(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(422).json({ success: false, errors: errors.array() }); return; }

  const { orgId, branchId } = req.user!;
  const { staffId, type, amount, reason, installmentsTotal } = req.body;
  const installments = Math.max(1, Number(installmentsTotal || (type === 'loan' ? 6 : 1)));

  const record = await StaffAdvance.create({
    orgId, branchId, staffId, type, amount, reason,
    installmentsTotal: installments,
    installmentAmount: Math.ceil(Number(amount) / installments),
    balanceRemaining: Number(amount),
    status: 'pending',
    createdById: req.user!.id,
  });
  res.status(201).json({ success: true, data: record });
}

export async function updateAdvanceStatus(req: Request, res: Response): Promise<void> {
  const { orgId, branchId } = req.user!;
  const record = await StaffAdvance.findOne({ _id: req.params.id, orgId, branchId });
  if (!record) { res.status(404).json({ success: false, message: 'Advance/loan record not found' }); return; }

  const action = String(req.params.action);
  if (action === 'approve' && record.status === 'pending') {
    record.status = 'approved';
    record.approvedById = new Types.ObjectId(req.user!.id);
    record.approvedAt = new Date();
  } else if (action === 'reject' && record.status === 'pending') {
    record.status = 'rejected';
    record.rejectionReason = req.body.reason || 'Rejected';
  } else if (action === 'disburse' && record.status === 'approved') {
    record.status = 'active';
    record.disbursedAt = new Date();
    record.disbursedMethod = req.body.method || 'cash';
    void postAdvanceDisbursement(String(record.orgId), String(record.branchId), record.amount, record.disbursedMethod, String(record._id), req.user!.id);
  } else {
    res.status(409).json({ success: false, message: `Cannot ${action} a record in ${record.status} status` });
    return;
  }
  await record.save();
  res.json({ success: true, data: record });
}

/** Used by payrollController to auto-add a repayment deduction line when generating a payslip. */
export async function getActiveAdvanceForStaff(orgId: string, branchId: string, staffId: string) {
  return StaffAdvance.findOne({ orgId, branchId, staffId, status: 'active', balanceRemaining: { $gt: 0 } }).sort({ createdAt: 1 });
}

/** Called after a payroll record with an advance-repayment deduction is marked paid. */
export async function applyInstallmentPayment(advanceId: string, amount: number): Promise<void> {
  const record = await StaffAdvance.findById(advanceId);
  if (!record) return;
  record.balanceRemaining = Math.max(0, record.balanceRemaining - amount);
  record.installmentsPaid += 1;
  if (record.balanceRemaining <= 0) record.status = 'closed';
  await record.save();
}
