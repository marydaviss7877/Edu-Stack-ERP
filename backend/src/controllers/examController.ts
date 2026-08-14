import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { Exam, IGradeThreshold } from '../models/Exam';
import { Result } from '../models/Result';
import { Student } from '../models/Student';
import { orgBranchScope } from '../utils/orgBranchScope';

export const createExamValidators = [
  body('name').trim().notEmpty(),
  body('academicYearId').isMongoId(),
  body('startDate').isISO8601(),
  body('endDate').isISO8601(),
  body('subjects').isArray({ min: 1 }),
  body('subjects.*.subjectId').isMongoId(),
  body('subjects.*.totalMarks').isInt({ min: 1 }),
  body('subjects.*.passingMarks').isInt({ min: 0 }),
  body('gradingConfig').isArray({ min: 1 }),
];

export async function createExam(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(422).json({ success: false, errors: errors.array() }); return; }

  const { orgId, branchId, id: createdById } = req.user!;
  const exam = await Exam.create({ ...req.body, orgId, branchId, createdById });
  res.status(201).json({ success: true, data: exam });
}

export async function listExams(req: Request, res: Response): Promise<void> {
  const { orgId, branchId } = req.user!;
  const { academicYearId } = req.query;
  const filter: Record<string, unknown> = orgBranchScope({ orgId, branchId });
  if (academicYearId) filter.academicYearId = academicYearId;
  const exams = await Exam.find(filter).sort({ startDate: -1 }).lean();
  res.json({ success: true, data: exams });
}

export async function getExam(req: Request, res: Response): Promise<void> {
  const { orgId } = req.user!;
  const exam = await Exam.findOne({ _id: req.params.id, orgId })
    .populate('subjects.subjectId', 'name code')
    .populate('targetClasses', 'name level');
  if (!exam) { res.status(404).json({ success: false, message: 'Exam not found' }); return; }
  res.json({ success: true, data: exam });
}

export async function updateExam(req: Request, res: Response): Promise<void> {
  const { orgId } = req.user!;
  const allowed = ['name', 'subjects', 'gradingConfig', 'startDate', 'endDate', 'targetClasses'];
  const update: Record<string, unknown> = {};
  for (const k of allowed) if (req.body[k] !== undefined) update[k] = req.body[k];

  const exam = await Exam.findOneAndUpdate({ _id: req.params.id, orgId, isPublished: false }, update, { new: true });
  if (!exam) { res.status(404).json({ success: false, message: 'Exam not found or already published' }); return; }
  res.json({ success: true, data: exam });
}

// ─── Marks Entry ─────────────────────────────────────────────────────────────

function calculateGrade(percentage: number, config: IGradeThreshold[]): string {
  const sorted = [...config].sort((a, b) => b.minPercentage - a.minPercentage);
  for (const tier of sorted) {
    if (percentage >= tier.minPercentage && percentage <= tier.maxPercentage) {
      return tier.grade;
    }
  }
  return 'F';
}

export const enterMarksValidators = [
  body('studentId').isMongoId(),
  body('subjectMarks').isArray({ min: 1 }),
  body('subjectMarks.*.subjectId').isMongoId(),
  body('subjectMarks.*.marksObtained').isNumeric(),
  body('subjectMarks.*.isAbsent').optional().isBoolean(),
];

export async function enterMarks(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(422).json({ success: false, errors: errors.array() }); return; }

  const { orgId, branchId, id: enteredById } = req.user!;
  const { examId } = req.params;
  const { studentId, subjectMarks } = req.body;

  const exam = await Exam.findOne({ _id: examId, orgId });
  if (!exam) { res.status(404).json({ success: false, message: 'Exam not found' }); return; }

  const student = await Student.findOne({ _id: studentId, orgId });
  if (!student) { res.status(404).json({ success: false, message: 'Student not found' }); return; }

  // Calculate totals
  let totalObtained = 0;
  let totalMax = 0;
  const processedMarks = subjectMarks.map((sm: { subjectId: string; marksObtained: number; isAbsent?: boolean }) => {
    const examSubject = exam.subjects.find((s) => String(s.subjectId) === sm.subjectId);
    if (!examSubject) return null;
    const marks = sm.isAbsent ? 0 : Math.min(sm.marksObtained, examSubject.totalMarks);
    totalObtained += marks;
    totalMax += examSubject.totalMarks;
    const isPassed = !sm.isAbsent && marks >= examSubject.passingMarks;
    return { subjectId: sm.subjectId, marksObtained: marks, totalMarks: examSubject.totalMarks, isAbsent: !!sm.isAbsent, isPassed };
  }).filter(Boolean);

  const percentage = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100 * 100) / 100 : 0;
  const grade = calculateGrade(percentage, exam.gradingConfig);
  const isPassed = processedMarks.every((m: { isPassed: boolean }) => m.isPassed);

  const result = await Result.findOneAndUpdate(
    { examId, studentId, orgId },
    {
      orgId, branchId, examId, studentId,
      classId: student.classId, sectionId: student.sectionId,
      subjectMarks: processedMarks,
      totalMarksObtained: totalObtained,
      totalMarks: totalMax,
      percentage, grade, isPassed, enteredById,
    },
    { upsert: true, new: true, runValidators: true }
  );

  res.json({ success: true, data: result });
}

export async function publishExam(req: Request, res: Response): Promise<void> {
  const { orgId } = req.user!;
  const exam = await Exam.findOneAndUpdate(
    { _id: req.params.id, orgId, isPublished: false },
    { isPublished: true },
    { new: true }
  );
  if (!exam) { res.status(404).json({ success: false, message: 'Exam not found or already published' }); return; }

  // Calculate class and section positions
  const results = await Result.find({ examId: exam._id, orgId }).sort({ percentage: -1 }).lean();
  const updates = results.map((r, i) => ({
    updateOne: {
      filter: { _id: r._id },
      update: { classPosition: i + 1, sectionPosition: i + 1 },
    },
  }));
  if (updates.length) await Result.bulkWrite(updates);

  res.json({ success: true, data: exam, message: `Exam published. ${results.length} results finalized.` });
}

export async function getResults(req: Request, res: Response): Promise<void> {
  const { orgId } = req.user!;
  const { examId, studentId, classId, sectionId } = req.query;

  const filter: Record<string, unknown> = { orgId };
  if (examId) filter.examId = examId;
  if (studentId) filter.studentId = studentId;
  if (classId) filter.classId = classId;
  if (sectionId) filter.sectionId = sectionId;

  const results = await Result.find(filter)
    .populate('studentId', 'profile.name rollNo')
    .populate('subjectMarks.subjectId', 'name code')
    .sort({ classPosition: 1 })
    .lean();

  res.json({ success: true, data: results });
}
