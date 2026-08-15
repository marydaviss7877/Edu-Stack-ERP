import { useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { academicService } from '../../services/academicService';
import { studentService } from '../../services/studentService';
import { topicService } from '../../services/topicService';
import { weeklyPaperService } from '../../services/weeklyPaperService';
import type { PaperDoc } from '../../services/weeklyPaperService';
import { clearanceService } from '../../services/clearanceService';
import type { ClearanceDoc, ClearanceStatus } from '../../services/clearanceService';
import PageHeader from '../../components/ui/PageHeader';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import { useAuthStore } from '../../stores/authStore';
import { cn } from '../../lib/utils';

type Tab = 'tests' | 'weak' | 'clearance';

const MONTH_NAMES = Array.from({ length: 12 }, (_, i) => new Date(2000, i).toLocaleString('default', { month: 'long' }));

function populatedName(v: unknown, key = 'name'): string {
  if (!v) return '—';
  if (typeof v === 'object') return (v as Record<string, string>)[key] ?? '—';
  return String(v);
}

// ── Weekly Tests tab ─────────────────────────────────────────────────────────

function WeeklyTestsTab({ isTeacher }: { isTeacher: boolean }) {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [gradingPaper, setGradingPaper] = useState<PaperDoc | null>(null);

  const { data: years = [] } = useQuery({ queryKey: ['years'], queryFn: academicService.getYears });
  const currentYear = years.find(y => y.isCurrent) ?? years[0];

  const { data: papers = [], isLoading } = useQuery({
    queryKey: ['weekly-papers'],
    queryFn: () => weeklyPaperService.list({}),
  });

  return (
    <div>
      {isTeacher && (
        <div className="flex justify-end mb-4">
          <button onClick={() => setCreateOpen(true)} className="btn-primary text-sm">+ New Weekly Test</button>
        </div>
      )}

      <div className="card divide-y divide-gray-100 dark:divide-slate-700">
        {isLoading && <div className="px-5 py-8 text-center text-gray-400 text-sm">Loading...</div>}
        {!isLoading && papers.length === 0 && (
          <div className="px-5 py-8 text-center text-gray-400 text-sm">No weekly tests yet.</div>
        )}
        {papers.map(p => (
          <div key={p._id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700/40">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                {populatedName(p.subjectId)} — {populatedName(p.classId)} / {populatedName(p.sectionId)}
              </p>
              <p className="text-xs text-gray-400 dark:text-slate-500">
                {p.topicId ? populatedName(p.topicId, 'topicName') : 'No topic'} · {new Date(p.scheduledDate).toLocaleDateString()} · {p.totalMarks} marks
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={p.status === 'graded' ? 'success' : 'default'}>{p.status}</Badge>
              {isTeacher && p.status !== 'graded' && (
                <button onClick={() => setGradingPaper(p)} className="btn-secondary text-xs">Enter Marks</button>
              )}
              {p.status === 'graded' && (
                <button onClick={() => setGradingPaper(p)} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700">View Results</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {createOpen && currentYear && (
        <CreatePaperModal
          academicYearId={currentYear._id}
          onClose={() => setCreateOpen(false)}
          onCreated={() => { qc.invalidateQueries({ queryKey: ['weekly-papers'] }); setCreateOpen(false); }}
        />
      )}

      {gradingPaper && (
        <GradePaperModal
          paper={gradingPaper}
          academicYearId={currentYear?._id}
          readOnly={gradingPaper.status === 'graded' || !isTeacher}
          onClose={() => setGradingPaper(null)}
          onGraded={() => { qc.invalidateQueries({ queryKey: ['weekly-papers'] }); setGradingPaper(null); }}
        />
      )}
    </div>
  );
}

function CreatePaperModal({ academicYearId, onClose, onCreated }: { academicYearId: string; onClose: () => void; onCreated: () => void }) {
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [newTopicName, setNewTopicName] = useState('');
  const [chapterNumber, setChapterNumber] = useState(1);
  const [totalMarks, setTotalMarks] = useState(20);
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');

  const { data: classes = [] } = useQuery({ queryKey: ['classes', academicYearId], queryFn: () => academicService.getClasses(academicYearId) });
  const { data: sections = [] } = useQuery({ queryKey: ['sections', classId], queryFn: () => academicService.getSections(classId || undefined), enabled: !!classId });
  const { data: subjects = [] } = useQuery({ queryKey: ['subjects'], queryFn: () => academicService.getSubjects() });
  const { data: topics = [], refetch: refetchTopics } = useQuery({
    queryKey: ['topics', classId, subjectId],
    queryFn: () => topicService.list({ classId, subjectId }),
    enabled: !!classId && !!subjectId,
  });

  const createTopic = useMutation({
    mutationFn: () => topicService.create({ classId, subjectId, chapterNumber, topicName: newTopicName.trim() }),
    onSuccess: (t) => { setTopicId(t._id); setNewTopicName(''); refetchTopics(); },
  });

  const create = useMutation({
    mutationFn: () => {
      const d = new Date(scheduledDate);
      return weeklyPaperService.create({
        classId, sectionId, subjectId, academicYearId, topicId,
        weekNumber: Math.max(1, Math.ceil(d.getDate() / 7)),
        month: d.getMonth() + 1, year: d.getFullYear(),
        totalMarks, scheduledDate,
      });
    },
    onSuccess: onCreated,
    onError: () => setError('Could not create the test. Check all fields are filled in.'),
  });

  const canSubmit = classId && sectionId && subjectId && topicId && totalMarks > 0 && scheduledDate;

  return (
    <Modal open onClose={onClose} title="New Weekly Test" size="md"
      footer={<>
        <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
        <button onClick={() => create.mutate()} disabled={!canSubmit || create.isPending} className="btn-primary text-sm">
          {create.isPending ? 'Creating...' : 'Create Test'}
        </button>
      </>}>
      <div className="space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Class</label>
            <select className="input" value={classId} onChange={e => { setClassId(e.target.value); setSectionId(''); setTopicId(''); }}>
              <option value="">Select...</option>
              {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Section</label>
            <select className="input" value={sectionId} onChange={e => setSectionId(e.target.value)} disabled={!classId}>
              <option value="">Select...</option>
              {sections.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Subject</label>
          <select className="input" value={subjectId} onChange={e => { setSubjectId(e.target.value); setTopicId(''); }}>
            <option value="">Select...</option>
            {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </div>
        {classId && subjectId && (
          <div>
            <label className="label">Topic / Chapter</label>
            <select className="input mb-2" value={topicId} onChange={e => setTopicId(e.target.value)}>
              <option value="">Select existing...</option>
              {topics.map(t => <option key={t._id} value={t._id}>Ch.{t.chapterNumber} — {t.topicName}</option>)}
            </select>
            <div className="flex gap-2">
              <input type="number" min={1} className="input w-20" value={chapterNumber} onChange={e => setChapterNumber(Number(e.target.value))} placeholder="Ch#" />
              <input className="input flex-1" value={newTopicName} onChange={e => setNewTopicName(e.target.value)} placeholder="Or type a new topic name..." />
              <button
                type="button"
                disabled={!newTopicName.trim() || createTopic.isPending}
                onClick={() => createTopic.mutate()}
                className="btn-secondary text-xs whitespace-nowrap"
              >
                + Add
              </button>
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Total Marks</label>
            <input type="number" min={1} className="input" value={totalMarks} onChange={e => setTotalMarks(Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Test Date</label>
            <input type="date" className="input" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} />
          </div>
        </div>
      </div>
    </Modal>
  );
}

function GradePaperModal({ paper, academicYearId, readOnly, onClose, onGraded }: { paper: PaperDoc; academicYearId?: string; readOnly: boolean; onClose: () => void; onGraded: () => void }) {
  const classId = typeof paper.classId === 'object' ? paper.classId._id : paper.classId;
  const sectionId = typeof paper.sectionId === 'object' ? paper.sectionId._id : paper.sectionId;

  const { data: students = [] } = useQuery({
    queryKey: ['students-for-paper', classId, sectionId],
    queryFn: () => studentService.list({ classId, sectionId, academicYearId: academicYearId!, status: 'active' }).then(r => r.data ?? []),
    enabled: !readOnly && !!academicYearId,
  });
  const { data: results = [] } = useQuery({
    queryKey: ['paper-results', paper._id],
    queryFn: () => weeklyPaperService.getResults(paper._id),
    enabled: readOnly,
  });

  const [marks, setMarks] = useState<Record<string, string>>({});
  const [absent, setAbsent] = useState<Record<string, boolean>>({});

  const submit = useMutation({
    mutationFn: () => weeklyPaperService.enterMarks(paper._id, students.map(s => ({
      studentId: s._id,
      marksObtained: absent[s._id] ? 0 : Number(marks[s._id] ?? 0),
      isAbsent: !!absent[s._id],
    }))),
    onSuccess: onGraded,
  });

  return (
    <Modal open onClose={onClose} title={readOnly ? 'Test Results' : 'Enter Marks'} subtitle={`Out of ${paper.totalMarks} marks`} size="lg"
      footer={!readOnly ? <>
        <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
        <button onClick={() => submit.mutate()} disabled={submit.isPending} className="btn-primary text-sm">
          {submit.isPending ? 'Saving...' : 'Save Marks'}
        </button>
      </> : undefined}>
      <div className="divide-y divide-gray-100 dark:divide-slate-700">
        {readOnly ? (
          results.length === 0
            ? <p className="text-sm text-gray-400 py-6 text-center">No results yet.</p>
            : results.map(r => (
              <div key={r._id} className="flex items-center justify-between py-2.5">
                <span className="text-sm text-gray-800 dark:text-slate-200">
                  {typeof r.studentId === 'object' ? `${r.studentId.rollNo} — ${r.studentId.profile.name}` : r.studentId}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{r.isAbsent ? 'Absent' : `${r.marksObtained}/${r.totalMarks} (${r.percentage}%)`}</span>
                  {r.isWeak && <Badge variant="danger">Weak</Badge>}
                </div>
              </div>
            ))
        ) : (
          students.map(s => (
            <div key={s._id} className="flex items-center justify-between py-2.5 gap-3">
              <span className="text-sm text-gray-800 dark:text-slate-200 flex-1">{s.rollNo} — {s.profile.name}</span>
              <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
                <input type="checkbox" checked={!!absent[s._id]} onChange={e => setAbsent(a => ({ ...a, [s._id]: e.target.checked }))} />
                Absent
              </label>
              <input
                type="number" min={0} max={paper.totalMarks}
                disabled={!!absent[s._id]}
                className="input w-20 text-center disabled:opacity-40"
                value={marks[s._id] ?? ''}
                onChange={e => setMarks(m => ({ ...m, [s._id]: e.target.value }))}
              />
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}

// ── Weak Topics tab ──────────────────────────────────────────────────────────

export function WeakTopicsTab({ isStudent, initialMonth, initialYear }: { isStudent: boolean; initialMonth?: string; initialYear?: string }) {
  const now = new Date();
  const [month, setMonth] = useState(initialMonth || String(now.getMonth() + 1));
  const [year, setYear] = useState(initialYear || String(now.getFullYear()));

  const { data: myWeak = [], isLoading: loadingMine } = useQuery({
    queryKey: ['my-weak-topics', month, year],
    queryFn: () => weeklyPaperService.getWeakTopics({ month, year }),
    enabled: isStudent,
  });

  const { data: report, isLoading: loadingReport } = useQuery({
    queryKey: ['monthly-weak-report', month, year],
    queryFn: () => weeklyPaperService.getMonthlyReport({ month, year }),
    enabled: !isStudent,
  });

  const MonthYearPicker = (
    <div className="flex gap-3 mb-4">
      <select value={month} onChange={e => setMonth(e.target.value)} className="text-sm border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200">
        {MONTH_NAMES.map((m, i) => <option key={i + 1} value={String(i + 1)}>{m}</option>)}
      </select>
      <select value={year} onChange={e => setYear(e.target.value)} className="text-sm border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200">
        {[2024, 2025, 2026, 2027].map(y => <option key={y} value={String(y)}>{y}</option>)}
      </select>
    </div>
  );

  if (isStudent) {
    return (
      <div>
        {MonthYearPicker}
        <div className="card divide-y divide-gray-100 dark:divide-slate-700">
          {loadingMine && <div className="px-5 py-8 text-center text-gray-400 text-sm">Loading...</div>}
          {!loadingMine && myWeak.length === 0 && (
            <div className="px-5 py-8 text-center text-gray-400 text-sm">No weak topics flagged for this period. Nice work!</div>
          )}
          {myWeak.map((w, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{w.subject?.name ?? 'Subject'} — {w.topic?.topicName ?? 'General'}</p>
                <p className="text-xs text-gray-400 dark:text-slate-500">{new Date(w.paper.scheduledDate).toLocaleDateString()}</p>
              </div>
              <Badge variant="danger">{w.isAbsent ? 'Absent' : `${w.percentage}%`}</Badge>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const rows = (report?.data ?? []).filter(r => r.isWeak || r.weakCount > 0);
  return (
    <div>
      {MonthYearPicker}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700">
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Student</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Subject</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Weak Topics</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Avg %</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Weak / Total</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
            {loadingReport && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>}
            {!loadingReport && rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No weak topics for this period.</td></tr>
            )}
            {rows.map((r, i) => (
              <tr key={i} className={cn(r.isWeak ? 'bg-red-50 dark:bg-red-900/20' : '')}>
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-slate-100">{r.rollNo} — {r.studentName}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{r.subjectName}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-slate-300">
                  {r.weakTopics?.length ? r.weakTopics.join(', ') : 'General subject weakness'}
                </td>
                <td className="px-4 py-3 text-center font-medium">{r.avgPercentage}%</td>
                <td className="px-4 py-3 text-center text-gray-500">{r.weakCount}/{r.totalPapers}</td>
                <td className="px-4 py-3 text-center">{r.isWeak && <Badge variant="danger">Weak</Badge>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Clearance Exams tab ──────────────────────────────────────────────────────

const CLEARANCE_LABEL: Record<ClearanceStatus, string> = {
  pending_approval: 'Pending Approval', scheduled: 'Scheduled', completed: 'Completed', waived: 'Waived',
};
const CLEARANCE_VARIANT: Record<ClearanceStatus, 'warning' | 'info' | 'success' | 'default'> = {
  pending_approval: 'warning', scheduled: 'info', completed: 'success', waived: 'default',
};

export function ClearanceTab({ role }: { role?: string }) {
  const qc = useQueryClient();
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [approving, setApproving] = useState<ClearanceDoc | null>(null);
  const [grading, setGrading] = useState<ClearanceDoc | null>(null);

  const { data: summary } = useQuery({
    queryKey: ['clearance-summary', month, year],
    queryFn: () => clearanceService.getSummary({ month, year }),
    enabled: role !== 'student',
  });
  const { data: clearances = [], isLoading } = useQuery({
    queryKey: ['clearances', month, year],
    queryFn: () => clearanceService.list({ month, year }),
  });

  const waive = useMutation({
    mutationFn: (id: string) => clearanceService.waive(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clearances'] }); qc.invalidateQueries({ queryKey: ['clearance-summary'] }); },
  });

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <select value={month} onChange={e => setMonth(e.target.value)} className="text-sm border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200">
          {MONTH_NAMES.map((m, i) => <option key={i + 1} value={String(i + 1)}>{m}</option>)}
        </select>
        <select value={year} onChange={e => setYear(e.target.value)} className="text-sm border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200">
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={String(y)}>{y}</option>)}
        </select>
      </div>
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            ['Total Cases', summary.total],
            ['Pending Approval', summary.pending_approval],
            ['Scheduled', summary.scheduled],
            ['Completed', summary.completed],
            ['Waived', summary.waived],
            ['Passed', summary.passed],
            ['Pass Rate', `${summary.passRate}%`],
            ['Avg Score', `${summary.averagePercentage}%`],
          ].map(([label, value]) => (
            <div key={label} className="card p-4 text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-slate-100">{value}</div>
              <div className="text-xs text-gray-400 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="card divide-y divide-gray-100 dark:divide-slate-700">
        {isLoading && <div className="px-5 py-8 text-center text-gray-400 text-sm">Loading...</div>}
        {!isLoading && clearances.length === 0 && (
          <div className="px-5 py-8 text-center text-gray-400 text-sm">No clearance exams. These are generated automatically on the 1st of each month for students averaging below the branch's failing threshold.</div>
        )}
        {clearances.map(c => (
          <div key={c._id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                {typeof c.studentId === 'object' ? `${c.studentId.rollNo} — ${c.studentId.profile.name}` : c.studentId} · {populatedName(c.subjectId)}
              </p>
              <p className="text-xs text-gray-400 dark:text-slate-500">
                {MONTH_NAMES[c.triggerMonth - 1]} {c.triggerYear} · avg {c.averagePercentage}%
                {c.status === 'completed' && ` · scored ${c.clearanceMarksObtained}/${c.clearanceTotalMarks} (${c.clearancePercentage}%) — ${c.clearancePassed ? 'Passed' : 'Failed'}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={CLEARANCE_VARIANT[c.status]}>{CLEARANCE_LABEL[c.status]}</Badge>
              {role === 'branch_principal' && c.status === 'pending_approval' && (
                <>
                  <button onClick={() => setApproving(c)} className="btn-secondary text-xs">Approve</button>
                  <button onClick={() => waive.mutate(c._id)} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700">Waive</button>
                </>
              )}
              {role === 'teacher' && c.status === 'scheduled' && (
                <button onClick={() => setGrading(c)} className="btn-secondary text-xs">Enter Marks</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {approving && (
        <ApproveClearanceModal
          clearance={approving}
          onClose={() => setApproving(null)}
          onDone={() => { qc.invalidateQueries({ queryKey: ['clearances'] }); qc.invalidateQueries({ queryKey: ['clearance-summary'] }); setApproving(null); }}
        />
      )}
      {grading && (
        <GradeClearanceModal
          clearance={grading}
          onClose={() => setGrading(null)}
          onDone={() => { qc.invalidateQueries({ queryKey: ['clearances'] }); qc.invalidateQueries({ queryKey: ['clearance-summary'] }); setGrading(null); }}
        />
      )}
    </div>
  );
}

function ApproveClearanceModal({ clearance, onClose, onDone }: { clearance: ClearanceDoc; onClose: () => void; onDone: () => void }) {
  const { data: years = [] } = useQuery({ queryKey: ['years'], queryFn: academicService.getYears });
  const currentYear = years.find(y => y.isCurrent) ?? years[0];
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]);
  const [totalMarks, setTotalMarks] = useState(25);

  const approve = useMutation({
    mutationFn: () => clearanceService.approve(clearance._id, { scheduledDate, totalMarks, academicYearId: currentYear!._id }),
    onSuccess: onDone,
  });

  return (
    <Modal open onClose={onClose} title="Approve Clearance Exam" size="sm"
      footer={<>
        <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
        <button onClick={() => approve.mutate()} disabled={approve.isPending || !currentYear} className="btn-primary text-sm">
          {approve.isPending ? 'Scheduling...' : 'Schedule'}
        </button>
      </>}>
      <div className="space-y-4">
        <div>
          <label className="label">Exam Date</label>
          <input type="date" className="input" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} />
        </div>
        <div>
          <label className="label">Total Marks</label>
          <input type="number" min={1} className="input" value={totalMarks} onChange={e => setTotalMarks(Number(e.target.value))} />
        </div>
      </div>
    </Modal>
  );
}

function GradeClearanceModal({ clearance, onClose, onDone }: { clearance: ClearanceDoc; onClose: () => void; onDone: () => void }) {
  const [marksObtained, setMarksObtained] = useState(0);
  const grade = useMutation({
    mutationFn: () => clearanceService.enterMarks(clearance._id, marksObtained),
    onSuccess: onDone,
  });
  const totalMarks = typeof clearance.clearancePaperId === 'object' ? clearance.clearancePaperId.totalMarks : undefined;

  return (
    <Modal open onClose={onClose} title="Enter Clearance Marks" size="sm"
      footer={<>
        <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
        <button onClick={() => grade.mutate()} disabled={grade.isPending} className="btn-primary text-sm">
          {grade.isPending ? 'Saving...' : 'Save'}
        </button>
      </>}>
      <div>
        <label className="label">Marks Obtained {totalMarks ? `(out of ${totalMarks})` : ''}</label>
        <input type="number" min={0} max={totalMarks} className="input" value={marksObtained} onChange={e => setMarksObtained(Number(e.target.value))} />
      </div>
    </Modal>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function WeeklyPapersPage() {
  const user = useAuthStore(s => s.user);
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isMonthlyReportLink = location.pathname.endsWith('monthly-report');
  const [tab, setTab] = useState<Tab>(isMonthlyReportLink ? 'weak' : 'tests');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'tests', label: 'Weekly Tests' },
    { id: 'weak', label: 'Weak Topics' },
    { id: 'clearance', label: 'Clearance Exams' },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader title="Weekly Tests & Progress" subtitle="Weekly subject tests, weak-topic tracking, and clearance exams" />

      <div className="flex gap-1 bg-gray-100 dark:bg-slate-700 p-1 rounded-lg mb-6 w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn('px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
              tab === t.id ? 'bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200')}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'tests' && <WeeklyTestsTab isTeacher={user?.role === 'teacher'} />}
      {tab === 'weak' && (
        <WeakTopicsTab
          isStudent={user?.role === 'student'}
          initialMonth={isMonthlyReportLink ? searchParams.get('month') ?? undefined : undefined}
          initialYear={isMonthlyReportLink ? searchParams.get('year') ?? undefined : undefined}
        />
      )}
      {tab === 'clearance' && <ClearanceTab role={user?.role} />}
    </div>
  );
}
