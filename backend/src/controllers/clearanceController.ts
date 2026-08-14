import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { Types } from 'mongoose';
import { ClearanceExam } from '../models/ClearanceExam';
import { Paper } from '../models/Paper';
import { PaperResult } from '../models/PaperResult';
import { Branch } from '../models/Branch';
import { Student } from '../models/Student';
import { orgBranchScope } from '../utils/orgBranchScope';

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listClearances(req: Request, res: Response): Promise<void> {
  const { orgId, branchId, id: userId, role } = req.user!;
  const { status, month, year, classId, sectionId, studentId, subjectId } = req.query;

  const filter: Record<string, unknown> = orgBranchScope({ orgId, branchId });
  if (status) filter.status = status;
  if (month) filter.triggerMonth = Number(month);
  if (year) filter.triggerYear = Number(year);
  if (classId) filter.classId = classId;
  if (sectionId) filter.sectionId = sectionId;
  if (subjectId) filter.subjectId = subjectId;

  // Students authenticate with a User id, while clearances reference Student ids.
  if (role === 'student') {
    const student = await Student.findOne({
      ...orgBranchScope({ orgId, branchId }),
      userId,
    }).select('_id').lean();
    if (!student) {
      res.json({ success: true, data: [] });
      return;
    }
    filter.studentId = student._id;
  } else if (studentId) filter.studentId = studentId;

  const clearances = await ClearanceExam.find(filter)
    .populate('studentId', 'profile.name rollNo')
    .populate('subjectId', 'name code')
    .populate('classId', 'name level')
    .populate('sectionId', 'name')
    .populate('clearancePaperId', 'scheduledDate totalMarks status')
    .sort({ createdAt: -1 })
    .lean();

  res.json({ success: true, data: clearances });
}

export async function getClearance(req: Request, res: Response): Promise<void> {
  const { orgId } = req.user!;
  const clearance = await ClearanceExam.findOne({ _id: req.params.id, orgId })
    .populate('studentId', 'profile.name rollNo')
    .populate('subjectId', 'name code')
    .populate('clearancePaperId')
    .lean();
  if (!clearance) { res.status(404).json({ success: false, message: 'Clearance not found' }); return; }
  res.json({ success: true, data: clearance });
}

// ─── Approve ──────────────────────────────────────────────────────────────────

export const approveClearanceValidators = [
  body('scheduledDate').isISO8601(),
  body('totalMarks').isInt({ min: 1 }),
  body('academicYearId').isMongoId(),
];

export async function approveClearance(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(422).json({ success: false, errors: errors.array() }); return; }

  const { orgId, branchId, id: approvedById } = req.user!;

  const clearance = await ClearanceExam.findOne({ _id: req.params.id, orgId, status: 'pending_approval' });
  if (!clearance) { res.status(404).json({ success: false, message: 'Clearance not found or already processed' }); return; }

  // Create a clearance-type paper for this student
  const paper = await Paper.create({
    orgId,
    branchId,
    classId: clearance.classId,
    sectionId: clearance.sectionId,
    subjectId: clearance.subjectId,
    teacherId: new Types.ObjectId(approvedById),
    academicYearId: new Types.ObjectId(req.body.academicYearId),
    paperType: 'clearance',
    weekNumber: 0,
    month: clearance.triggerMonth,
    year: clearance.triggerYear,
    totalMarks: req.body.totalMarks,
    scheduledDate: new Date(req.body.scheduledDate),
    status: 'active',
    createdById: new Types.ObjectId(approvedById),
  });

  clearance.status = 'scheduled';
  clearance.approvedById = new Types.ObjectId(approvedById);
  clearance.approvedAt = new Date();
  clearance.scheduledDate = new Date(req.body.scheduledDate);
  clearance.clearancePaperId = paper._id as Types.ObjectId;
  await clearance.save();

  res.json({ success: true, data: clearance });
}

// ─── Waive ────────────────────────────────────────────────────────────────────

export async function waiveClearance(req: Request, res: Response): Promise<void> {
  const { orgId } = req.user!;
  const clearance = await ClearanceExam.findOneAndUpdate(
    { _id: req.params.id, orgId, status: { $in: ['pending_approval', 'scheduled'] } },
    { status: 'waived' },
    { new: true }
  );
  if (!clearance) { res.status(404).json({ success: false, message: 'Clearance not found or already completed' }); return; }
  res.json({ success: true, data: clearance });
}

// ─── Enter clearance marks ────────────────────────────────────────────────────

export const enterClearanceMarksValidators = [
  body('marksObtained').isNumeric().isFloat({ min: 0 }),
];

export async function enterClearanceMarks(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(422).json({ success: false, errors: errors.array() }); return; }

  const { orgId, branchId, id: gradedById } = req.user!;

  const clearance = await ClearanceExam.findOne({ _id: req.params.id, orgId, status: 'scheduled' });
  if (!clearance) { res.status(404).json({ success: false, message: 'Clearance not found or not yet scheduled' }); return; }

  const clearancePaper = await Paper.findOne({ _id: clearance.clearancePaperId, orgId }).lean();
  if (!clearancePaper) { res.status(404).json({ success: false, message: 'Clearance paper not found' }); return; }

  const branch = await Branch.findOne({ _id: branchId, orgId }).lean();
  const clearancePassMark = branch?.academicThresholds?.clearancePassMark ?? 40;

  const marks = Math.min(Number(req.body.marksObtained), clearancePaper.totalMarks);
  const percentage = Math.round((marks / clearancePaper.totalMarks) * 10000) / 100;
  const passed = percentage >= clearancePassMark;

  clearance.clearanceMarksObtained = marks;
  clearance.clearanceTotalMarks = clearancePaper.totalMarks;
  clearance.clearancePercentage = percentage;
  clearance.clearancePassed = passed;
  clearance.status = 'completed';
  clearance.gradedById = new Types.ObjectId(gradedById);
  clearance.gradedAt = new Date();
  await clearance.save();

  // If passed: flip isWeak=false on that student's paper results for this subject/month
  if (passed) {
    const papersThisMonth = await Paper.find({
      orgId,
      branchId,
      subjectId: clearance.subjectId,
      month: clearance.triggerMonth,
      year: clearance.triggerYear,
      paperType: 'weekly',
    }).select('_id').lean();

    const paperIds = papersThisMonth.map((p) => p._id);

    if (paperIds.length) {
      await PaperResult.updateMany(
        { orgId, branchId, studentId: clearance.studentId, paperId: { $in: paperIds }, isWeak: true },
        { $set: { isWeak: false, clearedByClearanceId: clearance._id } }
      );
    }
  }

  res.json({
    success: true,
    data: clearance,
    message: passed ? 'Clearance passed — weak flags cleared' : 'Clearance failed',
  });
}

// ─── Summary stats for principal dashboard ────────────────────────────────────

export async function getClearanceSummary(req: Request, res: Response): Promise<void> {
  const { orgId, branchId } = req.user!;
  const { month, year } = req.query;

  const match: Record<string, unknown> = {
    orgId: new Types.ObjectId(orgId),
    ...(branchId ? { branchId: new Types.ObjectId(branchId) } : {}),
  };
  if (month) match.triggerMonth = Number(month);
  if (year) match.triggerYear = Number(year);

  const [summary] = await ClearanceExam.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        pending_approval: { $sum: { $cond: [{ $eq: ['$status', 'pending_approval'] }, 1, 0] } },
        scheduled: { $sum: { $cond: [{ $eq: ['$status', 'scheduled'] }, 1, 0] } },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        waived: { $sum: { $cond: [{ $eq: ['$status', 'waived'] }, 1, 0] } },
        passed: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ['$status', 'completed'] }, { $eq: ['$clearancePassed', true] }] },
              1,
              0,
            ],
          },
        },
        failed: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ['$status', 'completed'] }, { $eq: ['$clearancePassed', false] }] },
              1,
              0,
            ],
          },
        },
        averagePercentage: {
          $avg: {
            $cond: [{ $eq: ['$status', 'completed'] }, '$clearancePercentage', '$$REMOVE'],
          },
        },
      },
    },
  ]);

  const completed = summary?.completed ?? 0;
  const passed = summary?.passed ?? 0;
  const result = {
    total: summary?.total ?? 0,
    pending_approval: summary?.pending_approval ?? 0,
    scheduled: summary?.scheduled ?? 0,
    completed,
    waived: summary?.waived ?? 0,
    passed,
    failed: summary?.failed ?? 0,
    passRate: completed ? Math.round((passed / completed) * 10000) / 100 : 0,
    averagePercentage: summary?.averagePercentage
      ? Math.round(summary.averagePercentage * 100) / 100
      : 0,
  };

  res.json({ success: true, data: result });
}
