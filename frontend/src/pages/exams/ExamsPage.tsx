import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { academicService } from '../../services/academicService';
import { examService } from '../../services/examService';
import type { ExamDoc, ResultDoc } from '../../services/examService';
import { studentService } from '../../services/studentService';
import { branchHeaderService } from '../../services/branchHeaderService';
import PageHeader from '../../components/ui/PageHeader';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import { useAuthStore } from '../../stores/authStore';
import { cn } from '../../lib/utils';
import { downloadResultCardPdf } from '../../lib/resultCardPdf';
import SyllabusManagerTab from './SyllabusManagerTab';
import ExamAnalyticsTab from './ExamAnalyticsTab';
import CombinedAssessmentTab from './CombinedAssessmentTab';
import ResultHistoryTab from './ResultHistoryTab';

type View = 'list' | 'marks' | 'results' | 'history' | 'syllabus' | 'analytics' | 'combined';

function StudentExamsView() {
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);

  const { data: student, isLoading: loadingProfile } = useQuery({
    queryKey: ['my-profile'],
    queryFn: studentService.getMe,
  });

  const { data: years = [] } = useQuery({ queryKey: ['years'], queryFn: academicService.getYears });
  const currentYear = years.find(y => y.isCurrent) ?? years[0];

  const studentId = student?._id ?? '';
  const classId = typeof student?.classId === 'object' ? student.classId._id : student?.classId ?? '';

  const { data: allExams = [], isLoading: loadingExams } = useQuery({
    queryKey: ['exams', currentYear?._id],
    queryFn: () => examService.list({ academicYearId: currentYear!._id }),
    enabled: !!currentYear && !!classId,
  });

  // Filter exams for student's class (published only)
  const exams = allExams.filter(e => (!e.classId || e.classId === classId) && e.isPublished);

  const { data: myResults = [], isLoading: loadingResults } = useQuery({
    queryKey: ['my-results', studentId],
    queryFn: () => examService.getResults({ studentId }),
    enabled: !!studentId,
  });

  const getMyResult = (examId: string) => myResults.find(r => r.examId === examId);

  const selectedExam = selectedExamId ? allExams.find(e => e._id === selectedExamId) ?? null : null;
  const selectedResult = selectedExamId ? getMyResult(selectedExamId) : null;

  if (loadingProfile) return <div className="p-6 text-center text-gray-400 py-20">Loading...</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <PageHeader
        title="My Exams & Results"
        subtitle={typeof student?.classId === 'object' ? student.classId.name : undefined}
      />

      {selectedExam && selectedResult ? (
        /* ── Result detail view ── */
        <div>
          <button
            onClick={() => setSelectedExamId(null)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 mb-4"
          >
            ← Back to exams
          </button>

          {/* Result summary */}
          <div className="card p-5 mb-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{selectedExam.name}</h2>
                <p className="text-sm text-gray-400 dark:text-slate-500 mt-0.5">{selectedExam.startDate} → {selectedExam.endDate}</p>
              </div>
              <div className="text-right">
                <div className={cn('text-3xl font-bold', selectedResult.isPassed ? 'text-green-600' : 'text-red-600')}>
                  {selectedResult.grade}
                </div>
                <div className="text-sm text-gray-500 dark:text-slate-400">{selectedResult.percentage}%</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900 dark:text-slate-100">{selectedResult.totalMarksObtained}/{selectedResult.totalMarks}</div>
                <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Total Marks</div>
              </div>
              <div className="text-center">
                <div className={cn('text-lg font-bold', selectedResult.isPassed ? 'text-green-600' : 'text-red-600')}>
                  {selectedResult.isPassed ? 'Pass' : 'Fail'}
                </div>
                <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Status</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900 dark:text-slate-100">
                  {selectedResult.classPosition ? `#${selectedResult.classPosition}` : '—'}
                </div>
                <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Class Position</div>
              </div>
            </div>
          </div>

          {/* Subject-wise marks */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300">Subject-wise Marks</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 dark:bg-slate-700/50 dark:border-slate-700">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Subject</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Obtained</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Total</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {selectedResult.subjectMarks.map((sm, i) => {
                  const subName = typeof sm.subjectId === 'object' ? sm.subjectId.name : sm.subjectId;
                  return (
                    <tr key={i} className={cn(!sm.isPassed && !sm.isAbsent && 'bg-red-50 dark:bg-red-900/20')}>
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-slate-100">{subName}</td>
                      <td className="px-4 py-3 text-center">
                        {sm.isAbsent ? <span className="text-gray-400 dark:text-slate-500 text-xs">Absent</span> : sm.marksObtained}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-500 dark:text-slate-400">{sm.totalMarks}</td>
                      <td className="px-4 py-3 text-center">
                        {sm.isAbsent ? (
                          <Badge variant="warning">Absent</Badge>
                        ) : sm.isPassed ? (
                          <Badge variant="success">Pass</Badge>
                        ) : (
                          <Badge variant="danger">Fail</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {selectedResult.remarks && (
            <div className="card p-4 mt-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">Teacher's Remarks</h3>
              <p className="text-sm text-gray-600 dark:text-slate-300">{selectedResult.remarks}</p>
            </div>
          )}
        </div>
      ) : (
        /* ── Exam list ── */
        <div>
          {loadingExams || loadingResults ? (
            <div className="card px-5 py-12 text-center text-gray-400 dark:text-slate-500 text-sm">Loading exams...</div>
          ) : exams.length === 0 ? (
            <div className="card px-5 py-12 text-center text-gray-400 dark:text-slate-500 text-sm">No published exams yet.</div>
          ) : (
            <div className="space-y-3">
              {exams.map(exam => {
                const result = getMyResult(exam._id);
                return (
                  <div
                    key={exam._id}
                    className="card p-4 flex items-center justify-between hover:shadow-sm transition-shadow cursor-pointer"
                    onClick={() => result && setSelectedExamId(exam._id)}
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-slate-100">{exam.name}</p>
                      <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                        {exam.startDate} → {exam.endDate} · {exam.subjects.length} subjects
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {result ? (
                        <>
                          <span className={cn('text-lg font-bold', result.isPassed ? 'text-green-600' : 'text-red-600')}>
                            {result.grade}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-slate-400">{result.percentage}%</span>
                          <Badge variant={result.isPassed ? 'success' : 'danger'}>
                            {result.isPassed ? 'Pass' : 'Fail'}
                          </Badge>
                          <span className="text-gray-300 dark:text-slate-600 text-xs">›</span>
                        </>
                      ) : (
                        <Badge variant="warning">Result Pending</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ExamsPage() {
  const user = useAuthStore(s => s.user);
  if (user?.role === 'student') return <StudentExamsView />;
  return <StaffExamsView />;
}

function StaffExamsView() {
  const user    = useAuthStore(s => s.user);
  const orgSlug = useAuthStore(s => s.orgSlug);
  const qc = useQueryClient();

  const { data: branchHeader } = useQuery({ queryKey: ['branch-header'], queryFn: branchHeaderService.get });
  const orgName = branchHeader?.schoolName ?? orgSlug ?? 'School';

  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [view, setView] = useState<View>('list');
  const [selectedExam, setSelectedExam] = useState<ExamDoc | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [marksInput, setMarksInput] = useState<Record<string, string>>({});
  const [absentMap, setAbsentMap] = useState<Record<string, boolean>>({});
  const [remarksInput, setRemarksInput] = useState('');
  const [editingRemarksFor, setEditingRemarksFor] = useState<string | null>(null);
  const [remarksDraft, setRemarksDraft] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [apiError, setApiError] = useState('');

  // Create exam form state
  const [examName, setExamName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [examSubjects, setExamSubjects] = useState<{ subjectId: string; totalMarks: string; passingMarks: string }[]>([]);

  const { data: years = [] } = useQuery({ queryKey: ['years'], queryFn: academicService.getYears });
  const currentYear = years.find(y => y.isCurrent) ?? years[0];

  const { data: classes = [] } = useQuery({
    queryKey: ['classes', currentYear?._id],
    queryFn: () => academicService.getClasses(currentYear?._id),
    enabled: !!currentYear,
  });

  const { data: sections = [] } = useQuery({
    queryKey: ['sections', classId],
    queryFn: () => academicService.getSections(classId || undefined),
    enabled: !!classId,
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects', classId],
    queryFn: () => academicService.getSubjects(classId || undefined),
    enabled: !!classId,
  });

  const { data: exams = [], isLoading: loadingExams } = useQuery({
    queryKey: ['exams', classId, sectionId, currentYear?._id],
    queryFn: () => examService.list({ classId, sectionId, academicYearId: currentYear!._id }),
    enabled: !!classId && !!sectionId && !!currentYear,
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students-attendance', classId, sectionId, currentYear?._id],
    queryFn: () => studentService.list({ classId, sectionId, academicYearId: currentYear!._id, status: 'active' }).then(r => r.data ?? []),
    enabled: !!classId && !!sectionId && !!currentYear && view === 'marks',
  });

  const { data: results = [], isLoading: loadingResults } = useQuery({
    queryKey: ['results', selectedExam?._id, sectionId],
    queryFn: () => examService.getResults({ examId: selectedExam!._id, sectionId }),
    enabled: !!selectedExam && view === 'results',
  });

  const createMutation = useMutation({
    mutationFn: examService.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['exams'] }); setCreateOpen(false); resetCreateForm(); },
    onError: (e: { response?: { data?: { message?: string } } }) => setApiError(e?.response?.data?.message ?? 'Failed to create exam'),
  });

  const marksMutation = useMutation({
    mutationFn: ({ examId, studentId, subjectMarks, remarks }: { examId: string; studentId: string; subjectMarks: { subjectId: string; marksObtained: number; isAbsent?: boolean }[]; remarks?: string }) =>
      examService.enterMarks(examId, studentId, subjectMarks, remarks),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['results'] }); setMarksInput({}); setAbsentMap({}); setRemarksInput(''); setSelectedStudentId(''); },
    onError: (e: { response?: { data?: { message?: string } } }) => setApiError(e?.response?.data?.message ?? 'Failed to save marks'),
  });

  const remarksMutation = useMutation({
    mutationFn: ({ examId, studentId, remarks }: { examId: string; studentId: string; remarks: string }) =>
      examService.setRemarks(examId, studentId, remarks),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['results'] }); setEditingRemarksFor(null); },
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => examService.publish(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['exams'] }); },
  });

  const resetCreateForm = () => {
    setExamName(''); setStartDate(''); setEndDate(''); setExamSubjects([]); setApiError('');
  };

  const handleCreateExam = () => {
    if (!examName || !startDate || !endDate || examSubjects.length === 0) {
      setApiError('Fill all fields and add at least one subject.'); return;
    }
    const subs = examSubjects.filter(s => s.subjectId && s.totalMarks && s.passingMarks).map(s => ({
      subjectId: s.subjectId,
      totalMarks: Number(s.totalMarks),
      passingMarks: Number(s.passingMarks),
    }));
    createMutation.mutate({
      name: examName,
      academicYearId: currentYear!._id,
      classId,
      sectionId,
      subjects: subs,
      gradingConfig: [
        { grade: 'A+', minPercentage: 90, maxPercentage: 100 },
        { grade: 'A', minPercentage: 80, maxPercentage: 89 },
        { grade: 'B', minPercentage: 70, maxPercentage: 79 },
        { grade: 'C', minPercentage: 60, maxPercentage: 69 },
        { grade: 'D', minPercentage: 50, maxPercentage: 59 },
        { grade: 'F', minPercentage: 0, maxPercentage: 49 },
      ],
      startDate,
      endDate,
    } as Parameters<typeof examService.create>[0]);
  };

  const addSubjectRow = () => setExamSubjects(prev => [...prev, { subjectId: '', totalMarks: '100', passingMarks: '33' }]);
  const removeSubjectRow = (i: number) => setExamSubjects(prev => prev.filter((_, idx) => idx !== i));

  const handleSaveMarks = () => {
    if (!selectedExam || !selectedStudentId) return;
    const subjectMarks = selectedExam.subjects.map(sub => ({
      subjectId: sub.subjectId as string,
      marksObtained: absentMap[sub.subjectId as string] ? 0 : Number(marksInput[sub.subjectId as string] ?? 0),
      isAbsent: absentMap[sub.subjectId as string] ?? false,
    }));
    marksMutation.mutate({ examId: selectedExam._id, studentId: selectedStudentId, subjectMarks, remarks: remarksInput || undefined });
  };

  const canManage = ['branch_principal', 'it_admin', 'group_admin', 'teacher'].includes(user?.role ?? '');
  const canFinalizeRemarks = user?.role === 'branch_principal';

  const getResult = (studentId: string) => results.find(r => {
    const sid = typeof r.studentId === 'object' ? r.studentId._id : r.studentId;
    return sid === studentId;
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Exams & Results"
        actions={canManage && classId && sectionId && view === 'list' ? (
          <button onClick={() => { setApiError(''); resetCreateForm(); setCreateOpen(true); }} className="btn-primary text-sm">
            + Create Exam
          </button>
        ) : undefined}
      />

      {/* Filters */}
      <div className="card p-4 mb-5">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="label">Class</label>
            <select className="input" value={classId} onChange={e => { setClassId(e.target.value); setSectionId(''); setSelectedExam(null); setView('list'); }}>
              <option value="">Select class...</option>
              {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Section</label>
            <select className="input" value={sectionId} onChange={e => { setSectionId(e.target.value); setSelectedExam(null); setView('list'); }} disabled={!classId}>
              <option value="">Select section...</option>
              {sections.map(s => <option key={s._id} value={s._id}>Section {s.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['list', 'marks', 'results', 'history', 'syllabus', 'analytics', 'combined'] as View[]).map(v => {
            const needsExam = v === 'marks' || v === 'results';
            const isDisabled = needsExam ? !selectedExam : (v !== 'list' && !classId);
            return (
              <button
                key={v}
                onClick={() => setView(v)}
                disabled={isDisabled}
                className={cn('px-3 py-2 text-sm rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
                  view === v ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700')}
              >
                {v === 'marks' ? 'Enter Marks'
                  : v === 'results' ? 'Results'
                  : v === 'history' ? 'Result History'
                  : v === 'syllabus' ? 'Syllabus'
                  : v === 'analytics' ? 'Analytics'
                  : v === 'combined' ? 'Combined Assessment'
                  : 'Exams'}
              </button>
            );
          })}
        </div>
        {selectedExam && (
          <div className="mt-3 flex items-center gap-2 text-sm text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 dark:bg-blue-900/20 dark:border-blue-700/50 dark:text-blue-300">
            <span className="font-medium">{selectedExam.name}</span>
            <span className="text-blue-400 dark:text-blue-500">{selectedExam.startDate} → {selectedExam.endDate}</span>
            {selectedExam.isPublished && <Badge variant="success">Published</Badge>}
            <button onClick={() => { setSelectedExam(null); setView('list'); }} className="ml-auto text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 text-xs">✕ Clear</button>
          </div>
        )}
      </div>

      {/* Exam list */}
      {view === 'list' && (
        <div className="card divide-y divide-gray-100 dark:divide-slate-700">
          {!classId || !sectionId ? (
            <div className="px-5 py-10 text-center text-gray-400 dark:text-slate-500 text-sm">Select a class and section.</div>
          ) : loadingExams ? (
            <div className="px-5 py-10 text-center text-gray-400 dark:text-slate-500 text-sm">Loading...</div>
          ) : exams.length === 0 ? (
            <div className="px-5 py-10 text-center text-gray-400 dark:text-slate-500 text-sm">No exams created yet.</div>
          ) : exams.map(exam => (
            <div key={exam._id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700/40">
              <div>
                <p className="font-medium text-gray-900 dark:text-slate-100 text-sm">{exam.name}</p>
                <p className="text-xs text-gray-400 dark:text-slate-500">{exam.startDate} → {exam.endDate} · {exam.subjects.length} subjects</p>
              </div>
              <div className="flex items-center gap-2">
                {exam.isPublished ? (
                  <Badge variant="success">Published</Badge>
                ) : (
                  canManage && (
                    <button
                      onClick={() => publishMutation.mutate(exam._id)}
                      disabled={publishMutation.isPending}
                      className="text-xs px-3 py-1 rounded-lg border border-green-200 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20 transition-colors"
                    >
                      Publish
                    </button>
                  )
                )}
                <button onClick={() => { setSelectedExam(exam); setView('marks'); }} className="btn-secondary text-xs">Enter Marks</button>
                <button onClick={() => { setSelectedExam(exam); setView('results'); }} className="btn-secondary text-xs">View Results</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Marks entry */}
      {view === 'marks' && selectedExam && (
        <div className="space-y-4">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="label">Select Student</label>
                <select className="input" value={selectedStudentId} onChange={e => {
                  setSelectedStudentId(e.target.value);
                  setMarksInput({});
                  setAbsentMap({});
                  const existing = getResult(e.target.value);
                  setRemarksInput(existing?.remarks ?? '');
                }}>
                  <option value="">Choose student...</option>
                  {students.map(s => (
                    <option key={s._id} value={s._id}>{s.rollNo} — {s.profile.name}</option>
                  ))}
                </select>
              </div>
              {selectedStudentId && (
                <div className="flex items-end">
                  {(() => {
                    const r = getResult(selectedStudentId);
                    return r ? (
                      <div className="text-sm text-gray-500">
                        Marks saved · <span className={cn('font-medium', r.isPassed ? 'text-green-600' : 'text-red-600')}>{r.grade} ({r.percentage}%)</span>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}
            </div>
          </div>

          {selectedStudentId && (
            <div className="card overflow-hidden">
              {apiError && <div className="px-4 py-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-800">{apiError}</div>}
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 dark:bg-slate-700/50 dark:border-slate-700">
                    <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Subject</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Total</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Pass</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Obtained</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Absent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                  {selectedExam.subjects.map(sub => {
                    const subId = sub.subjectId as string;
                    const subjectName = subjects.find((s: { _id: string; name: string }) => s._id === subId)?.name ?? subId;
                    const isAbsent = absentMap[subId] ?? false;
                    const result = getResult(selectedStudentId);
                    const savedMark = result?.subjectMarks.find(m => m.subjectId === subId);
                    return (
                      <tr key={subId}>
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-slate-100">{subjectName}</td>
                        <td className="px-4 py-3 text-center text-gray-500 dark:text-slate-400">{sub.totalMarks}</td>
                        <td className="px-4 py-3 text-center text-gray-500 dark:text-slate-400">{sub.passingMarks}</td>
                        <td className="px-4 py-3 text-center">
                          {isAbsent ? (
                            <span className="text-gray-300 dark:text-slate-600 text-xs">—</span>
                          ) : (
                            <input
                              type="number"
                              min={0}
                              max={sub.totalMarks}
                              value={marksInput[subId] ?? (savedMark && !savedMark.isAbsent ? String(savedMark.marksObtained) : '')}
                              onChange={e => setMarksInput(prev => ({ ...prev, [subId]: e.target.value }))}
                              className="w-20 text-center border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                              placeholder="0"
                            />
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={isAbsent}
                            onChange={e => setAbsentMap(prev => ({ ...prev, [subId]: e.target.checked }))}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-700 space-y-3">
                <div>
                  <label className="label">Remarks (optional)</label>
                  <textarea
                    className="input"
                    rows={2}
                    placeholder="e.g. Good improvement in Math, needs to focus on Science..."
                    value={remarksInput}
                    onChange={e => setRemarksInput(e.target.value)}
                  />
                </div>
                <div className="flex justify-end">
                  <button onClick={handleSaveMarks} disabled={marksMutation.isPending} className="btn-primary">
                    {marksMutation.isPending ? 'Saving...' : 'Save Marks'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {view === 'results' && selectedExam && (
        <div className="card overflow-hidden">
          {loadingResults ? (
            <div className="px-5 py-10 text-center text-gray-400 text-sm">Loading results...</div>
          ) : results.length === 0 ? (
            <div className="px-5 py-10 text-center text-gray-400 text-sm">No results entered yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 dark:bg-slate-700/50 dark:border-slate-700">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Pos</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Roll</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Name</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Marks</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-slate-400">%</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Grade</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Remarks</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-slate-400">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {(results as ResultDoc[]).sort((a, b) => (a.classPosition ?? 999) - (b.classPosition ?? 999)).map(r => {
                  const student = typeof r.studentId === 'object' ? r.studentId : null;
                  const studentId = typeof r.studentId === 'object' ? r.studentId._id : r.studentId;
                  return (
                    <tr key={r._id} className={cn(!r.isPassed && 'bg-red-50 dark:bg-red-900/20')}>
                      <td className="px-4 py-3 font-mono text-gray-400 dark:text-slate-500">{r.classPosition ?? '—'}</td>
                      <td className="px-4 py-3 font-mono text-gray-500 dark:text-slate-400">{student?.rollNo ?? '—'}</td>
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-slate-100">{student?.profile.name ?? '—'}</td>
                      <td className="px-4 py-3 text-center">{r.totalMarksObtained}/{r.totalMarks}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn('font-medium', r.isPassed ? 'text-green-600' : 'text-red-600')}>{r.percentage}%</span>
                      </td>
                      <td className="px-4 py-3 text-center font-bold">{r.grade}</td>
                      <td className="px-4 py-3 text-center">
                        {r.isPassed ? <Badge variant="success">Pass</Badge> : <Badge variant="danger">Fail</Badge>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-slate-400 text-xs max-w-xs">
                        {editingRemarksFor === r._id ? (
                          <div className="flex items-center gap-1.5">
                            <textarea
                              className="input text-xs py-1 flex-1"
                              rows={1}
                              value={remarksDraft}
                              onChange={e => setRemarksDraft(e.target.value)}
                              autoFocus
                            />
                            <button
                              onClick={() => remarksMutation.mutate({ examId: selectedExam!._id, studentId, remarks: remarksDraft })}
                              disabled={remarksMutation.isPending}
                              className="text-blue-600 hover:text-blue-700 text-xs whitespace-nowrap"
                            >
                              Save
                            </button>
                            <button onClick={() => setEditingRemarksFor(null)} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="flex-1">{r.remarks || '—'}</span>
                            {canFinalizeRemarks && (
                              <button
                                onClick={() => { setEditingRemarksFor(r._id); setRemarksDraft(r.remarks ?? ''); }}
                                className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 shrink-0"
                                title="Edit final remarks"
                              >
                                ✎
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => downloadResultCardPdf({
                            result: r,
                            examName: selectedExam?.name ?? '',
                            orgName,
                            studentName: student?.profile.name,
                            rollNo: student?.rollNo,
                          })}
                          className="text-xs px-2 py-1 rounded border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                          title="Download Result Card PDF"
                        >
                          ↓ PDF
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Result History */}
      {view === 'history' && (
        <ResultHistoryTab classId={classId} sectionId={sectionId} orgName={orgName} />
      )}

      {/* Syllabus Manager */}
      {view === 'syllabus' && (
        <SyllabusManagerTab />
      )}

      {/* Analytics */}
      {view === 'analytics' && (
        <ExamAnalyticsTab exams={exams} classId={classId} sectionId={sectionId} academicYearId={currentYear?._id} />
      )}

      {/* Combined Assessment */}
      {view === 'combined' && (
        <CombinedAssessmentTab exams={exams} classId={classId} sectionId={sectionId} academicYearId={currentYear?._id} orgName={orgName} />
      )}

      {/* Create exam modal */}
      <Modal open={createOpen} onClose={() => { setCreateOpen(false); resetCreateForm(); }} title="Create Exam" size="lg">
        <div className="space-y-4">
          {apiError && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{apiError}</div>}

          <div>
            <label className="label">Exam Name</label>
            <input className="input" value={examName} onChange={e => setExamName(e.target.value)} placeholder="e.g. Mid-Term Exam 2025" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start Date</label>
              <input type="date" className="input" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="label">End Date</label>
              <input type="date" className="input" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Subjects</label>
              <button onClick={addSubjectRow} className="text-sm text-blue-600 hover:text-blue-700">+ Add Subject</button>
            </div>
            <div className="space-y-2">
              {examSubjects.map((sub, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <select
                    className="input flex-1"
                    value={sub.subjectId}
                    onChange={e => setExamSubjects(prev => prev.map((s, idx) => idx === i ? { ...s, subjectId: e.target.value } : s))}
                  >
                    <option value="">Subject...</option>
                    {subjects.map((s: { _id: string; name: string }) => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                  <input
                    type="number"
                    className="input w-24"
                    placeholder="Total"
                    value={sub.totalMarks}
                    onChange={e => setExamSubjects(prev => prev.map((s, idx) => idx === i ? { ...s, totalMarks: e.target.value } : s))}
                  />
                  <input
                    type="number"
                    className="input w-24"
                    placeholder="Pass"
                    value={sub.passingMarks}
                    onChange={e => setExamSubjects(prev => prev.map((s, idx) => idx === i ? { ...s, passingMarks: e.target.value } : s))}
                  />
                  <button onClick={() => removeSubjectRow(i)} className="text-gray-400 hover:text-red-500 text-lg leading-none">×</button>
                </div>
              ))}
              {examSubjects.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-2">No subjects added. Click "+ Add Subject".</p>
              )}
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => { setCreateOpen(false); resetCreateForm(); }} className="btn-secondary">Cancel</button>
            <button onClick={handleCreateExam} disabled={createMutation.isPending} className="btn-primary">
              {createMutation.isPending ? 'Creating...' : 'Create Exam'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
