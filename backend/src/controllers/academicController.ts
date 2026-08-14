import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AcademicYear } from '../models/AcademicYear';
import { Class } from '../models/Class';
import { Section } from '../models/Section';
import { Subject } from '../models/Subject';
import { Types } from 'mongoose';
import { orgBranchScope } from '../utils/orgBranchScope';

// ─── Academic Year ────────────────────────────────────────────────────────────

export const createYearValidators = [
  body('label').trim().notEmpty(),
  body('startDate').isISO8601(),
  body('endDate').isISO8601(),
];

export async function createAcademicYear(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(422).json({ success: false, errors: errors.array() }); return; }

  const { orgId, branchId } = req.user!;
  const { label, startDate, endDate, isCurrent } = req.body;

  if (isCurrent) {
    await AcademicYear.updateMany({ orgId, branchId }, { isCurrent: false });
  }

  const year = await AcademicYear.create({ orgId, branchId, label, startDate, endDate, isCurrent: !!isCurrent });
  res.status(201).json({ success: true, data: year });
}

export async function listAcademicYears(req: Request, res: Response): Promise<void> {
  const { orgId, branchId } = req.user!;
  const years = await AcademicYear.find(orgBranchScope({ orgId, branchId })).sort({ startDate: -1 }).lean();
  res.json({ success: true, data: years });
}

export async function updateAcademicYear(req: Request, res: Response): Promise<void> {
  const { orgId, branchId } = req.user!;
  const allowed = ['label', 'startDate', 'endDate', 'isCurrent'];
  const update: Record<string, unknown> = {};
  for (const k of allowed) if (req.body[k] !== undefined) update[k] = req.body[k];

  if (update.isCurrent) {
    await AcademicYear.updateMany({ orgId, branchId, _id: { $ne: req.params.id } }, { isCurrent: false });
  }

  const year = await AcademicYear.findOneAndUpdate({ _id: req.params.id, orgId, branchId }, update, { new: true });
  if (!year) { res.status(404).json({ success: false, message: 'Academic year not found' }); return; }
  res.json({ success: true, data: year });
}

// ─── Class ───────────────────────────────────────────────────────────────────

export const createClassValidators = [
  body('name').trim().notEmpty(),
  body('level').isIn(['grade_9', 'grade_10', 'grade_11', 'grade_12', 'inter_1', 'inter_2']),
  body('academicYearId').isMongoId(),
];

export async function createClass(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(422).json({ success: false, errors: errors.array() }); return; }

  const { orgId, branchId } = req.user!;
  const cls = await Class.create({ ...req.body, orgId, branchId });
  res.status(201).json({ success: true, data: cls });
}

export async function listClasses(req: Request, res: Response): Promise<void> {
  const { orgId, branchId } = req.user!;
  const { academicYearId } = req.query;
  const filter: Record<string, unknown> = orgBranchScope({ orgId, branchId });
  if (academicYearId) filter.academicYearId = academicYearId;
  const classes = await Class.find(filter).sort({ displayOrder: 1, name: 1 }).lean();
  res.json({ success: true, data: classes });
}

export async function updateClass(req: Request, res: Response): Promise<void> {
  const { orgId, branchId } = req.user!;
  const allowed = ['name', 'displayOrder'];
  const update: Record<string, unknown> = {};
  for (const k of allowed) if (req.body[k] !== undefined) update[k] = req.body[k];

  const cls = await Class.findOneAndUpdate({ _id: req.params.id, orgId, branchId }, update, { new: true });
  if (!cls) { res.status(404).json({ success: false, message: 'Class not found' }); return; }
  res.json({ success: true, data: cls });
}

export async function deleteClass(req: Request, res: Response): Promise<void> {
  const { orgId, branchId } = req.user!;
  const cls = await Class.findOneAndDelete({ _id: req.params.id, orgId, branchId });
  if (!cls) { res.status(404).json({ success: false, message: 'Class not found' }); return; }
  await Section.deleteMany({ orgId, branchId, classId: cls._id });
  res.json({ success: true, message: 'Class deleted' });
}

// ─── Section ─────────────────────────────────────────────────────────────────

export const createSectionValidators = [
  body('name').trim().notEmpty(),
  body('classId').isMongoId(),
];

export async function createSection(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(422).json({ success: false, errors: errors.array() }); return; }

  const { orgId, branchId } = req.user!;
  const section = await Section.create({ ...req.body, orgId, branchId });
  res.status(201).json({ success: true, data: section });
}

export async function listSections(req: Request, res: Response): Promise<void> {
  const { orgId, branchId } = req.user!;
  const { classId } = req.query;
  const filter: Record<string, unknown> = orgBranchScope({ orgId, branchId });
  if (classId) filter.classId = classId;
  const sections = await Section.find(filter).sort({ name: 1 }).lean();
  res.json({ success: true, data: sections });
}

export async function updateSection(req: Request, res: Response): Promise<void> {
  const { orgId, branchId } = req.user!;
  const allowed = ['name', 'classTeacherId', 'capacity'];
  const update: Record<string, unknown> = {};
  for (const k of allowed) if (req.body[k] !== undefined) update[k] = req.body[k];

  const section = await Section.findOneAndUpdate({ _id: req.params.id, orgId, branchId }, update, { new: true });
  if (!section) { res.status(404).json({ success: false, message: 'Section not found' }); return; }
  res.json({ success: true, data: section });
}

export async function deleteSection(req: Request, res: Response): Promise<void> {
  const { orgId, branchId } = req.user!;
  const section = await Section.findOneAndDelete({ _id: req.params.id, orgId, branchId });
  if (!section) { res.status(404).json({ success: false, message: 'Section not found' }); return; }
  res.json({ success: true, message: 'Section deleted' });
}

// ─── Subject ─────────────────────────────────────────────────────────────────

export const createSubjectValidators = [
  body('name').trim().notEmpty(),
  body('code').trim().notEmpty(),
];

export async function createSubject(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(422).json({ success: false, errors: errors.array() }); return; }

  const { orgId, branchId } = req.user!;
  const subject = await Subject.create({ ...req.body, orgId, branchId });
  res.status(201).json({ success: true, data: subject });
}

export async function listSubjects(req: Request, res: Response): Promise<void> {
  const { orgId, branchId } = req.user!;
  const subjects = await Subject.find(orgBranchScope({ orgId, branchId })).sort({ name: 1 }).lean();
  res.json({ success: true, data: subjects });
}

export async function updateSubject(req: Request, res: Response): Promise<void> {
  const { orgId, branchId } = req.user!;
  const allowed = ['name', 'code', 'isElective'];
  const update: Record<string, unknown> = {};
  for (const k of allowed) if (req.body[k] !== undefined) update[k] = req.body[k];

  const subject = await Subject.findOneAndUpdate({ _id: req.params.id, orgId, branchId }, update, { new: true });
  if (!subject) { res.status(404).json({ success: false, message: 'Subject not found' }); return; }
  res.json({ success: true, data: subject });
}

export async function deleteSubject(req: Request, res: Response): Promise<void> {
  const { orgId, branchId } = req.user!;
  const subject = await Subject.findOneAndDelete({ _id: req.params.id, orgId, branchId });
  if (!subject) { res.status(404).json({ success: false, message: 'Subject not found' }); return; }
  res.json({ success: true, message: 'Subject deleted' });
}
