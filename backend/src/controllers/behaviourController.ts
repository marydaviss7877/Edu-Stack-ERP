import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { Types } from 'mongoose';
import { BehaviourRecord, computeRecordHash, GENESIS_HASH, type IBehaviourRecord } from '../models/BehaviourRecord';
import { Student } from '../models/Student';
import { Timetable } from '../models/Timetable';
import { orgBranchScope } from '../utils/orgBranchScope';

const STAFF_WHO_SEE_AUTHOR = new Set(['branch_principal', 'group_admin', 'super_admin']);

/**
 * A teacher may only log/read behaviour for students in classes they actually
 * appear on the timetable for — not any student in the branch. Coordinators and
 * above are branch/org-scoped instead (checked separately via orgBranchScope).
 */
async function teacherTeachesClass(
  orgId: string,
  branchId: string | undefined,
  teacherId: string,
  classId: Types.ObjectId,
  sectionId: Types.ObjectId
): Promise<boolean> {
  const timetable = await Timetable.findOne({
    ...orgBranchScope({ orgId, branchId }),
    classId,
    sectionId,
    isActive: true,
    'slots.teacherId': teacherId,
  }).select('_id').lean();
  return !!timetable;
}

/** Strips author identity from a record unless the viewer is allowed to see it. */
function serializeRecord(record: IBehaviourRecord, viewerRole: string, viewerId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plain: any = typeof (record as any).toObject === 'function' ? (record as any).toObject() : { ...record };
  const canSeeAuthor = STAFF_WHO_SEE_AUTHOR.has(viewerRole) || String(plain.authorId?._id ?? plain.authorId) === viewerId;
  if (!canSeeAuthor) {
    delete plain.authorId;
    delete plain.authorRole;
  }
  return plain;
}

export const createBehaviourRecordValidators = [
  body('studentId').isMongoId(),
  body('category').isIn(['discipline', 'academic', 'social', 'punctuality', 'other']),
  body('type').isIn(['merit', 'demerit']),
  body('points').isInt({ min: 1, max: 20 }),
  body('title').isString().trim().isLength({ min: 1, max: 120 }),
  body('notes').optional().isString().trim().isLength({ max: 1000 }),
];

export async function createBehaviourRecord(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(422).json({ success: false, errors: errors.array() }); return; }

  const { orgId, branchId, id: authorId, role } = req.user!;
  const { studentId, category, type, points, title, notes } = req.body;

  const student = await Student.findOne({ _id: studentId, ...orgBranchScope({ orgId, branchId }) })
    .select('classId sectionId')
    .lean();
  if (!student) { res.status(404).json({ success: false, message: 'Student not found' }); return; }

  if (role === 'teacher') {
    const allowed = await teacherTeachesClass(orgId!, branchId, authorId, student.classId, student.sectionId);
    if (!allowed) {
      res.status(403).json({ success: false, message: 'You can only log behaviour for your own classes' });
      return;
    }
  }

  const lastRecord = await BehaviourRecord.findOne({ studentId, ...orgBranchScope({ orgId, branchId }) })
    .sort({ createdAt: -1 })
    .select('recordHash')
    .lean();
  const prevHash = lastRecord?.recordHash ?? GENESIS_HASH;

  const now = new Date();
  const recordHash = computeRecordHash(prevHash, {
    studentId, category, type, points, title, notes, authorId, createdAt: now.toISOString(),
  });

  const record = await BehaviourRecord.create({
    orgId, branchId, studentId,
    classId: student.classId, sectionId: student.sectionId,
    category, type, points, title, notes,
    authorId, authorRole: role,
    status: 'active',
    prevHash, recordHash,
    createdAt: now,
  });

  res.status(201).json({ success: true, data: record });
}

export async function listBehaviourRecords(req: Request, res: Response): Promise<void> {
  const { orgId, branchId, id: userId, role } = req.user!;
  const { studentId, classId, sectionId, category, status } = req.query;

  const filter: Record<string, unknown> = orgBranchScope({ orgId, branchId });

  let targetStudentId = typeof studentId === 'string' ? studentId : undefined;

  if (role === 'student') {
    const self = await Student.findOne({ ...orgBranchScope({ orgId, branchId }), userId }).select('_id').lean();
    if (!self) { res.json({ success: true, data: [] }); return; }
    targetStudentId = self._id.toString();
  }

  if (targetStudentId) {
    filter.studentId = targetStudentId;
    if (role === 'teacher') {
      const student = await Student.findOne({ _id: targetStudentId, ...orgBranchScope({ orgId, branchId }) })
        .select('classId sectionId').lean();
      if (!student || !(await teacherTeachesClass(orgId!, branchId, userId, student.classId, student.sectionId))) {
        res.json({ success: true, data: [] });
        return;
      }
    }
  } else if (role === 'teacher') {
    // No specific student requested — teachers may only browse their own classes.
    if (!classId || !sectionId) {
      res.status(400).json({ success: false, message: 'classId and sectionId are required' });
      return;
    }
    const allowed = await teacherTeachesClass(orgId!, branchId, userId, new Types.ObjectId(classId as string), new Types.ObjectId(sectionId as string));
    if (!allowed) { res.json({ success: true, data: [] }); return; }
  }

  if (classId) filter.classId = classId;
  if (sectionId) filter.sectionId = sectionId;
  if (category) filter.category = category;
  if (status) filter.status = status;

  const records = await BehaviourRecord.find(filter)
    .populate('studentId', 'profile.name rollNo')
    .populate('authorId', 'name role')
    .sort({ createdAt: -1 })
    .lean();

  const data = records.map((r) => serializeRecord(r as unknown as IBehaviourRecord, role, userId));
  res.json({ success: true, data });
}

export async function getBehaviourSummary(req: Request, res: Response): Promise<void> {
  const { orgId, branchId, id: userId, role } = req.user!;
  const { studentId } = req.query;

  let targetStudentId = typeof studentId === 'string' ? studentId : undefined;
  if (role === 'student') {
    const self = await Student.findOne({ ...orgBranchScope({ orgId, branchId }), userId }).select('_id').lean();
    targetStudentId = self?._id.toString();
  }
  if (!targetStudentId) { res.status(400).json({ success: false, message: 'studentId is required' }); return; }

  if (role === 'teacher') {
    const student = await Student.findOne({ _id: targetStudentId, ...orgBranchScope({ orgId, branchId }) })
      .select('classId sectionId').lean();
    if (!student || !(await teacherTeachesClass(orgId!, branchId, userId, student.classId, student.sectionId))) {
      res.json({ success: true, data: { merits: 0, demerits: 0, netPoints: 0, byCategory: [] } });
      return;
    }
  }

  const agg = await BehaviourRecord.aggregate([
    { $match: { orgId: new Types.ObjectId(orgId), studentId: new Types.ObjectId(targetStudentId), status: 'active' } },
    {
      $group: {
        _id: '$category',
        merits: { $sum: { $cond: [{ $eq: ['$type', 'merit'] }, '$points', 0] } },
        demerits: { $sum: { $cond: [{ $eq: ['$type', 'demerit'] }, '$points', 0] } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const merits = agg.reduce((s, c) => s + c.merits, 0);
  const demerits = agg.reduce((s, c) => s + c.demerits, 0);

  res.json({
    success: true,
    data: {
      merits,
      demerits,
      netPoints: merits - demerits,
      byCategory: agg.map((c) => ({ category: c._id, merits: c.merits, demerits: c.demerits, count: c.count })),
    },
  });
}

export const retractBehaviourRecordValidators = [
  body('reason').isString().trim().isLength({ min: 1, max: 500 }),
];

export async function retractBehaviourRecord(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(422).json({ success: false, errors: errors.array() }); return; }

  const { orgId, branchId, id: retractedById } = req.user!;
  const { reason } = req.body;

  const record = await BehaviourRecord.findOne({ _id: req.params.id, ...orgBranchScope({ orgId, branchId }) });
  if (!record) { res.status(404).json({ success: false, message: 'Behaviour record not found' }); return; }
  if (record.status === 'retracted') { res.status(409).json({ success: false, message: 'Already retracted' }); return; }

  record.status = 'retracted';
  record.retractedById = retractedById as unknown as typeof record.retractedById;
  record.retractedAt = new Date();
  record.retractionReason = reason;
  await record.save();

  res.json({ success: true, data: record });
}

export async function verifyBehaviourChain(req: Request, res: Response): Promise<void> {
  const { orgId, branchId } = req.user!;
  const { studentId } = req.params;

  const records = await BehaviourRecord.find({ studentId, ...orgBranchScope({ orgId, branchId }) })
    .sort({ createdAt: 1 })
    .lean();

  let expectedPrevHash = GENESIS_HASH;
  for (const r of records) {
    if (r.prevHash !== expectedPrevHash) {
      res.json({ success: true, data: { valid: false, brokenAtRecordId: r._id, totalRecords: records.length } });
      return;
    }
    const recomputed = computeRecordHash(r.prevHash, {
      studentId: r.studentId.toString(),
      category: r.category,
      type: r.type,
      points: r.points,
      title: r.title,
      notes: r.notes,
      authorId: r.authorId.toString(),
      createdAt: r.createdAt.toISOString(),
    });
    if (recomputed !== r.recordHash) {
      res.json({ success: true, data: { valid: false, brokenAtRecordId: r._id, totalRecords: records.length } });
      return;
    }
    expectedPrevHash = r.recordHash;
  }

  res.json({ success: true, data: { valid: true, totalRecords: records.length } });
}
