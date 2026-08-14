import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { Types, PipelineStage } from 'mongoose';
import { Paper } from '../models/Paper';
import { PaperResult } from '../models/PaperResult';
import { Branch } from '../models/Branch';
import { orgBranchScope } from '../utils/orgBranchScope';

export const createPaperValidators = [
  body('classId').isMongoId(),
  body('sectionId').isMongoId(),
  body('subjectId').isMongoId(),
  body('academicYearId').isMongoId(),
  body('topicId').isMongoId(),
  body('weekNumber').isInt({ min: 1, max: 53 }),
  body('month').isInt({ min: 1, max: 12 }),
  body('year').isInt({ min: 2020 }),
  body('totalMarks').isInt({ min: 1 }),
  body('scheduledDate').isISO8601(),
];

export async function createPaper(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(422).json({ success: false, errors: errors.array() }); return; }

  const { orgId, branchId, id: createdById } = req.user!;
  const paper = await Paper.create({
    ...req.body,
    orgId,
    branchId,
    teacherId: createdById,
    createdById,
    paperType: 'weekly',
  });

  res.status(201).json({ success: true, data: paper });
}

export async function listPapers(req: Request, res: Response): Promise<void> {
  const { orgId, branchId, id: userId, role } = req.user!;
  const { subjectId, classId, sectionId, month, year, status } = req.query;

  const filter: Record<string, unknown> = orgBranchScope({ orgId, branchId });
  if (subjectId) filter.subjectId = subjectId;
  if (classId) filter.classId = classId;
  if (sectionId) filter.sectionId = sectionId;
  if (month) filter.month = Number(month);
  if (year) filter.year = Number(year);
  if (status) filter.status = status;
  if (role === 'teacher') filter.teacherId = userId;

  const papers = await Paper.find(filter)
    .populate('topicId', 'topicName chapterNumber')
    .populate('subjectId', 'name code')
    .populate('classId', 'name level')
    .populate('sectionId', 'name')
    .sort({ scheduledDate: -1 })
    .lean();

  res.json({ success: true, data: papers });
}

export async function getPaper(req: Request, res: Response): Promise<void> {
  const { orgId } = req.user!;
  const paper = await Paper.findOne({ _id: req.params.id, orgId })
    .populate('topicId', 'topicName chapterNumber')
    .populate('subjectId', 'name code')
    .populate('classId', 'name level')
    .populate('sectionId', 'name')
    .lean();
  if (!paper) { res.status(404).json({ success: false, message: 'Paper not found' }); return; }
  res.json({ success: true, data: paper });
}

// ─── Mark Entry ───────────────────────────────────────────────────────────────

export const enterPaperMarksValidators = [
  body('results').isArray({ min: 1 }),
  body('results.*.studentId').isMongoId(),
  body('results.*.marksObtained').isNumeric(),
  body('results.*.isAbsent').optional().isBoolean(),
];

export async function enterPaperMarks(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(422).json({ success: false, errors: errors.array() }); return; }

  const { orgId, branchId, id: gradedById } = req.user!;
  const paperId = req.params.id;

  const paper = await Paper.findOne({ _id: paperId, orgId }).lean();
  if (!paper) { res.status(404).json({ success: false, message: 'Paper not found' }); return; }

  const branch = await Branch.findOne({ _id: branchId, orgId }).lean();
  const weakThreshold = branch?.academicThresholds?.weakThreshold ?? 50;

  const now = new Date();
  type MarkInput = { studentId: string; marksObtained: number; isAbsent?: boolean };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bulkOps: any[] = (req.body.results as MarkInput[]).map((r): any => {
    const marks = r.isAbsent ? 0 : Math.min(r.marksObtained, paper.totalMarks);
    const percentage = paper.totalMarks > 0
      ? Math.round((marks / paper.totalMarks) * 10000) / 100
      : 0;
    const isWeak = !r.isAbsent && percentage < weakThreshold;

    return {
      updateOne: {
        filter: { paperId, studentId: r.studentId, orgId },
        update: {
          $set: {
            orgId,
            branchId,
            paperId,
            studentId: r.studentId,
            classId: paper.classId,
            sectionId: paper.sectionId,
            subjectId: paper.subjectId,
            marksObtained: marks,
            totalMarks: paper.totalMarks,
            percentage,
            isWeak,
            isAbsent: !!r.isAbsent,
            gradedAt: now,
            gradedById,
          },
        },
        upsert: true,
      },
    };
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await PaperResult.bulkWrite(bulkOps as any[]);
  await Paper.findByIdAndUpdate(paperId, { status: 'graded' });

  res.json({ success: true, message: `${bulkOps.length} results saved` });
}

// ─── Paper Results (for a single paper) ──────────────────────────────────────

export async function getPaperResults(req: Request, res: Response): Promise<void> {
  const { orgId } = req.user!;
  const results = await PaperResult.find({ orgId, paperId: req.params.id })
    .populate('studentId', 'profile.name rollNo')
    .sort({ percentage: -1 })
    .lean();
  res.json({ success: true, data: results });
}

// ─── Weak Topics (student self-view or teacher for their class) ───────────────

export async function getWeakTopics(req: Request, res: Response): Promise<void> {
  const { orgId, branchId, id: userId, role } = req.user!;
  const { studentId, month, year, subjectId } = req.query;

  const rawStudentId = Array.isArray(studentId) ? studentId[0] : studentId;
  const targetStudentId = role === 'student' ? userId : (typeof rawStudentId === 'string' ? rawStudentId : undefined);
  if (!targetStudentId) {
    res.status(400).json({ success: false, message: 'studentId is required' });
    return;
  }

  const rawSubjectId = Array.isArray(subjectId) ? subjectId[0] : subjectId;
  const subjectIdStr = typeof rawSubjectId === 'string' ? rawSubjectId : undefined;

  // Aggregate through papers to get topic info
  const pipeline = [
    {
      $match: {
        ...orgBranchScope({ orgId, branchId }),
        studentId: new Types.ObjectId(targetStudentId),
        isWeak: true,
        ...(subjectIdStr ? { subjectId: new Types.ObjectId(subjectIdStr) } : {}),
      },
    },
    {
      $lookup: {
        from: 'papers',
        localField: 'paperId',
        foreignField: '_id',
        as: 'paper',
      },
    },
    { $unwind: '$paper' },
    {
      $match: {
        ...(month ? { 'paper.month': Number(month) } : {}),
        ...(year ? { 'paper.year': Number(year) } : {}),
      },
    },
    {
      $lookup: {
        from: 'subjecttopics',
        localField: 'paper.topicId',
        foreignField: '_id',
        as: 'topic',
      },
    },
    { $unwind: { path: '$topic', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'subjects',
        localField: 'subjectId',
        foreignField: '_id',
        as: 'subject',
      },
    },
    { $unwind: { path: '$subject', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        percentage: 1,
        marksObtained: 1,
        totalMarks: 1,
        isAbsent: 1,
        clearedByClearanceId: 1,
        gradedAt: 1,
        'paper.month': 1,
        'paper.year': 1,
        'paper.weekNumber': 1,
        'paper.scheduledDate': 1,
        'topic.topicName': 1,
        'topic.chapterNumber': 1,
        'subject.name': 1,
        'subject.code': 1,
      },
    },
    { $sort: { 'paper.scheduledDate': -1 } },
  ];

  const results = await PaperResult.aggregate(pipeline as PipelineStage[]);
  res.json({ success: true, data: results });
}

// ─── Monthly Weak Report (teacher / principal view) ───────────────────────────

export async function getMonthlyWeakReport(req: Request, res: Response): Promise<void> {
  const { orgId, branchId, id: userId, role } = req.user!;
  const { month, year, subjectId, classId, sectionId } = req.query;

  if (!month || !year) {
    res.status(400).json({ success: false, message: 'month and year are required' });
    return;
  }

  const paperFilter: Record<string, unknown> = {
    ...orgBranchScope({ orgId, branchId }),
    month: Number(month),
    year: Number(year),
    paperType: 'weekly',
  };
  if (subjectId) paperFilter.subjectId = subjectId;
  if (classId) paperFilter.classId = classId;
  if (sectionId) paperFilter.sectionId = sectionId;
  if (role === 'teacher') paperFilter.teacherId = userId;

  const papers = await Paper.find(paperFilter).select('_id').lean();
  const paperIds = papers.map((p) => p._id);

  if (!paperIds.length) {
    res.json({ success: true, data: [], meta: { month: Number(month), year: Number(year) } });
    return;
  }

  const branch = branchId ? await Branch.findOne({ _id: branchId, orgId }).lean() : null;
  const weakThreshold = branch?.academicThresholds?.weakThreshold ?? 50;

  const agg = await PaperResult.aggregate([
    { $match: { ...orgBranchScope({ orgId, branchId }), paperId: { $in: paperIds } } },
    {
      $group: {
        _id: { studentId: '$studentId', subjectId: '$subjectId' },
        avgPercentage: { $avg: '$percentage' },
        weakCount: { $sum: { $cond: ['$isWeak', 1, 0] } },
        totalPapers: { $sum: 1 },
        absentCount: { $sum: { $cond: ['$isAbsent', 1, 0] } },
      },
    },
    {
      $lookup: {
        from: 'students',
        localField: '_id.studentId',
        foreignField: '_id',
        as: 'student',
      },
    },
    {
      $lookup: {
        from: 'subjects',
        localField: '_id.subjectId',
        foreignField: '_id',
        as: 'subject',
      },
    },
    { $unwind: { path: '$student', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$subject', preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        avgPercentage: { $round: ['$avgPercentage', 2] },
        isWeak: { $lt: ['$avgPercentage', weakThreshold] },
      },
    },
    {
      $project: {
        studentId: '$_id.studentId',
        subjectId: '$_id.subjectId',
        studentName: '$student.profile.name',
        rollNo: '$student.rollNo',
        subjectName: '$subject.name',
        subjectCode: '$subject.code',
        avgPercentage: 1,
        weakCount: 1,
        totalPapers: 1,
        absentCount: 1,
        isWeak: 1,
      },
    },
    { $sort: { isWeak: -1, avgPercentage: 1 } },
  ]);

  res.json({
    success: true,
    data: agg,
    meta: { month: Number(month), year: Number(year), weakThreshold },
  });
}
