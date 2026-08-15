import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { Types, PipelineStage } from 'mongoose';
import { Paper } from '../models/Paper';
import { PaperResult } from '../models/PaperResult';
import { Branch } from '../models/Branch';
import { Student } from '../models/Student';
import { SubjectTopic } from '../models/SubjectTopic';
import { Subject } from '../models/Subject';
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

  if (role === 'student') {
    const student = await Student.findOne({
      ...orgBranchScope({ orgId, branchId }),
      userId,
    }).select('classId sectionId').lean();
    if (!student) { res.json({ success: true, data: [] }); return; }
    filter.classId = student.classId;
    filter.sectionId = student.sectionId;
  }

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
  const { orgId, branchId, id: userId, role } = req.user!;
  const filter: Record<string, unknown> = { orgId, paperId: req.params.id };

  // Students may only ever see their own result, never classmates' names/scores
  if (role === 'student') {
    const student = await Student.findOne({
      ...orgBranchScope({ orgId, branchId }),
      userId,
    }).select('_id').lean();
    if (!student) { res.json({ success: true, data: [] }); return; }
    filter.studentId = student._id;
  }

  const results = await PaperResult.find(filter)
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
  let targetStudentId = typeof rawStudentId === 'string' ? rawStudentId : undefined;
  if (role === 'student') {
    const student = await Student.findOne({
      ...orgBranchScope({ orgId, branchId }),
      userId,
    }).select('_id').lean();
    targetStudentId = student?._id.toString();
  }
  if (!targetStudentId) {
    res.status(400).json({ success: false, message: 'studentId is required' });
    return;
  }

  const rawSubjectId = Array.isArray(subjectId) ? subjectId[0] : subjectId;
  const subjectIdStr = typeof rawSubjectId === 'string' ? rawSubjectId : undefined;
  const aggregateScope = {
    orgId: new Types.ObjectId(orgId),
    ...(branchId ? { branchId: new Types.ObjectId(branchId) } : {}),
  };

  // Aggregate through papers to get topic info
  const pipeline = [
    {
      $match: {
        ...aggregateScope,
        studentId: new Types.ObjectId(targetStudentId),
        isWeak: true,
        ...(subjectIdStr ? { subjectId: new Types.ObjectId(subjectIdStr) } : {}),
      },
    },
    {
      $lookup: {
        from: 'paper',
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
  const aggregateScope = {
    orgId: new Types.ObjectId(orgId),
    ...(branchId ? { branchId: new Types.ObjectId(branchId) } : {}),
  };

  const agg = await PaperResult.aggregate([
    { $match: { ...aggregateScope, paperId: { $in: paperIds } } },
    {
      $lookup: {
        from: 'paper',
        localField: 'paperId',
        foreignField: '_id',
        as: 'paper',
      },
    },
    { $unwind: '$paper' },
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
      $group: {
        _id: { studentId: '$studentId', subjectId: '$subjectId' },
        avgPercentage: { $avg: '$percentage' },
        weakCount: { $sum: { $cond: ['$isWeak', 1, 0] } },
        totalPapers: { $sum: 1 },
        absentCount: { $sum: { $cond: ['$isAbsent', 1, 0] } },
        weakTopics: {
          $addToSet: {
            $cond: ['$isWeak', '$topic.topicName', '$$REMOVE'],
          },
        },
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
      $lookup: {
        from: 'classes',
        localField: 'student.classId',
        foreignField: '_id',
        as: 'class',
      },
    },
    {
      $lookup: {
        from: 'sections',
        localField: 'student.sectionId',
        foreignField: '_id',
        as: 'section',
      },
    },
    { $unwind: { path: '$class', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$section', preserveNullAndEmptyArrays: true } },
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
        photoUrl: '$student.profile.photoUrl',
        className: '$class.name',
        sectionName: '$section.name',
        subjectName: '$subject.name',
        subjectCode: '$subject.code',
        avgPercentage: 1,
        weakCount: 1,
        totalPapers: 1,
        absentCount: 1,
        weakTopics: 1,
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

// ─── My Progress (student self-view — weekly topic coverage + syllabus mastery) ──

export async function getMyProgress(req: Request, res: Response): Promise<void> {
  const { orgId, branchId, id: userId, role } = req.user!;
  const { studentId, subjectId } = req.query;

  const rawStudentId = Array.isArray(studentId) ? studentId[0] : studentId;
  let targetStudentId = typeof rawStudentId === 'string' ? rawStudentId : undefined;
  let studentClassId: Types.ObjectId | undefined;

  if (role === 'student') {
    const student = await Student.findOne({
      ...orgBranchScope({ orgId, branchId }),
      userId,
    }).select('classId').lean();
    targetStudentId = student?._id.toString();
    studentClassId = student?.classId;
  } else if (targetStudentId) {
    const student = await Student.findOne({
      _id: targetStudentId,
      ...orgBranchScope({ orgId, branchId }),
    }).select('classId').lean();
    studentClassId = student?.classId;
  }

  if (!targetStudentId || !studentClassId) {
    res.status(400).json({ success: false, message: 'studentId is required' });
    return;
  }

  const rawSubjectId = Array.isArray(subjectId) ? subjectId[0] : subjectId;
  const subjectIdStr = typeof rawSubjectId === 'string' ? rawSubjectId : undefined;
  const aggregateScope = {
    orgId: new Types.ObjectId(orgId),
    ...(branchId ? { branchId: new Types.ObjectId(branchId) } : {}),
  };

  // Weekly topic-by-topic results (every paper, not just weak ones) — powers the coverage timeline
  const weeklyPipeline: PipelineStage[] = [
    {
      $match: {
        ...aggregateScope,
        studentId: new Types.ObjectId(targetStudentId),
        ...(subjectIdStr ? { subjectId: new Types.ObjectId(subjectIdStr) } : {}),
      },
    },
    { $lookup: { from: 'paper', localField: 'paperId', foreignField: '_id', as: 'paper' } },
    { $unwind: '$paper' },
    { $match: { 'paper.paperType': 'weekly' } },
    { $lookup: { from: 'subjecttopics', localField: 'paper.topicId', foreignField: '_id', as: 'topic' } },
    { $unwind: { path: '$topic', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'subjects', localField: 'subjectId', foreignField: '_id', as: 'subject' } },
    { $unwind: { path: '$subject', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        paperId: 1,
        subjectId: 1,
        subjectName: '$subject.name',
        subjectCode: '$subject.code',
        topicName: '$topic.topicName',
        chapterNumber: '$topic.chapterNumber',
        weekNumber: '$paper.weekNumber',
        month: '$paper.month',
        year: '$paper.year',
        scheduledDate: '$paper.scheduledDate',
        percentage: 1,
        marksObtained: 1,
        totalMarks: 1,
        isWeak: 1,
        isAbsent: 1,
      },
    },
    { $sort: { scheduledDate: 1 } },
  ];

  // Distinct topics tested / flagged weak per subject (from weekly papers, excluding absences)
  const masteryPipeline: PipelineStage[] = [
    {
      $match: {
        ...aggregateScope,
        studentId: new Types.ObjectId(targetStudentId),
        isAbsent: false,
        ...(subjectIdStr ? { subjectId: new Types.ObjectId(subjectIdStr) } : {}),
      },
    },
    { $lookup: { from: 'paper', localField: 'paperId', foreignField: '_id', as: 'paper' } },
    { $unwind: '$paper' },
    { $match: { 'paper.paperType': 'weekly', 'paper.topicId': { $exists: true } } },
    {
      $group: {
        _id: '$subjectId',
        testedTopics: { $addToSet: '$paper.topicId' },
        weakTopics: { $addToSet: { $cond: ['$isWeak', '$paper.topicId', '$$REMOVE'] } },
      },
    },
  ];

  const [weekly, masteryRows, topicTotals] = await Promise.all([
    PaperResult.aggregate(weeklyPipeline),
    PaperResult.aggregate(masteryPipeline),
    SubjectTopic.aggregate([
      {
        $match: {
          ...aggregateScope,
          classId: studentClassId,
          ...(subjectIdStr ? { subjectId: new Types.ObjectId(subjectIdStr) } : {}),
        },
      },
      { $group: { _id: '$subjectId', totalTopics: { $sum: 1 } } },
    ]),
  ]);

  const subjectIds = new Set<string>([
    ...masteryRows.map((r) => r._id.toString()),
    ...topicTotals.map((r) => r._id.toString()),
  ]);
  const subjectDocs = await Subject.find({ _id: { $in: [...subjectIds] } }).select('name code').lean();
  const subjectMap = new Map(subjectDocs.map((s) => [s._id.toString(), s]));
  const masteryMap = new Map(masteryRows.map((r) => [r._id.toString(), r]));
  const totalsMap = new Map(topicTotals.map((r) => [r._id.toString(), r.totalTopics as number]));

  const subjects = [...subjectIds]
    .map((sid) => {
      const m = masteryMap.get(sid);
      const totalTopics = totalsMap.get(sid) ?? 0;
      const topicsTested = m?.testedTopics?.length ?? 0;
      const topicsWeak = m?.weakTopics?.length ?? 0;
      const topicsMastered = Math.max(0, topicsTested - topicsWeak);
      const sub = subjectMap.get(sid);
      return {
        subjectId: sid,
        subjectName: sub?.name ?? 'Unknown',
        subjectCode: sub?.code ?? '',
        totalTopics,
        topicsTested,
        topicsWeak,
        topicsMastered,
        masteryPct: totalTopics > 0 ? Math.round((topicsMastered / totalTopics) * 10000) / 100 : 0,
      };
    })
    .sort((a, b) => a.subjectName.localeCompare(b.subjectName));

  const overallTotals = subjects.reduce(
    (acc, s) => {
      acc.totalTopics += s.totalTopics;
      acc.topicsTested += s.topicsTested;
      acc.topicsMastered += s.topicsMastered;
      return acc;
    },
    { totalTopics: 0, topicsTested: 0, topicsMastered: 0 }
  );

  const overall = {
    ...overallTotals,
    masteryPct: overallTotals.totalTopics > 0
      ? Math.round((overallTotals.topicsMastered / overallTotals.totalTopics) * 10000) / 100
      : 0,
  };

  res.json({ success: true, data: { weekly, subjects, overall } });
}
