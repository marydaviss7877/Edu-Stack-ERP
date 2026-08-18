import { Request, Response } from 'express';
import { Exam } from '../models/Exam';
import { Result } from '../models/Result';
import { orgBranchScope } from '../utils/orgBranchScope';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function studentSummary(r: any) {
  const student = r.studentId;
  return {
    studentId: typeof student === 'object' ? student._id : student,
    name: typeof student === 'object' ? student.profile?.name : undefined,
    rollNo: typeof student === 'object' ? student.rollNo : undefined,
    percentage: r.percentage,
    grade: r.grade,
    isPassed: r.isPassed,
  };
}

export async function getExamAnalytics(req: Request, res: Response): Promise<void> {
  const { orgId, branchId, role } = req.user!;
  if (role === 'student') { res.status(403).json({ success: false, message: 'Not available for this role' }); return; }

  const exam = await Exam.findOne({ _id: req.params.id, orgId }).lean();
  if (!exam) { res.status(404).json({ success: false, message: 'Exam not found' }); return; }

  const { classId, sectionId } = req.query;
  const filter: Record<string, unknown> = { ...orgBranchScope({ orgId, branchId }), examId: exam._id };
  if (classId) filter.classId = classId;
  if (sectionId) filter.sectionId = sectionId;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: any[] = await Result.find(filter)
    .populate('studentId', 'profile.name rollNo')
    .populate('subjectMarks.subjectId', 'name code')
    .lean();

  const totalStudents = results.length;
  if (totalStudents === 0) {
    res.json({
      success: true,
      data: { totalStudents: 0, absentCount: 0, classAverage: 0, passRate: 0, gradeDistribution: [], subjectStats: [], topPerformers: [], bottomPerformers: [] },
    });
    return;
  }

  const absentCount = results.filter((r) => r.subjectMarks.every((m: { isAbsent: boolean }) => m.isAbsent)).length;
  const classAverage = round2(results.reduce((sum, r) => sum + r.percentage, 0) / totalStudents);
  const passRate = round2((results.filter((r) => r.isPassed).length / totalStudents) * 100);

  const gradeMap = new Map<string, number>();
  for (const r of results) gradeMap.set(r.grade, (gradeMap.get(r.grade) ?? 0) + 1);
  const gradeDistribution = [...gradeMap.entries()]
    .map(([grade, count]) => ({ grade, count }))
    .sort((a, b) => b.count - a.count);

  interface SubjectAcc { subjectName: string; sum: number; count: number; passed: number; highest: number; lowest: number; }
  const subjectMap = new Map<string, SubjectAcc>();
  for (const r of results) {
    for (const m of r.subjectMarks) {
      if (m.isAbsent) continue;
      const subject = m.subjectId;
      const sid = typeof subject === 'object' ? String(subject._id) : String(subject);
      const sname = typeof subject === 'object' ? subject.name : 'Subject';
      const pct = m.totalMarks > 0 ? (m.marksObtained / m.totalMarks) * 100 : 0;
      const entry = subjectMap.get(sid) ?? { subjectName: sname, sum: 0, count: 0, passed: 0, highest: -Infinity, lowest: Infinity };
      entry.sum += pct;
      entry.count += 1;
      if (m.isPassed) entry.passed += 1;
      entry.highest = Math.max(entry.highest, m.marksObtained);
      entry.lowest = Math.min(entry.lowest, m.marksObtained);
      subjectMap.set(sid, entry);
    }
  }
  const subjectStats = [...subjectMap.entries()]
    .map(([subjectId, s]) => ({
      subjectId,
      subjectName: s.subjectName,
      average: round2(s.sum / s.count),
      passRate: round2((s.passed / s.count) * 100),
      highest: s.highest,
      lowest: s.lowest,
      attempted: s.count,
    }))
    .sort((a, b) => a.subjectName.localeCompare(b.subjectName));

  const sorted = [...results].sort((a, b) => b.percentage - a.percentage);
  const topPerformers = sorted.slice(0, 5).map(studentSummary);
  const bottomPerformers = sorted.slice(-5).reverse().map(studentSummary);

  res.json({
    success: true,
    data: { totalStudents, absentCount, classAverage, passRate, gradeDistribution, subjectStats, topPerformers, bottomPerformers },
  });
}

export async function getExamProgress(req: Request, res: Response): Promise<void> {
  const { orgId, branchId, role } = req.user!;
  if (role === 'student') { res.status(403).json({ success: false, message: 'Not available for this role' }); return; }

  const { classId, sectionId, academicYearId } = req.query;
  if (!classId || !academicYearId) {
    res.status(400).json({ success: false, message: 'classId and academicYearId are required' });
    return;
  }

  const examFilter: Record<string, unknown> = {
    ...orgBranchScope({ orgId, branchId }),
    academicYearId,
    targetClasses: classId,
  };
  const exams = await Exam.find(examFilter).sort({ startDate: 1 }).select('name startDate').lean();

  const examIds = exams.map((e) => e._id);
  const resultFilter: Record<string, unknown> = {
    ...orgBranchScope({ orgId, branchId }),
    examId: { $in: examIds },
    classId,
  };
  if (sectionId) resultFilter.sectionId = sectionId;

  const results = await Result.find(resultFilter).select('examId percentage isPassed').lean();

  const data = exams.map((exam) => {
    const examResults = results.filter((r) => String(r.examId) === String(exam._id));
    const totalStudents = examResults.length;
    return {
      examId: exam._id,
      examName: exam.name,
      startDate: exam.startDate,
      totalStudents,
      classAverage: totalStudents ? round2(examResults.reduce((s, r) => s + r.percentage, 0) / totalStudents) : 0,
      passRate: totalStudents ? round2((examResults.filter((r) => r.isPassed).length / totalStudents) * 100) : 0,
    };
  });

  res.json({ success: true, data });
}
