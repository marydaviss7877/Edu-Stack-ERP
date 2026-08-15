import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { studentService } from '../../services/studentService';
import { attendanceService } from '../../services/attendanceService';
import { feeService, type ChallanDoc } from '../../services/feeService';
import { examService, type ResultDoc } from '../../services/examService';
import { assignmentService, type AssignmentDoc } from '../../services/assignmentService';
import { timetableService, type TimetableDoc } from '../../services/timetableService';
import { notificationService } from '../../services/notificationService';
import { weeklyPaperService } from '../../services/weeklyPaperService';
import { formatCurrency, formatDate, getInitials } from '../../lib/utils';

const STATUS_COLOR: Record<'strong' | 'weak' | 'absent', string> = {
  strong: '#10b981',
  weak: '#ef4444',
  absent: '#94a3b8',
};

const today = new Date();
const todayDOW = today.getDay();
const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
const currentYear = String(today.getFullYear());
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function isCurrentPeriod(startTime: string, endTime: string): boolean {
  const now = new Date();
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return nowMin >= sh * 60 + sm && nowMin < eh * 60 + em;
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0)) / 86_400_000);
}

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  gradient: string;
  icon: React.ReactNode;
  to?: string;
}

function StatCard({ label, value, sub, gradient, icon, to }: StatCardProps) {
  const inner = (
    <div className={`relative rounded-2xl p-4 sm:p-5 text-white shadow-md overflow-hidden ${gradient}`}>
      <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/10 pointer-events-none" />
      <div className="absolute -right-6 bottom-0 w-16 h-16 rounded-full bg-white/5 pointer-events-none" />
      <div className="relative">
        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center mb-3">
          {icon}
        </div>
        <p className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-none">{value}</p>
        <p className="text-xs sm:text-sm text-white/80 font-medium mt-1.5 leading-snug">{label}</p>
        {sub && <p className="text-[11px] text-white/55 mt-0.5 leading-tight">{sub}</p>}
      </div>
    </div>
  );
  return to ? <Link to={to} className="block hover:opacity-90 transition-opacity">{inner}</Link> : inner;
}

interface SectionCardProps {
  title: string;
  children: React.ReactNode;
  to?: string;
  linkLabel?: string;
  className?: string;
}

function SectionCard({ title, children, to, linkLabel = 'View All', className = '' }: SectionCardProps) {
  return (
    <div className={`card p-4 sm:p-5 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-gray-900 dark:text-slate-100 text-sm sm:text-base">{title}</h2>
        {to && (
          <Link to={to} className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium shrink-0">
            {linkLabel} →
          </Link>
        )}
      </div>
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

export default function StudentDashboard() {
  const { isDark } = useThemeStore();
  const user = useAuthStore(s => s.user);
  const base = '/student';

  /* ─── Data fetching ─── */

  const { data: me } = useQuery({
    queryKey: ['student-me'],
    queryFn: studentService.getMe,
  });

  const classId = me?.classId
    ? (typeof me.classId === 'string' ? me.classId : me.classId._id)
    : undefined;
  const sectionId = me?.sectionId
    ? (typeof me.sectionId === 'string' ? me.sectionId : me.sectionId._id)
    : undefined;
  const className = me?.classId && typeof me.classId !== 'string' ? me.classId.name : '';
  const sectionName = me?.sectionId && typeof me.sectionId !== 'string' ? me.sectionId.name : '';

  const { data: attendance } = useQuery({
    queryKey: ['my-attendance', currentMonth, currentYear],
    queryFn: () => attendanceService.getMyRecords({ month: currentMonth, year: currentYear }),
  });

  const { data: challansResp } = useQuery({
    queryKey: ['student-challans'],
    queryFn: () => feeService.listChallans(),
    enabled: !!me,
  });
  const challans: ChallanDoc[] = challansResp?.data ?? [];
  const pendingChallans = challans.filter(c => ['unpaid', 'overdue', 'partial'].includes(c.status));

  const { data: results = [] } = useQuery<ResultDoc[]>({
    queryKey: ['student-results'],
    queryFn: () => examService.getResults(),
    enabled: !!me,
  });

  const { data: exams = [] } = useQuery({
    queryKey: ['exams-list'],
    queryFn: () => examService.list(),
  });

  const { data: assignments = [] } = useQuery<AssignmentDoc[]>({
    queryKey: ['student-assignments'],
    queryFn: () => assignmentService.list(),
  });

  const { data: timetables = [] } = useQuery<TimetableDoc[]>({
    queryKey: ['timetable', classId, sectionId],
    queryFn: () => timetableService.get({ classId: classId!, sectionId: sectionId! }),
    enabled: !!classId && !!sectionId,
  });

  const { data: notifCount = 0 } = useQuery({
    queryKey: ['notif-count'],
    queryFn: notificationService.getUnreadCount,
  });

  const [progressSubject, setProgressSubject] = useState('');

  const { data: progress } = useQuery({
    queryKey: ['student-progress'],
    queryFn: () => weeklyPaperService.getMyProgress(),
    enabled: !!me,
  });

  /* ─── Derived data ─── */

  const activeTimetable = timetables[0] as TimetableDoc | undefined;
  const todaySlots = (activeTimetable?.slots ?? [])
    .filter(s => s.dayOfWeek === todayDOW)
    .sort((a, b) => a.periodNo - b.periodNo);

  const upcomingExams = exams
    .filter(e => e.isPublished && new Date(e.startDate) >= today)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 5);

  const todayStr = today.toISOString().split('T')[0];
  const pendingAssignments = assignments
    .filter(a => a.isActive && a.dueDate >= todayStr)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5);

  const overdueAssignments = assignments
    .filter(a => a.isActive && a.dueDate < todayStr)
    .sort((a, b) => b.dueDate.localeCompare(a.dueDate))
    .slice(0, 3);

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
  const filteredWeekly = (progress?.weekly ?? []).filter(
    w => !progressSubject || w.subjectId === progressSubject
  );

  const weeklyChartData = filteredWeekly.slice(-12).map(w => ({
    name: new Date(w.scheduledDate).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' }),
    pct: Math.round(w.percentage),
    status: (w.isAbsent ? 'absent' : w.isWeak ? 'weak' : 'strong') as 'strong' | 'weak' | 'absent',
    topicName: w.topicName ?? (w.chapterNumber ? `Chapter ${w.chapterNumber}` : 'Topic test'),
    subjectName: w.subjectName ?? '',
    subjectCode: w.subjectCode ?? '',
  }));

  const weakTopics = filteredWeekly
    .filter(w => w.isWeak && !w.isAbsent)
    .sort((a, b) => a.percentage - b.percentage)
    .slice(0, 8);

  const attStats = attendance?.stats;
  const attPct = attStats?.percentage ?? 0;
  const isShortage = attStats?.isShortage ?? false;
  const threshold = attStats?.threshold ?? 75;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const tooltipStyle = {
    borderRadius: '12px',
    border: isDark ? '1px solid #334155' : '1px solid #e5e7eb',
    fontSize: '12px',
    backgroundColor: isDark ? '#1e293b' : '#ffffff',
    color: isDark ? '#e2e8f0' : '#374151',
  };
  const axisColor = isDark ? '#64748b' : '#9ca3af';

  const CHALLAN_STATUS: Record<string, { label: string; color: string; bg: string }> = {
    paid:    { label: 'Paid',    color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    unpaid:  { label: 'Unpaid',  color: 'text-red-700 dark:text-red-400',         bg: 'bg-red-50 dark:bg-red-900/20' },
    overdue: { label: 'Overdue', color: 'text-red-700 dark:text-red-400',         bg: 'bg-red-50 dark:bg-red-900/20' },
    partial: { label: 'Partial', color: 'text-amber-700 dark:text-amber-400',     bg: 'bg-amber-50 dark:bg-amber-900/20' },
    waived:  { label: 'Waived',  color: 'text-blue-700 dark:text-blue-400',       bg: 'bg-blue-50 dark:bg-blue-900/20' },
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4 pb-8">

      {/* ══════════════════════════════════════
          HEADER — profile + greeting
      ══════════════════════════════════════ */}
      <div className="flex items-start gap-3 sm:gap-4">
        {/* Avatar */}
        {me?.profile?.photoUrl ? (
          <img
            src={me.profile.photoUrl}
            alt={me.profile.name}
            className="shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover shadow-md"
          />
        ) : (
          <div className="shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-linear-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-lg font-bold shadow-md">
            {getInitials(user?.name ?? '?')}
          </div>
        )}

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400">{greeting()}</p>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-slate-100 tracking-tight truncate">
            {user?.name?.split(' ')[0] ?? user?.name}
          </h1>
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-0.5">
            {me?.rollNo && (
              <span className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold px-2 py-0.5 rounded-full">
                Roll #{me.rollNo}
              </span>
            )}
            {className && (
              <span className="text-xs bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 font-medium px-2 py-0.5 rounded-full">
                {className}{sectionName ? ` · ${sectionName}` : ''}
              </span>
            )}
            <span className="text-xs text-gray-400 dark:text-slate-500">
              {today.toLocaleDateString('en-PK', { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Notification bell */}
        {notifCount > 0 && (
          <Link
            to={`${base}/notifications`}
            className="shrink-0 relative flex items-center justify-center w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute -top-1 -right-1 min-w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
              {notifCount > 9 ? '9+' : notifCount}
            </span>
          </Link>
        )}
      </div>

      {/* ══════════════════════════════════════
          STAT CARDS (2×2 on mobile, 4 on lg)
      ══════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Attendance"
          value={attStats ? `${Math.round(attPct)}%` : '—'}
          sub={isShortage ? `Below ${threshold}% threshold!` : `${attStats?.present ?? 0} days present`}
          gradient={isShortage
            ? 'bg-linear-to-br from-red-500 to-red-700'
            : 'bg-linear-to-br from-emerald-500 to-emerald-700'}
          to={`${base}/attendance`}
          icon={
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          }
        />

        <StatCard
          label="Last Exam"
          value={latestResult ? latestResult.grade : '—'}
          sub={latestResult
            ? `${Math.round(latestResult.percentage)}% · ${latestResult.isPassed ? 'Passed' : 'Failed'}`
            : 'No results yet'}
          gradient="bg-linear-to-br from-blue-500 to-blue-700"
          to={`${base}/exams`}
          icon={
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />

        <StatCard
          label="Tasks Due"
          value={pendingAssignments.length + overdueAssignments.length}
          sub={overdueAssignments.length > 0
            ? `${overdueAssignments.length} overdue!`
            : pendingAssignments.length > 0 ? 'Assignments pending' : 'All caught up'}
          gradient={overdueAssignments.length > 0
            ? 'bg-linear-to-br from-orange-500 to-orange-700'
            : pendingAssignments.length > 0
              ? 'bg-linear-to-br from-violet-500 to-violet-700'
              : 'bg-linear-to-br from-slate-500 to-slate-600'}
          to={`${base}/assignments`}
          icon={
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          }
        />

        <StatCard
          label="Fee Due"
          value={pendingChallans.length > 0 ? formatCurrency(pendingFeeTotal) : 'All Paid'}
          sub={pendingChallans.length > 0
            ? `${pendingChallans.length} challan${pendingChallans.length > 1 ? 's' : ''} pending`
            : 'No outstanding fees'}
          gradient={pendingChallans.length > 0
            ? 'bg-linear-to-br from-amber-500 to-orange-600'
            : 'bg-linear-to-br from-slate-500 to-slate-600'}
          to={`${base}/fees`}
          icon={
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />
      </div>

      {/* ══════════════════════════════════════
          ROW 1 — Today's Timetable + Attendance
      ══════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Today's Timetable — lg: 2/3 */}
        <div className="lg:col-span-2">
          <SectionCard
            title={`Today's Classes — ${DAYS[todayDOW]}`}
            to={`${base}/timetable`}
          >
            {!activeTimetable ? (
              <EmptyState message="Timetable not set up yet" />
            ) : todaySlots.length === 0 ? (
              <EmptyState message="No classes scheduled today — enjoy your day!" />
            ) : (
              <div className="space-y-2">
                {todaySlots.map(slot => {
                  const timing = (activeTimetable.periodTimings ?? []).find(p => p.periodNo === slot.periodNo);
                  const subject = typeof slot.subjectId !== 'string' ? slot.subjectId as { _id: string; name: string; code: string } : null;
                  const teacher = typeof slot.teacherId !== 'string' ? slot.teacherId as { _id: string; name: string } : null;
                  const active = timing ? isCurrentPeriod(timing.startTime, timing.endTime) : false;
                  return (
                    <div
                      key={`${slot.dayOfWeek}-${slot.periodNo}`}
                      className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                        active
                          ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/40'
                          : 'bg-gray-50 dark:bg-slate-800'
                      }`}
                    >
                      {/* Time */}
                      <div className="shrink-0 w-16 text-center">
                        {timing ? (
                          <>
                            <p className={`text-xs font-bold ${active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-slate-400'}`}>
                              {timing.startTime}
                            </p>
                            <p className="text-[10px] text-gray-400 dark:text-slate-500">{timing.endTime}</p>
                          </>
                        ) : (
                          <p className="text-xs text-gray-400 dark:text-slate-500">P{slot.periodNo}</p>
                        )}
                      </div>

                      {/* Indicator bar */}
                      <div className={`shrink-0 w-1 h-10 rounded-full ${active ? 'bg-blue-500' : 'bg-gray-200 dark:bg-slate-700'}`} />

                      {/* Subject + teacher */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${active ? 'text-blue-700 dark:text-blue-300' : 'text-gray-800 dark:text-slate-200'}`}>
                          {subject?.name ?? 'Unknown Subject'}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-slate-500 truncate">
                          {teacher?.name ?? 'TBA'}{slot.roomNo ? ` · Room ${slot.roomNo}` : ''}
                        </p>
                      </div>

                      {/* NOW badge */}
                      {active && (
                        <span className="shrink-0 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 px-2 py-1 rounded-full">
                          NOW
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Attendance Summary — lg: 1/3 */}
        <SectionCard title={`Attendance — ${new Date(today.getFullYear(), today.getMonth(), 1).toLocaleString('en-PK', { month: 'long' })}`} to={`${base}/attendance`}>
          {!attStats ? (
            <EmptyState message="No attendance data for this month" />
          ) : (
            <div>
              {/* Big percentage + shortage warning */}
              <div className="flex items-center justify-between mb-3">
                <p className={`text-4xl font-extrabold tracking-tight ${isShortage ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {Math.round(attPct)}%
                </p>
                {isShortage ? (
                  <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-2.5 py-1.5 rounded-xl">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="text-xs font-bold">Shortage</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 px-2.5 py-1.5 rounded-xl">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs font-bold">Good</span>
                  </div>
                )}
              </div>

              {/* Progress bar */}
              <div className="relative w-full bg-gray-100 dark:bg-slate-700 rounded-full h-3 mb-1.5">
                <div
                  className={`h-3 rounded-full transition-all duration-700 ${isShortage ? 'bg-red-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(100, attPct)}%` }}
                />
                {/* threshold marker */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-gray-400 dark:bg-slate-500 rounded-full"
                  style={{ left: `${threshold}%` }}
                  title={`Required: ${threshold}%`}
                />
              </div>
              <p className="text-[11px] text-gray-400 dark:text-slate-500 mb-4">
                Required minimum: {threshold}%
              </p>

              {/* 4-stat grid */}
              <div className="grid grid-cols-4 gap-1.5 text-center">
                {[
                  { label: 'Present', value: attStats.present, color: 'text-emerald-600 dark:text-emerald-400' },
                  { label: 'Absent',  value: attStats.absent,  color: 'text-red-500 dark:text-red-400' },
                  { label: 'Late',    value: attStats.late,    color: 'text-amber-500 dark:text-amber-400' },
                  { label: 'Excused', value: attStats.excused, color: 'text-blue-500 dark:text-blue-400' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-gray-50 dark:bg-slate-800 rounded-xl py-2 px-1">
                    <p className={`text-base font-bold ${color}`}>{value}</p>
                    <p className="text-[10px] text-gray-400 dark:text-slate-500 leading-tight">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      {/* ══════════════════════════════════════
          ROW 2 — Marks Trend + Upcoming Exams
      ══════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Marks Trend Chart — lg: 2/3 */}
        <div className="lg:col-span-2">
          <SectionCard title="Marks Trend" to={`${base}/exams`}>
            {marksTrend.length < 2 ? (
              <EmptyState message="Complete at least 2 exams to see your performance trend" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={190}>
                  <LineChart data={marksTrend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#f1f5f9'} vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: axisColor }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 10, fill: axisColor }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={v => `${v}%`}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(v: unknown) => [`${v}%`, 'Score']}
                      labelFormatter={label => `Exam: ${label}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="pct"
                      name="Score"
                      stroke="#3b82f6"
                      strokeWidth={2.5}
                      dot={{ r: 5, fill: '#3b82f6', strokeWidth: 2, stroke: isDark ? '#0f172a' : '#ffffff' }}
                      activeDot={{ r: 7, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>

                {/* Latest exam subject breakdown */}
                {latestResult && latestResult.subjectMarks.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700">
                    <p className="text-[11px] font-medium text-gray-400 dark:text-slate-500 mb-2 uppercase tracking-wide">
                      Latest exam — subject breakdown
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {latestResult.subjectMarks.slice(0, 6).map((sm, i) => {
                        const subName = typeof sm.subjectId !== 'string'
                          ? (sm.subjectId as { _id: string; name: string; code: string }).name
                          : `Subject ${i + 1}`;
                        const pct = sm.totalMarks > 0 ? Math.round((sm.marksObtained / sm.totalMarks) * 100) : 0;
                        return (
                          <div key={i} className="bg-gray-50 dark:bg-slate-800 rounded-xl p-2">
                            <div className="flex items-center justify-between mb-1.5">
                              <p className="text-[11px] font-medium text-gray-600 dark:text-slate-400 truncate">{subName}</p>
                              <span className={`text-[10px] font-bold ml-1 shrink-0 ${pct >= 50 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                                {sm.isAbsent ? 'Ab.' : `${pct}%`}
                              </span>
                            </div>
                            {!sm.isAbsent && (
                              <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-1">
                                <div
                                  className={`h-1 rounded-full ${pct >= 50 ? 'bg-emerald-500' : 'bg-red-400'}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </SectionCard>
        </div>

        {/* Upcoming Exams — lg: 1/3 */}
        <SectionCard title="Upcoming Exams" to={`${base}/exams`}>
          {upcomingExams.length === 0 ? (
            <EmptyState message="No upcoming exams scheduled" />
          ) : (
            <div className="space-y-2">
              {upcomingExams.map(exam => {
                const d = daysUntil(exam.startDate);
                const urgent = d <= 3;
                return (
                  <div key={exam._id} className={`flex items-center gap-3 p-2.5 rounded-xl ${urgent ? 'bg-amber-50 dark:bg-amber-900/10' : 'bg-gray-50 dark:bg-slate-800'}`}>
                    {/* Date badge */}
                    <div className={`shrink-0 w-10 h-10 rounded-xl flex flex-col items-center justify-center ${urgent ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
                      <p className={`text-xs font-bold leading-none ${urgent ? 'text-amber-700 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'}`}>
                        {new Date(exam.startDate).getDate()}
                      </p>
                      <p className={`text-[9px] leading-none mt-0.5 ${urgent ? 'text-amber-500 dark:text-amber-500' : 'text-blue-400 dark:text-blue-500'}`}>
                        {new Date(exam.startDate).toLocaleString('en-PK', { month: 'short' })}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-slate-200 truncate">{exam.name}</p>
                      <p className={`text-xs ${urgent ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-gray-400 dark:text-slate-500'}`}>
                        {d === 0 ? 'Today!' : d === 1 ? 'Tomorrow' : `In ${d} days`}
                      </p>
                    </div>
                    {urgent && <span className="shrink-0 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>

      {/* ══════════════════════════════════════
          ROW 3 — Assignments + Fee Challans
      ══════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Pending Assignments */}
        <SectionCard title="Assignments Due" to={`${base}/assignments`}>
          {pendingAssignments.length === 0 && overdueAssignments.length === 0 ? (
            <EmptyState message="No pending assignments — great job!" />
          ) : (
            <div className="space-y-2">
              {[...overdueAssignments, ...pendingAssignments].map(asgn => {
                const overdue = asgn.dueDate < todayStr;
                const d = daysUntil(asgn.dueDate);
                const subName = typeof asgn.subjectId !== 'string'
                  ? (asgn.subjectId as { _id: string; name: string; code: string }).name
                  : '';
                return (
                  <div key={asgn._id} className={`flex items-center gap-3 p-2.5 rounded-xl ${overdue ? 'bg-red-50 dark:bg-red-900/10' : 'bg-gray-50 dark:bg-slate-800'}`}>
                    <div className={`shrink-0 w-1 h-10 rounded-full ${overdue ? 'bg-red-400' : d <= 1 ? 'bg-amber-400' : 'bg-blue-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-slate-200 truncate">{asgn.title}</p>
                      <p className="text-xs text-gray-400 dark:text-slate-500 truncate">
                        {subName && `${subName} · `}
                        {overdue
                          ? `Overdue — was due ${formatDate(asgn.dueDate)}`
                          : d === 0 ? 'Due today!'
                          : d === 1 ? 'Due tomorrow'
                          : `Due ${formatDate(asgn.dueDate)}`}
                      </p>
                    </div>
                    {overdue && (
                      <span className="shrink-0 text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full">
                        Late
                      </span>
                    )}
                    {!overdue && d <= 1 && (
                      <span className="shrink-0 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                        Soon
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* Fee Challans */}
        <SectionCard title="Fee Status" to={`${base}/fees`}>
          {challans.length === 0 ? (
            <EmptyState message="No fee challans found" />
          ) : (
            <div className="space-y-2">
              {challans.slice(0, 6).map(c => {
                const sc = CHALLAN_STATUS[c.status] ?? CHALLAN_STATUS.unpaid;
                const remaining = c.netAmount - c.paidAmount;
                return (
                  <div key={c._id} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 dark:bg-slate-800">
                    {/* Month label */}
                    <div className="shrink-0 w-10 h-10 rounded-xl bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
                      <p className="text-[10px] font-bold text-gray-500 dark:text-slate-400 text-center leading-tight">
                        {c.month.replace('-', '\n')}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">{c.month}</p>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${sc.color} ${sc.bg}`}>
                          {sc.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 dark:text-slate-500 truncate">
                        {c.status === 'paid' || c.status === 'waived'
                          ? `Total: ${formatCurrency(c.netAmount)}`
                          : `${formatCurrency(remaining)} due · by ${formatDate(c.dueDate)}`}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      {c.status === 'paid' ? (
                        <svg className="w-5 h-5 text-emerald-500 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        <p className="text-sm font-bold text-red-600 dark:text-red-400">{formatCurrency(c.netAmount)}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>

      {/* ══════════════════════════════════════
          ROW 4 — Learning Coverage (weekly topics + weak-topic tracking)
      ══════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Syllabus Mastery — lg: 1/3 */}
        <div className="card p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900 dark:text-slate-100 text-sm sm:text-base">Syllabus Mastery</h2>
            {overallMastery && overallMastery.totalTopics > 0 && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${
                overallMastery.masteryPct >= 80
                  ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                  : overallMastery.masteryPct >= 50
                  ? 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20'
                  : 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
              }`}>
                {overallMastery.masteryPct}% overall
              </span>
            )}
          </div>
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
                      <p className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 shrink-0">
                        {s.topicsMastered}/{s.totalTopics} topics
                      </p>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-700 ${barColor}`}
                        style={{ width: `${Math.min(100, s.masteryPct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Weekly Topics Covered — lg: 2/3 */}
        <div className="lg:col-span-2 card p-4 sm:p-5">
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
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: axisColor }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => `${v}%`}
                  />
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
                    {weeklyChartData.map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLOR[entry.status]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Status legend */}
              <div className="flex items-center gap-4 mt-2 pt-2 border-t border-gray-100 dark:border-slate-700">
                {([
                  { label: 'Strong', key: 'strong' as const },
                  { label: 'Weak', key: 'weak' as const },
                  { label: 'Absent', key: 'absent' as const },
                ]).map(item => (
                  <div key={item.key} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLOR[item.key] }} />
                    <span className="text-[11px] text-gray-500 dark:text-slate-400">{item.label}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Weak Topics to Review — full width */}
      <div className="card p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-900 dark:text-slate-100 text-sm sm:text-base">Weak Topics to Review</h2>
          {weakTopics.length > 0 && (
            <span className="text-xs text-gray-400 dark:text-slate-500">{weakTopics.length} flagged</span>
          )}
        </div>
        {weakTopics.length === 0 ? (
          <EmptyState message="No weak topics right now — great work!" />
        ) : (
          <div className="space-y-2.5">
            {weakTopics.map((w, i) => (
              <div key={`${w.paperId}-${i}`} className="flex items-center gap-3">
                <div className="w-32 sm:w-48 shrink-0">
                  <p className="text-xs font-medium text-gray-700 dark:text-slate-300 truncate">
                    {w.topicName ?? (w.chapterNumber ? `Chapter ${w.chapterNumber}` : 'Topic test')}
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-slate-500 truncate">
                    {w.subjectName}{w.chapterNumber ? ` · Ch.${w.chapterNumber}` : ''}
                  </p>
                </div>
                <div className="flex-1 min-w-0 bg-gray-100 dark:bg-slate-700 rounded-full h-2.5">
                  <div className="h-2.5 rounded-full bg-red-500" style={{ width: `${Math.max(4, Math.round(w.percentage))}%` }} />
                </div>
                <span className="text-xs font-bold text-red-600 dark:text-red-400 w-10 text-right shrink-0">
                  {Math.round(w.percentage)}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
