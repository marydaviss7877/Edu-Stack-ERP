import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { useThemeStore } from '../../stores/themeStore';
import { useAuthStore } from '../../stores/authStore';
import { studentService } from '../../services/studentService';
import { attendanceService } from '../../services/attendanceService';
import { feeService, type ChallanDoc } from '../../services/feeService';
import { examService, type ResultDoc } from '../../services/examService';
import { weeklyPaperService } from '../../services/weeklyPaperService';
import { behaviourService, type BehaviourCategory, type BehaviourType } from '../../services/behaviourService';
import { peerFeedbackService } from '../../services/peerFeedbackService';
import PageHeader from '../../components/ui/PageHeader';
import Badge from '../../components/ui/Badge';
import UserAvatar from '../../components/ui/UserAvatar';
import Modal from '../../components/ui/Modal';
import { formatCurrency, formatDate } from '../../lib/utils';

const STATUS_COLOR: Record<'strong' | 'weak' | 'absent', string> = {
  strong: '#10b981',
  weak: '#ef4444',
  absent: '#94a3b8',
};

const STATUS_VARIANTS = {
  applied: 'warning', enrolled: 'info', active: 'success', leaving: 'warning',
  graduated: 'default', transferred: 'purple', withdrawn: 'danger',
} as const;

const CATEGORY_LABEL: Record<BehaviourCategory, string> = {
  discipline: 'Discipline', academic: 'Academic', social: 'Social', punctuality: 'Punctuality', other: 'Other',
};
const CATEGORY_BADGE: Record<BehaviourCategory, 'danger' | 'info' | 'purple' | 'amber' | 'default'> = {
  discipline: 'danger', academic: 'info', social: 'purple', punctuality: 'amber', other: 'default',
};
const CAN_LOG_BEHAVIOUR = new Set(['teacher', 'coordinator', 'branch_principal', 'group_admin']);
const CAN_RETRACT_BEHAVIOUR = new Set(['branch_principal', 'group_admin']);
const CAN_SEE_AUTHOR = new Set(['branch_principal', 'group_admin', 'super_admin']);

const today = new Date();
const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
const currentYear = String(today.getFullYear());

function SectionCard({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`card p-4 sm:p-5 ${className}`}>
      <h2 className="font-bold text-gray-900 dark:text-slate-100 text-sm sm:text-base mb-3">{title}</h2>
      {children}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-6 flex flex-col items-center text-center">
      <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center mb-2">
        <svg className="w-5 h-5 text-gray-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <p className="text-xs text-gray-400 dark:text-slate-500">{message}</p>
    </div>
  );
}

function StatTile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone: 'good' | 'bad' | 'neutral' | 'warn' }) {
  const toneClass = {
    good: 'text-emerald-600 dark:text-emerald-400',
    bad: 'text-red-600 dark:text-red-400',
    warn: 'text-amber-600 dark:text-amber-400',
    neutral: 'text-gray-800 dark:text-slate-200',
  }[tone];
  return (
    <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-3">
      <p className="text-[11px] font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-xl font-extrabold tracking-tight ${toneClass}`}>{value}</p>
      {sub && <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function StudentProfileDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isDark } = useThemeStore();
  const role = useAuthStore(s => s.user?.role) ?? '';
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'overview' | 'behaviour'>('overview');
  const [progressSubject, setProgressSubject] = useState('');
  const [showLogModal, setShowLogModal] = useState(false);
  const [retractTarget, setRetractTarget] = useState<string | null>(null);
  const [retractReason, setRetractReason] = useState('');
  const [logForm, setLogForm] = useState<{ category: BehaviourCategory; type: BehaviourType; points: string; title: string; notes: string }>({
    category: 'discipline', type: 'merit', points: '1', title: '', notes: '',
  });

  const { data: student, isLoading } = useQuery({
    queryKey: ['student-profile', id],
    queryFn: () => studentService.get(id!),
    enabled: !!id,
  });

  const { data: attSummary } = useQuery({
    queryKey: ['student-att-summary', id, currentMonth, currentYear],
    queryFn: () => attendanceService.getStudentSummary({ studentId: id!, month: currentMonth, year: currentYear }),
    enabled: !!id,
  });

  const { data: challansResp } = useQuery({
    queryKey: ['student-profile-challans', id],
    queryFn: () => feeService.listChallans({ studentId: id! }),
    enabled: !!id,
  });
  const challans: ChallanDoc[] = challansResp?.data ?? [];
  const pendingChallans = challans.filter(c => ['unpaid', 'overdue', 'partial'].includes(c.status));

  const { data: results = [] } = useQuery<ResultDoc[]>({
    queryKey: ['student-profile-results', id],
    queryFn: () => examService.getResults({ studentId: id! }),
    enabled: !!id,
  });

  const { data: exams = [] } = useQuery({
    queryKey: ['exams-list'],
    queryFn: () => examService.list(),
  });

  const { data: progress } = useQuery({
    queryKey: ['student-profile-progress', id],
    queryFn: () => weeklyPaperService.getMyProgress({ studentId: id! }),
    enabled: !!id,
  });

  const { data: behaviourRecords = [] } = useQuery({
    queryKey: ['student-behaviour', id],
    queryFn: () => behaviourService.list({ studentId: id! }),
    enabled: !!id && tab === 'behaviour',
  });

  const { data: behaviourSummary } = useQuery({
    queryKey: ['student-behaviour-summary', id],
    queryFn: () => behaviourService.getSummary({ studentId: id! }),
    enabled: !!id && tab === 'behaviour',
  });

  // Returns null when the peer-feedback add-on isn't enabled for this org — the card
  // below simply doesn't render in that case, no separate "is it enabled" check needed.
  const { data: peerSummary } = useQuery({
    queryKey: ['student-peer-feedback-summary', id],
    queryFn: () => peerFeedbackService.getSummary(id!),
    enabled: !!id,
  });

  const logBehaviour = useMutation({
    mutationFn: () => behaviourService.create({
      studentId: id!,
      category: logForm.category,
      type: logForm.type,
      points: Number(logForm.points),
      title: logForm.title,
      notes: logForm.notes || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-behaviour', id] });
      queryClient.invalidateQueries({ queryKey: ['student-behaviour-summary', id] });
      setShowLogModal(false);
      setLogForm({ category: 'discipline', type: 'merit', points: '1', title: '', notes: '' });
    },
  });

  const retractBehaviour = useMutation({
    mutationFn: () => behaviourService.retract(retractTarget!, retractReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-behaviour', id] });
      queryClient.invalidateQueries({ queryKey: ['student-behaviour-summary', id] });
      setRetractTarget(null);
      setRetractReason('');
    },
  });

  const className = student?.classId && typeof student.classId !== 'string' ? student.classId.name : '';
  const sectionName = student?.sectionId && typeof student.sectionId !== 'string' ? student.sectionId.name : '';

  const marksTrend = results.slice(-8).map((r, i) => {
    const exam = exams.find(e => e._id === r.examId);
    return {
      name: exam?.name ? exam.name.replace(/exam/i, '').trim().slice(0, 10) || exam.name.slice(0, 10) : `#${i + 1}`,
      pct: Math.round(r.percentage),
      grade: r.grade,
      passed: r.isPassed,
    };
  });
  const latestResult = results.length > 0 ? results[results.length - 1] : null;
  const pendingFeeTotal = pendingChallans.reduce((s, c) => s + (c.netAmount - c.paidAmount), 0);

  const progressSubjects = progress?.subjects ?? [];
  const overallMastery = progress?.overall;
  const filteredWeekly = (progress?.weekly ?? []).filter(w => !progressSubject || w.subjectId === progressSubject);
  const weeklyChartData = filteredWeekly.slice(-12).map(w => ({
    name: new Date(w.scheduledDate).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' }),
    pct: Math.round(w.percentage),
    status: (w.isAbsent ? 'absent' : w.isWeak ? 'weak' : 'strong') as 'strong' | 'weak' | 'absent',
    topicName: w.topicName ?? (w.chapterNumber ? `Chapter ${w.chapterNumber}` : 'Topic test'),
    subjectCode: w.subjectCode ?? '',
  }));
  const weakTopics = filteredWeekly
    .filter(w => w.isWeak && !w.isAbsent)
    .sort((a, b) => a.percentage - b.percentage)
    .slice(0, 8);

  const tooltipStyle = {
    borderRadius: '12px',
    border: isDark ? '1px solid #334155' : '1px solid #e5e7eb',
    fontSize: '12px',
    backgroundColor: isDark ? '#1e293b' : '#ffffff',
    color: isDark ? '#e2e8f0' : '#374151',
  };
  const axisColor = isDark ? '#64748b' : '#9ca3af';

  const CHALLAN_STATUS: Record<string, { label: string; color: string; bg: string }> = {
    paid: { label: 'Paid', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    unpaid: { label: 'Unpaid', color: 'text-red-700 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
    overdue: { label: 'Overdue', color: 'text-red-700 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
    partial: { label: 'Partial', color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    waived: { label: 'Waived', color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  };

  if (isLoading) return <div className="p-6 text-center text-gray-400 dark:text-slate-500 text-sm">Loading student profile...</div>;
  if (!student) return <div className="p-6 text-center text-gray-400 dark:text-slate-500 text-sm">Student not found.</div>;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4 pb-8">
      <PageHeader
        title={student.profile.name}
        subtitle={`Roll #${student.rollNo}${className ? ` · ${className}` : ''}${sectionName ? ` · ${sectionName}` : ''}`}
        actions={
          <Link to=".." relative="path" className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium">
            ← Back to Students
          </Link>
        }
      />

      {/* Identity strip */}
      <div className="card p-4 sm:p-5 flex flex-wrap items-center gap-4">
        <UserAvatar
          name={student.profile.name}
          photoUrl={student.profile.photoUrl}
          className="w-14 h-14 rounded-2xl text-lg shrink-0"
          fallbackClassName="bg-blue-100 text-blue-600"
        />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <Badge variant={STATUS_VARIANTS[student.status as keyof typeof STATUS_VARIANTS] ?? 'default'}>{student.status}</Badge>
            <span className="text-xs font-mono text-gray-400 dark:text-slate-500">Adm: {student.admissionNo}</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-slate-400">
            Guardian: {student.guardianInfo?.fatherName ?? '—'}
            {student.guardianInfo?.fatherPhone ? ` · ${student.guardianInfo.fatherPhone}` : ''}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200 dark:border-slate-700">
        {([
          { key: 'overview' as const, label: 'Overview' },
          { key: 'behaviour' as const, label: 'Behaviour' },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3.5 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'behaviour' ? (
        <>
          <div className="grid grid-cols-3 gap-3">
            <StatTile label="Merit Points" value={String(behaviourSummary?.merits ?? 0)} tone="good" />
            <StatTile label="Demerit Points" value={String(behaviourSummary?.demerits ?? 0)} tone="bad" />
            <StatTile
              label="Net Points"
              value={behaviourSummary ? (behaviourSummary.netPoints >= 0 ? `+${behaviourSummary.netPoints}` : String(behaviourSummary.netPoints)) : '0'}
              tone={behaviourSummary && behaviourSummary.netPoints < 0 ? 'bad' : 'good'}
            />
          </div>

          <div className="card p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-gray-900 dark:text-slate-100 text-sm sm:text-base">Behaviour Timeline</h2>
              {CAN_LOG_BEHAVIOUR.has(role) && (
                <button onClick={() => setShowLogModal(true)} className="btn-primary text-xs px-3 py-1.5">
                  + Log Behaviour
                </button>
              )}
            </div>

            {behaviourRecords.length === 0 ? (
              <EmptyState message="No behaviour records yet" />
            ) : (
              <div className="space-y-2.5">
                {behaviourRecords.map(r => {
                  const author = typeof r.authorId === 'object' ? r.authorId : null;
                  const retracted = r.status === 'retracted';
                  return (
                    <div key={r._id} className={`p-3 rounded-xl border ${retracted ? 'border-gray-100 dark:border-slate-700 opacity-50' : 'border-gray-100 dark:border-slate-700'} bg-gray-50 dark:bg-slate-800`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            <Badge variant={CATEGORY_BADGE[r.category]}>{CATEGORY_LABEL[r.category]}</Badge>
                            <Badge variant={r.type === 'merit' ? 'success' : 'danger'}>
                              {r.type === 'merit' ? '+' : '−'}{r.points} {r.type}
                            </Badge>
                            {retracted && <Badge variant="default">Retracted</Badge>}
                          </div>
                          <p className={`text-sm font-semibold text-gray-800 dark:text-slate-200 ${retracted ? 'line-through' : ''}`}>{r.title}</p>
                          {r.notes && <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{r.notes}</p>}
                          {retracted && r.retractionReason && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Retracted: {r.retractionReason}</p>
                          )}
                          <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1.5">
                            {formatDate(r.createdAt)}
                            {CAN_SEE_AUTHOR.has(role) && author && ` · Logged by ${author.name} (${author.role})`}
                          </p>
                        </div>
                        {!retracted && CAN_RETRACT_BEHAVIOUR.has(role) && (
                          <button
                            onClick={() => setRetractTarget(r._id)}
                            className="shrink-0 text-xs px-2 py-1 rounded border border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors"
                          >
                            Retract
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Stat tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatTile
              label="Attendance"
              value={attSummary ? `${Math.round(attSummary.percentage)}%` : '—'}
              sub={attSummary ? `${attSummary.present}/${attSummary.total} days present` : 'No data this month'}
              tone={attSummary?.isShortage ? 'bad' : 'good'}
            />
            <StatTile
              label="Last Exam"
              value={latestResult ? latestResult.grade : '—'}
              sub={latestResult ? `${Math.round(latestResult.percentage)}% · ${latestResult.isPassed ? 'Passed' : 'Failed'}` : 'No results yet'}
              tone={latestResult ? (latestResult.isPassed ? 'good' : 'bad') : 'neutral'}
            />
            <StatTile
              label="Syllabus Mastery"
              value={overallMastery && overallMastery.totalTopics > 0 ? `${overallMastery.masteryPct}%` : '—'}
              sub={overallMastery ? `${overallMastery.topicsMastered}/${overallMastery.totalTopics} topics` : 'No weekly tests yet'}
              tone={overallMastery && overallMastery.masteryPct >= 50 ? 'good' : overallMastery ? 'bad' : 'neutral'}
            />
            <StatTile
              label="Fee Due"
              value={pendingChallans.length > 0 ? formatCurrency(pendingFeeTotal) : 'All Paid'}
              sub={pendingChallans.length > 0 ? `${pendingChallans.length} challan${pendingChallans.length > 1 ? 's' : ''} pending` : 'No outstanding fees'}
              tone={pendingChallans.length > 0 ? 'warn' : 'good'}
            />
          </div>

          {/* Marks trend + weak topics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <SectionCard title="Marks Trend">
                {marksTrend.length < 2 ? (
                  <EmptyState message="Not enough exams yet to show a performance trend" />
                ) : (
                  <ResponsiveContainer width="100%" height={190}>
                    <LineChart data={marksTrend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#f1f5f9'} vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => [`${v}%`, 'Score']} labelFormatter={label => `Exam: ${label}`} />
                      <Line
                        type="monotone" dataKey="pct" name="Score" stroke="#3b82f6" strokeWidth={2.5}
                        dot={{ r: 5, fill: '#3b82f6', strokeWidth: 2, stroke: isDark ? '#0f172a' : '#ffffff' }}
                        activeDot={{ r: 7, strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </SectionCard>
            </div>

            <SectionCard title="Syllabus Mastery">
              {progressSubjects.length === 0 ? (
                <EmptyState message="No weekly topic tests recorded yet" />
              ) : (
                <div className="space-y-3">
                  {progressSubjects.map(s => {
                    const barColor = s.masteryPct >= 80 ? 'bg-emerald-500' : s.masteryPct >= 50 ? 'bg-amber-500' : 'bg-red-500';
                    return (
                      <div key={s.subjectId}>
                        <div className="flex items-center justify-between mb-1 gap-2">
                          <p className="text-xs font-medium text-gray-700 dark:text-slate-300 truncate">{s.subjectName}</p>
                          <p className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 shrink-0">{s.topicsMastered}/{s.totalTopics}</p>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2">
                          <div className={`h-2 rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${Math.min(100, s.masteryPct)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>
          </div>

          {/* Weekly topics chart */}
          <div className="card p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3 gap-2">
              <h2 className="font-bold text-gray-900 dark:text-slate-100 text-sm sm:text-base">Weekly Topics Covered</h2>
              {progressSubjects.length > 1 && (
                <select
                  value={progressSubject}
                  onChange={e => setProgressSubject(e.target.value)}
                  className="text-xs border border-gray-200 dark:border-slate-600 rounded-lg px-2 py-1 bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200 shrink-0"
                >
                  <option value="">All Subjects</option>
                  {progressSubjects.map(s => (
                    <option key={s.subjectId} value={s.subjectId}>{s.subjectName}</option>
                  ))}
                </select>
              )}
            </div>
            {weeklyChartData.length === 0 ? (
              <EmptyState message="No weekly topic tests recorded yet" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={190}>
                  <BarChart data={weeklyChartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#f1f5f9'} vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(v: unknown) => [`${v}%`, 'Score']}
                      labelFormatter={(_label, payload) => {
                        const p = payload?.[0]?.payload as typeof weeklyChartData[number] | undefined;
                        if (!p) return '';
                        return `${p.topicName}${p.subjectCode ? ` · ${p.subjectCode}` : ''}`;
                      }}
                    />
                    <Bar dataKey="pct" name="Score" radius={[4, 4, 0, 0]} maxBarSize={22}>
                      {weeklyChartData.map((entry, i) => <Cell key={i} fill={STATUS_COLOR[entry.status]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-4 mt-2 pt-2 border-t border-gray-100 dark:border-slate-700">
                  {([{ label: 'Strong', key: 'strong' as const }, { label: 'Weak', key: 'weak' as const }, { label: 'Absent', key: 'absent' as const }]).map(item => (
                    <div key={item.key} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLOR[item.key] }} />
                      <span className="text-[11px] text-gray-500 dark:text-slate-400">{item.label}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Weak topics + fees */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SectionCard title="Weak Topics to Review">
              {weakTopics.length === 0 ? (
                <EmptyState message="No weak topics right now" />
              ) : (
                <div className="space-y-2.5">
                  {weakTopics.map((w, i) => (
                    <div key={`${w.paperId}-${i}`} className="flex items-center gap-3">
                      <div className="w-28 sm:w-36 shrink-0">
                        <p className="text-xs font-medium text-gray-700 dark:text-slate-300 truncate">
                          {w.topicName ?? (w.chapterNumber ? `Chapter ${w.chapterNumber}` : 'Topic test')}
                        </p>
                        <p className="text-[10px] text-gray-400 dark:text-slate-500 truncate">{w.subjectName}</p>
                      </div>
                      <div className="flex-1 min-w-0 bg-gray-100 dark:bg-slate-700 rounded-full h-2.5">
                        <div className="h-2.5 rounded-full bg-red-500" style={{ width: `${Math.max(4, Math.round(w.percentage))}%` }} />
                      </div>
                      <span className="text-xs font-bold text-red-600 dark:text-red-400 w-10 text-right shrink-0">{Math.round(w.percentage)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Fee Status">
              {challans.length === 0 ? (
                <EmptyState message="No fee challans found" />
              ) : (
                <div className="space-y-2">
                  {challans.slice(0, 6).map(c => {
                    const sc = CHALLAN_STATUS[c.status] ?? CHALLAN_STATUS.unpaid;
                    const remaining = c.netAmount - c.paidAmount;
                    return (
                      <div key={c._id} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 dark:bg-slate-800">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">{c.month}</p>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${sc.color} ${sc.bg}`}>{sc.label}</span>
                          </div>
                          <p className="text-xs text-gray-400 dark:text-slate-500 truncate">
                            {c.status === 'paid' || c.status === 'waived' ? `Total: ${formatCurrency(c.netAmount)}` : `${formatCurrency(remaining)} due · by ${formatDate(c.dueDate)}`}
                          </p>
                        </div>
                        {c.status !== 'paid' && (
                          <p className="text-sm font-bold text-red-600 dark:text-red-400 shrink-0">{formatCurrency(c.netAmount)}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>
          </div>

          {/* Peer Perception — only renders when the org has the add-on enabled */}
          {peerSummary && (
            <SectionCard title="Peer Perception">
              {!peerSummary.visible ? (
                <p className="text-xs text-gray-400 dark:text-slate-500 text-center py-2">
                  Not enough peer responses yet ({peerSummary.responseCount}/{peerSummary.threshold}).
                </p>
              ) : (
                <div className="space-y-3">
                  {peerSummary.byCategory.map(c => (
                    <div key={c.category}>
                      <div className="flex items-center justify-between mb-1 gap-2">
                        <p className="text-xs font-medium text-gray-700 dark:text-slate-300 capitalize">{c.category}</p>
                        <p className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 shrink-0">{c.avgValue}/5</p>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2">
                        <div className="h-2 rounded-full bg-blue-500" style={{ width: `${(c.avgValue / 5) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                  <p className="text-[11px] text-gray-400 dark:text-slate-500 pt-1">
                    Based on {peerSummary.responseCount} anonymous peer response{peerSummary.responseCount === 1 ? '' : 's'} — individual answers are never shown to anyone.
                  </p>
                </div>
              )}
            </SectionCard>
          )}
        </>
      )}

      {/* Log Behaviour modal */}
      <Modal
        open={showLogModal}
        onClose={() => setShowLogModal(false)}
        title="Log Behaviour"
        subtitle={student.profile.name}
        footer={
          <>
            <button onClick={() => setShowLogModal(false)} className="text-sm px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700">
              Cancel
            </button>
            <button
              onClick={() => logBehaviour.mutate()}
              disabled={!logForm.title.trim() || logBehaviour.isPending}
              className="btn-primary text-sm px-4 py-2 disabled:opacity-50"
            >
              {logBehaviour.isPending ? 'Saving...' : 'Save Record'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1 block">Category</label>
              <select
                value={logForm.category}
                onChange={e => setLogForm(f => ({ ...f, category: e.target.value as BehaviourCategory }))}
                className="w-full text-sm border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100"
              >
                {(Object.keys(CATEGORY_LABEL) as BehaviourCategory[]).map(c => (
                  <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1 block">Type</label>
              <select
                value={logForm.type}
                onChange={e => setLogForm(f => ({ ...f, type: e.target.value as BehaviourType }))}
                className="w-full text-sm border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100"
              >
                <option value="merit">Merit (+)</option>
                <option value="demerit">Demerit (−)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1 block">Points (1–20)</label>
            <input
              type="number" min={1} max={20} value={logForm.points}
              onChange={e => setLogForm(f => ({ ...f, points: e.target.value }))}
              className="w-full text-sm border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1 block">Title</label>
            <input
              type="text" value={logForm.title} maxLength={120}
              onChange={e => setLogForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Helped a classmate during group work"
              className="w-full text-sm border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1 block">Notes (optional)</label>
            <textarea
              value={logForm.notes} maxLength={1000} rows={3}
              onChange={e => setLogForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full text-sm border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100 resize-none"
            />
          </div>

          <p className="text-[11px] text-gray-400 dark:text-slate-500">
            Your identity is recorded for accountability but is not shown to the student — only a principal or group admin can see who logged this.
          </p>
        </div>
      </Modal>

      {/* Retract confirmation modal */}
      <Modal
        open={!!retractTarget}
        onClose={() => { setRetractTarget(null); setRetractReason(''); }}
        title="Retract Behaviour Record"
        size="sm"
        footer={
          <>
            <button onClick={() => { setRetractTarget(null); setRetractReason(''); }} className="text-sm px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700">
              Cancel
            </button>
            <button
              onClick={() => retractBehaviour.mutate()}
              disabled={!retractReason.trim() || retractBehaviour.isPending}
              className="text-sm px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {retractBehaviour.isPending ? 'Retracting...' : 'Retract'}
            </button>
          </>
        }
      >
        <p className="text-sm text-gray-600 dark:text-slate-400 mb-3">
          The record stays in the audit trail — it's marked retracted, not deleted, and excluded from point totals.
        </p>
        <label className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1 block">Reason (required)</label>
        <textarea
          value={retractReason} maxLength={500} rows={3}
          onChange={e => setRetractReason(e.target.value)}
          placeholder="Why is this record being retracted?"
          className="w-full text-sm border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100 resize-none"
        />
      </Modal>
    </div>
  );
}
