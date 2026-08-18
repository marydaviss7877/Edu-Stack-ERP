import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { body, validationResult } from 'express-validator';
import { DiscountPolicy } from '../models/DiscountPolicy';
import { Challan } from '../models/Challan';
import { Student } from '../models/Student';
import { AppError } from '../utils/errorHandler';
import { orgBranchScope } from '../utils/orgBranchScope';
import { computeSiblingRanks, computeDiscounts, SiblingRankInput } from '../services/discountEngine';

export const discountPolicyValidators = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('type').isIn(['sibling', 'label']).withMessage('type must be sibling or label'),
  body('valueType').isIn(['percent', 'fixed']).withMessage('valueType must be percent or fixed'),
  body('value').isFloat({ min: 0 }).withMessage('value must be a positive number'),
  body('labelId').if(body('type').equals('label')).isMongoId().withMessage('labelId is required for label-based policies'),
  body('siblingMinRank').if(body('type').equals('sibling')).isInt({ min: 2 }).withMessage('siblingMinRank must be >= 2'),
  body('classIds').optional().isArray(),
];

export async function listDiscountPolicies(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const scope = orgBranchScope({ orgId: req.orgId!, branchId: req.user!.branchId });
    const policies = await DiscountPolicy.find(scope)
      .populate('labelId', 'name colorHex')
      .populate('classIds', 'name')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data: policies });
  } catch (err) { next(err); }
}

export async function createDiscountPolicy(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(422).json({ success: false, errors: errors.array() }); return; }

    const { name, description, type, labelId, siblingMinRank, valueType, value, classIds } = req.body;
    const policy = await DiscountPolicy.create({
      orgId: req.orgId,
      branchId: req.user!.branchId,
      name, description, type,
      labelId: type === 'label' ? labelId : undefined,
      siblingMinRank: type === 'sibling' ? siblingMinRank : undefined,
      valueType, value,
      classIds: classIds ?? [],
    });
    res.status(201).json({ success: true, data: policy });
  } catch (err) { next(err); }
}

export async function updateDiscountPolicy(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const allowed = ['name', 'description', 'type', 'labelId', 'siblingMinRank', 'valueType', 'value', 'classIds', 'isActive'];
    const update: Record<string, unknown> = {};
    for (const k of allowed) if (req.body[k] !== undefined) update[k] = req.body[k];

    const policy = await DiscountPolicy.findOneAndUpdate(
      { _id: req.params['id'], orgId: req.orgId },
      update,
      { new: true, runValidators: true }
    );
    if (!policy) throw new AppError('Discount policy not found', 404);
    res.json({ success: true, data: policy });
  } catch (err) { next(err); }
}

export async function deleteDiscountPolicy(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const policy = await DiscountPolicy.findOneAndDelete({ _id: req.params['id'], orgId: req.orgId });
    if (!policy) throw new AppError('Discount policy not found', 404);
    res.json({ success: true, message: 'Discount policy deleted' });
  } catch (err) { next(err); }
}

/** Recomputes policy-based discounts for a month's still-outstanding challans (unpaid/partial/overdue). */
export async function applyDiscountPolicies(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { month, classId } = req.body;
    if (!month) throw new AppError('month is required (YYYY-MM)', 400);

    const orgId = req.orgId!;
    const branchId = req.user!.branchId;
    const scope = orgBranchScope({ orgId, branchId });

    const challanFilter: Record<string, unknown> = { ...scope, month, status: { $in: ['unpaid', 'partial', 'overdue'] } };
    if (classId) challanFilter['classId'] = classId;

    const [challans, policies, allActiveStudents] = await Promise.all([
      Challan.find(challanFilter).lean(),
      DiscountPolicy.find({ ...scope, isActive: true }).lean(),
      Student.find({ ...scope, status: 'active' })
        .select('guardianInfo.fatherCnic guardianInfo.fatherPhone admissionDate')
        .lean(),
    ]);

    if (challans.length === 0) { res.json({ success: true, data: { updated: 0, totalDiscountApplied: 0 } }); return; }

    const studentIds = challans.map(c => c.studentId);
    const students = await Student.find({ _id: { $in: studentIds } }).lean();
    const studentMap = new Map(students.map(s => [s._id.toString(), s]));

    const siblingInputs: SiblingRankInput[] = allActiveStudents.map(s => ({
      _id: s._id,
      fatherCnic: s.guardianInfo?.fatherCnic,
      fatherPhone: s.guardianInfo?.fatherPhone,
      admissionDate: s.admissionDate,
    }));
    const siblingRanks = computeSiblingRanks(siblingInputs);

    let updated = 0;
    let totalDiscountApplied = 0;
    const bulkOps = [];

    for (const challan of challans) {
      const student = studentMap.get(challan.studentId.toString());
      if (!student) continue;

      const { total: policyDiscount, breakdown } = computeDiscounts({
        totalAmount: challan.totalAmount,
        classId: challan.classId as unknown as Types.ObjectId,
        labelIds: student.labelIds ?? [],
        siblingRank: siblingRanks.get(student._id.toString()),
        policies,
      });

      if (policyDiscount === challan.policyDiscount) continue;

      const netAmount = Math.max(0, challan.totalAmount - challan.discount - challan.waiver - policyDiscount);
      const status = challan.paidAmount >= netAmount ? 'paid' : challan.paidAmount > 0 ? 'partial' : challan.status;

      bulkOps.push({
        updateOne: {
          filter: { _id: challan._id },
          update: { $set: { policyDiscount, appliedDiscounts: breakdown, netAmount, status } },
        },
      });
      updated++;
      totalDiscountApplied += policyDiscount;
    }

    if (bulkOps.length > 0) await Challan.bulkWrite(bulkOps);

    res.json({ success: true, data: { updated, totalDiscountApplied } });
  } catch (err) { next(err); }
}
