import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { randomBytes } from 'crypto';
import { body, validationResult } from 'express-validator';
import { FeeStructure } from '../models/FeeStructure';
import { Challan } from '../models/Challan';
import { Student } from '../models/Student';
import { AppError } from '../utils/errorHandler';
import { orgBranchScope } from '../utils/orgBranchScope';
import {
  loadTenantGateway,
  initiateJazzCash,
  initiateEasypaisa,
  JazzCashCreds,
  EasypaisaCreds,
} from '../services/paymentGatewayService';
import { postFeePayment } from '../services/ledgerService';

export const createFeeStructureValidators = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('classId').isMongoId(),
  body('academicYearId').isMongoId(),
  body('items').isArray({ min: 1 }).withMessage('At least one fee item is required'),
  body('items.*.name').trim().notEmpty(),
  body('items.*.amount').isFloat({ min: 0 }),
  body('dueDay').optional().isInt({ min: 1, max: 28 }),
];

export const recordPaymentValidators = [
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be positive'),
  body('method').isIn(['cash', 'bank_transfer', 'jazzcash', 'easypaisa', 'cheque']),
  body('transactionRef').optional().trim(),
];

// ─── Fee Structures ────────────────────────────────────────────────────────

export async function listFeeStructures(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { classId, academicYearId } = req.query;
    const filter: Record<string, unknown> = { orgId: req.orgId, branchId: req.user!.branchId };
    if (classId) filter['classId'] = classId;
    if (academicYearId) filter['academicYearId'] = academicYearId;

    const structures = await FeeStructure.find(filter)
      .populate('classId', 'name level')
      .populate('academicYearId', 'label')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: structures });
  } catch (err) { next(err); }
}

export async function createFeeStructure(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(422).json({ success: false, errors: errors.array() }); return; }

    const { classId, academicYearId, name, items, dueDay } = req.body;
    const totalAmount = (items as { amount: number }[]).reduce((sum, i) => sum + i.amount, 0);

    const structure = await FeeStructure.create({
      orgId: req.orgId,
      branchId: req.user!.branchId,
      classId,
      academicYearId,
      name,
      items,
      totalAmount,
      dueDay: dueDay ?? 10,
    });

    res.status(201).json({ success: true, data: structure });
  } catch (err) { next(err); }
}

export async function updateFeeStructure(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { items, name, dueDay } = req.body;
    const totalAmount = items ? (items as { amount: number }[]).reduce((sum, i) => sum + i.amount, 0) : undefined;

    const structure = await FeeStructure.findOneAndUpdate(
      { _id: req.params['id'], orgId: req.orgId },
      { name, items, dueDay, ...(totalAmount != null ? { totalAmount } : {}) },
      { new: true }
    );

    if (!structure) throw new AppError('Fee structure not found', 404);
    res.json({ success: true, data: structure });
  } catch (err) { next(err); }
}

export async function deleteFeeStructure(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const structure = await FeeStructure.findOneAndUpdate(
      { _id: req.params['id'], orgId: req.orgId },
      { isActive: false },
      { new: true }
    );
    if (!structure) throw new AppError('Fee structure not found', 404);
    res.json({ success: true, message: 'Fee structure deactivated' });
  } catch (err) { next(err); }
}

// ─── Challans ──────────────────────────────────────────────────────────────

export async function listChallans(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { month, studentId, status, page = '1', limit = '50' } = req.query;
    const filter: Record<string, unknown> = {
      orgId: req.orgId,
      branchId: req.user!.role === 'student' ? req.user!.branchId : (req.user!.branchId),
    };
    if (month) filter['month'] = month;
    if (studentId) filter['studentId'] = studentId;
    if (status) filter['status'] = status;

    // Students can only see their own challans
    if (req.user!.role === 'student') {
      const student = await Student.findOne({ orgId: req.orgId, userId: req.user!.id }).select('_id').lean();
      if (student) filter['studentId'] = student._id;
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const [challans, total] = await Promise.all([
      Challan.find(filter)
        .populate('studentId', 'rollNo profile.name')
        .populate('classId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit as string))
        .lean(),
      Challan.countDocuments(filter),
    ]);

    res.json({ success: true, data: challans, meta: { total, page: parseInt(page as string), limit: parseInt(limit as string) } });
  } catch (err) { next(err); }
}

export async function getChallan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const challan = await Challan.findOne({ _id: req.params['id'], orgId: req.orgId })
      .populate('studentId', 'rollNo profile admissionNo')
      .populate('classId', 'name level')
      .lean();
    if (!challan) throw new AppError('Challan not found', 404);
    res.json({ success: true, data: challan });
  } catch (err) { next(err); }
}

export async function generateChallans(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { month, classId } = req.body;
    if (!month) throw new AppError('month is required (YYYY-MM)', 400);

    const { dispatchChallanJob } = await import('../jobs');
    await dispatchChallanJob({
      orgId: req.orgId,
      branchId: req.user!.branchId,
      month,
      classId,
    });

    res.status(202).json({ success: true, message: 'Challan generation queued. Check back in a moment.' });
  } catch (err) { next(err); }
}

export async function recordPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(422).json({ success: false, errors: errors.array() }); return; }

    const { amount, method, transactionRef } = req.body;
    const challan = await Challan.findOne({ _id: req.params['id'], orgId: req.orgId });
    if (!challan) throw new AppError('Challan not found', 404);
    if (challan.status === 'paid' || challan.status === 'waived') {
      throw new AppError('Challan is already settled', 400);
    }

    const receiptNo = `RCP-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`;
    challan.payments.push({
      amount,
      method,
      transactionRef,
      collectedById: new Types.ObjectId(req.user!.id),
      paidAt: new Date(),
      receiptNo,
    });
    challan.paidAmount = challan.payments.reduce((sum, p) => sum + p.amount, 0);

    if (challan.paidAmount >= challan.netAmount) {
      challan.status = 'paid';
    } else if (challan.paidAmount > 0) {
      challan.status = 'partial';
    }

    await challan.save();
    void postFeePayment(req.orgId!, String(challan.branchId), amount, method, String(challan._id), req.user!.id);
    res.json({ success: true, data: challan, meta: { receiptNo } });
  } catch (err) { next(err); }
}

export async function applyWaiver(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { discount, waiver, reason } = req.body;
    const challan = await Challan.findOne({ _id: req.params['id'], orgId: req.orgId });
    if (!challan) throw new AppError('Challan not found', 404);

    if (discount != null) challan.discount = discount;
    if (waiver != null) challan.waiver = waiver;
    challan.netAmount = Math.max(0, challan.totalAmount - challan.discount - challan.waiver - (challan.policyDiscount || 0));

    if (challan.waiver >= challan.totalAmount) {
      challan.status = 'waived';
    } else if (challan.paidAmount >= challan.netAmount) {
      challan.status = 'paid';
    }

    if (reason) {
      challan.set('waiverReason', reason);
    }

    await challan.save();
    res.json({ success: true, data: challan });
  } catch (err) { next(err); }
}

// ─── Online Payments ───────────────────────────────────────────────────────

export const initiateOnlinePaymentValidators = [
  body('mobileNumber').trim().matches(/^03\d{9}$/).withMessage('Mobile number must be 11-digit Pakistani format (03xxxxxxxxx)'),
  body('gateway').isIn(['jazzcash', 'easypaisa']).withMessage('Invalid gateway'),
  body('cnic').optional().trim(),
];

export async function initiateOnlinePayment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(422).json({ success: false, errors: errors.array() }); return; }

    const { mobileNumber, gateway, cnic } = req.body;
    const challan = await Challan.findOne({ _id: req.params['id'], orgId: req.orgId }).lean();
    if (!challan) throw new AppError('Challan not found', 404);
    if (challan.status === 'paid' || challan.status === 'waived') {
      throw new AppError('Challan is already settled', 400);
    }

    const amount = challan.netAmount - challan.paidAmount;
    if (amount <= 0) throw new AppError('No outstanding balance', 400);

    if (gateway === 'jazzcash') {
      const creds = await loadTenantGateway(req.orgId!, 'jazzcash');
      if (!creds) throw new AppError('JazzCash is not configured for your organization', 503);
      const result = await initiateJazzCash(
        { amount, mobileNumber, cnic, challanNo: challan.challanNo, description: `EduStack fee payment — ${challan.challanNo}` },
        creds as JazzCashCreds
      );
      res.json({ success: result.success, data: { txnRefNo: result.txnRefNo, responseCode: result.responseCode, responseDesc: result.responseDesc } });
    } else {
      const creds = await loadTenantGateway(req.orgId!, 'easypaisa');
      if (!creds) throw new AppError('EasyPaisa is not configured for your organization', 503);
      const result = await initiateEasypaisa(
        { amount, mobileNumber, challanNo: challan.challanNo, description: `EduStack fee payment — ${challan.challanNo}` },
        creds as EasypaisaCreds
      );
      res.json({ success: result.success, data: { txnRefNo: result.txnRefNo, responseCode: result.responseCode, responseDesc: result.responseDesc } });
    }
  } catch (err) { next(err); }
}

export async function getFeeSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { month } = req.query;
    // aggregate() does NOT auto-cast strings to ObjectIds — must cast explicitly
    const match: Record<string, unknown> = { orgId: new Types.ObjectId(req.orgId!) };
    if (req.user!.branchId) match['branchId'] = new Types.ObjectId(req.user!.branchId);
    if (month) match['month'] = month;

    const summary = await Challan.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalNet: { $sum: '$netAmount' },
          totalPaid: { $sum: '$paidAmount' },
        },
      },
    ]);

    res.json({ success: true, data: summary });
  } catch (err) { next(err); }
}

// ─── Defaulters ────────────────────────────────────────────────────────────

interface DefaulterStudent { rollNo?: string; admissionNo?: string; profile?: { name?: string }; guardianInfo?: { fatherName?: string; fatherPhone?: string } }
interface DefaulterClass { name?: string }

async function fetchDefaulterChallans(req: Request): Promise<Record<string, unknown>[]> {
  const { classId, minDaysOverdue } = req.query;
  const scope = orgBranchScope({ orgId: req.orgId!, branchId: req.user!.branchId });
  const filter: Record<string, unknown> = { ...scope, status: { $in: ['unpaid', 'partial', 'overdue'] } };
  if (classId) filter['classId'] = classId;

  const challans = await Challan.find(filter)
    .populate<{ studentId: DefaulterStudent }>('studentId', 'rollNo admissionNo profile.name guardianInfo.fatherName guardianInfo.fatherPhone')
    .populate<{ classId: DefaulterClass }>('classId', 'name')
    .sort({ dueDate: 1 })
    .lean();

  const now = Date.now();
  const rows = challans
    .map((c) => ({
      ...c,
      balance: c.netAmount - c.paidAmount,
      daysOverdue: Math.max(0, Math.floor((now - new Date(c.dueDate).getTime()) / 86_400_000)),
    }))
    .filter((r) => !minDaysOverdue || r.daysOverdue >= Number(minDaysOverdue))
    .sort((a, b) => b.daysOverdue - a.daysOverdue);

  return rows;
}

export async function getDefaulters(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rows = await fetchDefaulterChallans(req);
    const totalOutstanding = rows.reduce((sum, r) => sum + (r['balance'] as number), 0);
    res.json({ success: true, data: rows, meta: { total: rows.length, totalOutstanding } });
  } catch (err) { next(err); }
}

function csvEscape(value: unknown): string {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function exportDefaultersCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rows = await fetchDefaulterChallans(req);

    const headers = ['Challan No', 'Roll No', 'Admission No', 'Student Name', 'Class', "Father's Name", "Father's Phone", 'Month', 'Due Date', 'Days Overdue', 'Total Amount', 'Paid Amount', 'Balance', 'Status'];
    const lines = [
      headers.join(','),
      ...rows.map((r) => {
        const student = r['studentId'] as DefaulterStudent | undefined;
        const cls = r['classId'] as DefaulterClass | undefined;
        return [
          r['challanNo'],
          student?.rollNo ?? '',
          student?.admissionNo ?? '',
          student?.profile?.name ?? '',
          cls?.name ?? '',
          student?.guardianInfo?.fatherName ?? '',
          student?.guardianInfo?.fatherPhone ?? '',
          r['month'],
          new Date(r['dueDate'] as string).toISOString().slice(0, 10),
          r['daysOverdue'],
          r['totalAmount'],
          r['paidAmount'],
          r['balance'],
          r['status'],
        ].map(csvEscape).join(',');
      }),
    ];
    const csv = `﻿${lines.join('\r\n')}`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="fee-defaulters-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  } catch (err) { next(err); }
}

export async function remindDefaulters(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { dispatchFeeReminderJob } = await import('../jobs');
    await dispatchFeeReminderJob({ orgId: req.orgId, branchId: req.user!.branchId });
    res.status(202).json({ success: true, message: 'Reminder sweep queued. Students with due/overdue challans will be notified shortly.' });
  } catch (err) { next(err); }
}
