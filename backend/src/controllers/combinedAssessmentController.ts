import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { CombinedAssessment } from '../models/CombinedAssessment';
import { Result } from '../models/Result';
import { Student } from '../models/Student';
import { calculateGrade } from './examController';
import { orgBranchScope } from '../utils/orgBranchScope';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const createCombinedAssessmentValidators = [
  body('name').trim().notEmpty(),
  body('academicYearId').isMongoId(),
  body('classId').isMongoId(),
  body('sectionId').optional().isMongoId(),
  body('components').isArray({ min: 2 }),
  body('components.*.examId').isMongoId(),
  body('components.*.weight').isFloat({ min: 0.01 }),
  body('gradingConfig').isArray({ min: 1 }),
];

export async function createCombinedAssessment(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(422).json({ success: false, errors: errors.array() }); return; }

  const { orgId, branchId, id: createdById } = req.user!;
  const assessment = await CombinedAssessment.create({ ...req.body, orgId, branchId, createdById });
  res.status(201).json({ success: true, data: assessment });
}

export async function listCombinedAssessments(req: Request, res: Response): Promise<void> {
  const { orgId, branchId } = req.user!;
  const { classId, academicYearId } = req.query;
  const filter: Record<string, unknown> = orgBranchScope({ orgId, branchId });
  if (classId) filter.classId = classId;
  if (academicYearId) filter.academicYearId = academicYearId;

  const assessments = await CombinedAssessment.find(filter)
    .populate('components.examId', 'name startDate endDate')
    .populate('classId', 'name level')
    .populate('sectionId', 'name')
    .sort({ createdAt: -1 })
    .lean();
  res.json({ success: true, data: assessments });
}

export async function getCombinedAssessment(req: Request, res: Response): Promise<void> {
  const { orgId } = req.user!;
  const assessment = await CombinedAssessment.findOne({ _id: req.params.id, orgId })
    .populate('components.examId', 'name startDate endDate subjects')
    .populate('classId', 'name level')
    .populate('sectionId', 'name');
  if (!assessment) { res.status(404).json({ success: false, message: 'Combined assessment not found' }); return; }
  res.json({ success: true, data: assessment });
}

export async function updateCombinedAssessment(req: Request, res: Response): Promise<void> {
  const { orgId } = req.user!;
  const allowed = ['name', 'components', 'gradingConfig', 'classId', 'sectionId', 'academicYearId'];
  const update: Record<string, unknown> = {};
  for (const k of allowed) if (req.body[k] !== undefined) update[k] = req.body[k];

  const assessment = await CombinedAssessment.findOneAndUpdate(
    { _id: req.params.id, orgId, isPublished: false },
    update,
    { new: true, runValidators: true }
  );
  if (!assessment) { res.status(404).json({ success: false, message: 'Combined assessment not found or already published' }); return; }
  res.json({ success: true, data: assessment });
}

export async function deleteCombinedAssessment(req: Request, res: Response): Promise<void> {
  const { orgId } = req.user!;
  const assessment = await CombinedAssessment.findOneAndDelete({ _id: req.params.id, orgId, isPublished: false });
  if (!assessment) { res.status(404).json({ success: false, message: 'Combined assessment not found or already published' }); return; }
  res.json({ success: true, data: null });
}

export async function publishCombinedAssessment(req: Request, res: Response): Promise<void> {
  const { orgId } = req.user!;
  const assessment = await CombinedAssessment.findOneAndUpdate(
    { _id: req.params.id, orgId, isPublished: false },
    { isPublished: true },
    { new: true }
  );
  if (!assessment) { res.status(404).json({ success: false, message: 'Combined assessment not found or already published' }); return; }
  res.json({ success: true, data: assessment });
}

// ─── Combined Results (computed on the fly from per-exam Results) ────────────

export async function getCombinedResults(req: Request, res: Response): Promise<void> {
  const { orgId, branchId, id: userId, role } = req.user!;

  const assessment = await CombinedAssessment.findOne({ _id: req.params.id, orgId }).lean();
  if (!assessment) { res.status(404).json({ success: false, message: 'Combined assessment not found' }); return; }

  const componentExamIds = assessment.components.map((c) => c.examId);
  const resultFilter: Record<string, unknown> = {
    ...orgBranchScope({ orgId, branchId }),
    examId: { $in: componentExamIds },
    classId: assessment.classId,
  };
  if (assessment.sectionId) resultFilter.sectionId = assessment.sectionId;

  const results = await Result.find(resultFilter)
    .populate('studentId', 'profile.name rollNo')
    .lean();

  interface StudentAcc {
    studentId: string; name?: string; rollNo?: string;
    weightedSum: number; weightUsed: number; allPassed: boolean; present: number;
    componentResults: { examId: string; percentage: number; weight: number; isPassed: boolean }[];
  }
  const byStudent = new Map<string, StudentAcc>();

  for (const r of results) {
    const sid = String(r.studentId && typeof r.studentId === 'object' ? (r.studentId as { _id: unknown })._id : r.studentId);
    const component = assessment.components.find((c) => String(c.examId) === String(r.examId));
    if (!component) continue;

    const acc = byStudent.get(sid) ?? {
      studentId: sid,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      name: typeof r.studentId === 'object' ? (r.studentId as any).profile?.name : undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rollNo: typeof r.studentId === 'object' ? (r.studentId as any).rollNo : undefined,
      weightedSum: 0, weightUsed: 0, allPassed: true, present: 0, componentResults: [] as StudentAcc['componentResults'],
    };
    acc.weightedSum += r.percentage * component.weight;
    acc.weightUsed += component.weight;
    acc.present += 1;
    if (!r.isPassed) acc.allPassed = false;
    acc.componentResults.push({ examId: String(r.examId), percentage: r.percentage, weight: component.weight, isPassed: r.isPassed });
    byStudent.set(sid, acc);
  }

  let rows = [...byStudent.values()].map((acc) => {
    const overallPercentage = acc.weightUsed > 0 ? round2(acc.weightedSum / acc.weightUsed) : 0;
    return {
      studentId: acc.studentId,
      name: acc.name,
      rollNo: acc.rollNo,
      componentResults: acc.componentResults,
      incompleteComponents: assessment.components.length - acc.present,
      overallPercentage,
      grade: calculateGrade(overallPercentage, assessment.gradingConfig),
      isPassed: acc.present > 0 && acc.allPassed,
    };
  });

  rows.sort((a, b) => b.overallPercentage - a.overallPercentage);
  rows = rows.map((r, i) => ({ ...r, classPosition: i + 1 }));

  if (role === 'student') {
    const student = await Student.findOne({ ...orgBranchScope({ orgId, branchId }), userId }).select('_id').lean();
    rows = rows.filter((r) => r.studentId === String(student?._id));
  }

  res.json({ success: true, data: rows });
}
