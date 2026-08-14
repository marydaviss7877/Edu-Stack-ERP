import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { timetableService, type TimetableDoc, type TimetableSlot } from '../../services/timetableService';
import { assignmentService } from '../../services/assignmentService';
import { examService } from '../../services/examService';
import { studentService } from '../../services/studentService';
import { notificationService } from '../../services/notificationService';
import { academicService } from '../../services/academicService';
import { formatDate } from '../../lib/utils';
import UserAvatar from '../../components/ui/UserAvatar';

const today = new Date();
const todayDOW = today.getDay();
const todayStr = today.toISOString().split('T')[0];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function isCurrentPeriod(startTime: string, endTime: string): boolean {
  const now = new Date();
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return nowMin >= sh * 60 + sm && nowMin < eh * 60 + em;
}

function daysUntil(dateStr: string) {
  return Math.ceil(
    (new Date(dateStr).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86_400_000
  );
}

/* ── Shared sub-components ── */

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
  return to
    ? <Link to={to} className="block hover:opacity-90 transition-opacity">{inner}</Link>
    : inner;
}

function SectionCard({
  title, children, to, linkLabel = 'View All',
}: { title: string; children: React.ReactNode; to?: string; linkLabel?: string }) {
  return (
    <div className="card p-4 sm:p-5">
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

/* ── Enriched slot type for teacher ── */
interface TeacherSlot extends TimetableSlot {
  classId: string;
  className: string;
  sectionId: string;
  sectionName: string;
  periodTimings: TimetableDoc['periodTimings'];
}

interface ClassSection {
  classId: string;
  className: string;
  sectionId: string;
  sectionName: string;
  subjects: string[];
  studentCount: number;
}

/* ══════════════════════════════════════════════
   TEACHER DASHBOARD
══════════════════════════════════════════════ */
export default function TeacherDashboard() {
  const { isDark } = useThemeStore();
  const user = useAuthStore(s => s.user);
  const base = '/teacher';

  /* ─── Academic year ─── */
  const { data: years = [] } = useQuery({
    queryKey: ['years'],
    queryFn: academicService.getYears,
  });
  const currentYear = years.find(y => y.isCurrent) ?? years[0];

  /* ─── All timetables for branch (filter by teacher client-side) ─── */
  const { data: allTimetables = [] } = useQuery<TimetableDoc[]>({
    queryKey: ['all-timetables'],
    queryFn: () => timetableService.get({}),
  });

  /* ─── Derive teacher-specific timetable data ─── */
  const { todaySlots, classSections } = useMemo<{
    todaySlots: TeacherSlot[];
    classSections: Omit<ClassSection, 'studentCount'>[];
  }>(() => {
    const mySlots: TeacherSlot[] = allTimetables.flatMap(tt => {
      const classId = typeof tt.classId === 'string' ? tt.classId : (tt.classId as { _id: string; name: string })._id;
      const className = typeof tt.classId === 'string' ? '' : (tt.classId as { _id: string; name: string }).name;
      const sectionId = typeof tt.sectionId === 'string' ? tt.sectionId : (tt.sectionId as { _id: string; name: string })._id;
      const sectionName = typeof tt.sectionId === 'string' ? '' : (tt.sectionId as { _id: string; name: string }).name;

      return tt.slots
        .filter(s => {
          const tid = typeof s.teacherId === 'string' ? s.teacherId : (s.teacherId as { _id: string })._id;
          return tid === user?.id;
        })
        .map(s => ({ ...s, classId, className, sectionId, sectionName, periodTimings: tt.periodTimings }));
    });

    const tdSlots = mySlots
      .filter(s => s.dayOfWeek === todayDOW)
      .sort((a, b) => a.periodNo - b.periodNo);

    const csMap = new Map<string, Omit<ClassSection, 'studentCount'>>();
    mySlots.forEach(s => {
      const key = `${s.classId}__${s.sectionId}`;
      if (!csMap.has(key)) {
        csMap.set(key, { classId: s.classId, className: s.className, sectionId: s.sectionId, sectionName: s.sectionName, subjects: [] });
      }
      const subName = typeof s.subjectId !== 'string' ? (s.subjectId as { _id: string; name: string; code: string }).name : '';
      const entry = csMap.get(key)!;
      if (subName && !entry.subjects.includes(subName)) entry.subjects.push(subName);
    });

    return { todaySlots: tdSlots, classSections: [...csMap.values()] };
  }, [allTimetables, user?.id]);

  /* ─── Students (for counts) ─── */
  const { data: studentsResp } = useQuery({
    queryKey: ['students-all', currentYear?._id],
    queryFn: () => studentService.list({ academicYearId: currentYear!._id, status: 'active' }),
    enabled: !!currentYear,
  });
  const allStudents = studentsResp?.data ?? [];

  const classSectionsWithCount: ClassSection[] = useMemo(() =>
    classSections.map(cs => ({
      ...cs,
      studentCount: allStudents.filter(s => {
        const sid = typeof s.sectionId === 'string' ? s.sectionId : (s.sectionId as { _id: string })._id;
        return sid === cs.sectionId;
      }).length,
    })),
    [classSections, allStudents]
  );

  const totalStudents = useMemo(() => {
    const sectionIds = new Set(classSections.map(cs => cs.sectionId));
    return allStudents.filter(s => {
      const sid = typeof s.sectionId === 'string' ? s.sectionId : (s.sectionId as { _id: string })._id;
      return sectionIds.has(sid);
    }).length;
  }, [classSections, allStudents]);

  /* ─── Assignments ─── */
  const { data: assignments = [] } = useQuery({
    queryKey: ['teacher-assignments'],
    queryFn: () => assignmentService.list(),
  });
  const pendingGrading = assignments.filter(a => a.isActive && a.dueDate < todayStr);
  const upcoming = assignments
    .filter(a => a.isActive && a.dueDate >= todayStr)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5);

  /* ─── Exams ─── */
  const { data: exams = [] } = useQuery({
    queryKey: ['exams-list'],
    queryFn: () => examService.list(),
  });
  const upcomingExams = exams
    .filter(e => e.isPublished && new Date(e.startDate) >= today)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 4);

  /* ─── Marks trend (class avg per exam for first section) ─── */
  const firstSection = classSections[0];
  const { data: results = [] } = useQuery({
    queryKey: ['section-results', firstSection?.sectionId],
    queryFn: () => examService.getResults({ sectionId: firstSection!.sectionId }),
    enabled: !!firstSection,
  });

  const marksTrend = useMemo(() => {
    const map = new Map<string, number[]>();
    results.forEach(r => {
      if (!map.has(r.examId)) map.set(r.examId, []);
      map.get(r.examId)!.push(r.percentage);
    });
    return [...map.entries()]
      .map(([examId, pcts]) => {
        const exam = exams.find(e => e._id === examId);
        return {
          name: exam?.name?.replace(/exam/i, '').trim().slice(0, 10) || exam?.name?.slice(0, 10) || 'Exam',
          avg: Math.round(pcts.reduce((s, p) => s + p, 0) / pcts.length),
          date: exam?.startDate ?? '',
        };
      })
      .filter(t => t.date)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-8);
  }, [results, exams]);

  /* ─── Notifications ─── */
  const { data: notifCount = 0 } = useQuery({
    queryKey: ['notif-count'],
    queryFn: notificationService.getUnreadCount,
  });

  /* ─── Derived ─── */
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

  const QUICK_LINKS = [
    {
      label: 'Enter Exam Marks',
      desc: 'Record student results',
      to: `${base}/exams`,
      gradient: 'bg-linear-to-br from-blue-500 to-blue-700',
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    },
    {
      label: 'Create Assignment',
      desc: 'New task for students',
      to: `${base}/assignments`,
      gradient: 'bg-linear-to-br from-violet-500 to-violet-700',
      icon: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z',
    },
    {
      label: 'My Timetable',
      desc: 'Weekly teaching schedule',
      to: `${base}/timetable`,
      gradient: 'bg-linear-to-br from-teal-500 to-teal-700',
      icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    },
  ];

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4 pb-8">

      {/* ══ HEADER ══ */}
      <div className="flex items-start gap-3 sm:gap-4">
        <UserAvatar
          name={user?.name ?? '?'}
          photoUrl={user?.profilePhotoUrl}
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl text-lg shadow-md"
          fallbackClassName="bg-linear-to-br from-blue-500 to-blue-700 text-white"
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400">{greeting()}, Teacher</p>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-slate-100 tracking-tight truncate">
            {user?.name}
          </h1>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
            {today.toLocaleDateString('en-PK', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        {notifCount > 0 && (
          <Link
            to={`${base}/notifications`}
            className="shrink-0 relative flex items-center justify-center w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
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

      {/* ══ STAT CARDS ══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Students I Teach"
          value={totalStudents || '—'}
          sub={classSections.length > 0 ? `Across ${classSections.length} section${classSections.length > 1 ? 's' : ''}` : 'No sections assigned'}
          gradient="bg-linear-to-br from-blue-500 to-blue-700"
          icon={
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
        <StatCard
          label="Pending to Grade"
          value={pendingGrading.length}
          sub={pendingGrading.length > 0 ? 'Assignments past due date' : 'Nothing pending'}
          gradient={pendingGrading.length > 0
            ? 'bg-linear-to-br from-orange-500 to-orange-700'
            : 'bg-linear-to-br from-slate-500 to-slate-600'}
          to={`${base}/assignments`}
          icon={
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          }
        />
        <StatCard
          label="Upcoming Exams"
          value={upcomingExams.length}
          sub={upcomingExams[0] ? `Next: ${upcomingExams[0].name.slice(0, 16)}` : 'None scheduled'}
          gradient={upcomingExams.length > 0
            ? 'bg-linear-to-br from-violet-500 to-violet-700'
            : 'bg-linear-to-br from-slate-500 to-slate-600'}
          to={`${base}/exams`}
          icon={
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />
        <StatCard
          label="Notifications"
          value={notifCount}
          sub={notifCount > 0 ? 'Unread messages' : 'All caught up'}
          gradient={notifCount > 0
            ? 'bg-linear-to-br from-red-500 to-red-700'
            : 'bg-linear-to-br from-emerald-500 to-emerald-700'}
          to={`${base}/notifications`}
          icon={
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          }
        />
      </div>

      {/* ══ ROW 1 — Today's Schedule + My Classes ══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Today's Schedule — lg:2/3 */}
        <div className="lg:col-span-2">
          <SectionCard title={`Today's Classes — ${DAYS[todayDOW]}`} to={`${base}/timetable`}>
            {todaySlots.length === 0 ? (
              <EmptyState message={classSections.length === 0 ? 'No timetable assigned yet' : 'No classes scheduled today'} />
            ) : (
              <div className="space-y-2">
                {todaySlots.map(slot => {
                  const timing = (slot.periodTimings ?? []).find(p => p.periodNo === slot.periodNo);
                  const subject = typeof slot.subjectId !== 'string'
                    ? slot.subjectId as { _id: string; name: string; code: string }
                    : null;
                  const active = timing ? isCurrentPeriod(timing.startTime, timing.endTime) : false;

                  return (
                    <div
                      key={`${slot.sectionId}-${slot.dayOfWeek}-${slot.periodNo}`}
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
                          <p className="text-xs text-gray-400">P{slot.periodNo}</p>
                        )}
                      </div>

                      <div className={`shrink-0 w-1 h-10 rounded-full ${active ? 'bg-blue-500' : 'bg-gray-200 dark:bg-slate-700'}`} />

                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${active ? 'text-blue-700 dark:text-blue-300' : 'text-gray-800 dark:text-slate-200'}`}>
                          {subject?.name ?? 'Unknown Subject'}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-slate-500 truncate">
                          {slot.className}{slot.sectionName ? ` · Sec ${slot.sectionName}` : ''}
                          {slot.roomNo ? ` · Room ${slot.roomNo}` : ''}
                        </p>
                      </div>

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

        {/* My Classes Overview — lg:1/3 */}
        <SectionCard title="My Classes">
          {classSectionsWithCount.length === 0 ? (
            <EmptyState message="No classes assigned in timetable yet" />
          ) : (
            <div className="space-y-2">
              {classSectionsWithCount.map(cs => (
                <div key={`${cs.classId}-${cs.sectionId}`} className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-slate-100 truncate">
                        {cs.className}{cs.sectionName ? ` — ${cs.sectionName}` : ''}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-slate-500">
                        {cs.studentCount} student{cs.studentCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                      {cs.studentCount}
                    </span>
                  </div>
                  {cs.subjects.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {cs.subjects.slice(0, 3).map(sub => (
                        <span key={sub} className="text-[10px] font-medium px-1.5 py-0.5 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400 rounded-md">
                          {sub}
                        </span>
                      ))}
                      {cs.subjects.length > 3 && (
                        <span className="text-[10px] text-gray-400 dark:text-slate-500 px-1.5 py-0.5">
                          +{cs.subjects.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* ══ ROW 2 — Marks Trend + Upcoming Exams ══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Marks Trend — lg:2/3 */}
        <div className="lg:col-span-2">
          <SectionCard
            title={`Class Avg — ${firstSection ? `${firstSection.className} ${firstSection.sectionName}` : 'Marks Trend'}`}
            to={`${base}/exams`}
          >
            {marksTrend.length < 2 ? (
              <EmptyState message="Publish at least 2 exam results to see the class trend" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={marksTrend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
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
                    formatter={(v: unknown) => [`${v}%`, 'Class Avg']}
                    labelFormatter={l => `Exam: ${l}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="avg"
                    name="Class Avg"
                    stroke="#8b5cf6"
                    strokeWidth={2.5}
                    dot={{ r: 5, fill: '#8b5cf6', strokeWidth: 2, stroke: isDark ? '#0f172a' : '#ffffff' }}
                    activeDot={{ r: 7, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </SectionCard>
        </div>

        {/* Upcoming Exams — lg:1/3 */}
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
                    <div className={`shrink-0 w-10 h-10 rounded-xl flex flex-col items-center justify-center ${urgent ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-violet-100 dark:bg-violet-900/30'}`}>
                      <p className={`text-xs font-bold leading-none ${urgent ? 'text-amber-700 dark:text-amber-400' : 'text-violet-600 dark:text-violet-400'}`}>
                        {new Date(exam.startDate).getDate()}
                      </p>
                      <p className={`text-[9px] leading-none mt-0.5 ${urgent ? 'text-amber-500' : 'text-violet-400'}`}>
                        {new Date(exam.startDate).toLocaleString('en-PK', { month: 'short' })}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-slate-200 truncate">{exam.name}</p>
                      <p className={`text-xs ${urgent ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-gray-400 dark:text-slate-500'}`}>
                        {d === 0 ? 'Today!' : d === 1 ? 'Tomorrow' : `In ${d} days`}
                      </p>
                    </div>
                    {urgent && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />}
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>

      {/* ══ ROW 3 — Pending Assignments + Quick Actions ══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Pending to grade + upcoming — lg:2/3 */}
        <div className="lg:col-span-2">
          <SectionCard title="Assignments" to={`${base}/assignments`}>
            {pendingGrading.length === 0 && upcoming.length === 0 ? (
              <EmptyState message="No active assignments" />
            ) : (
              <div className="space-y-2">
                {[...pendingGrading.slice(0, 3), ...upcoming.slice(0, 4)].map(asgn => {
                  const overdue = asgn.dueDate < todayStr;
                  const d = daysUntil(asgn.dueDate);
                  const subName = typeof asgn.subjectId !== 'string'
                    ? (asgn.subjectId as { _id: string; name: string; code: string }).name
                    : '';
                  return (
                    <div key={asgn._id} className={`flex items-center gap-3 p-2.5 rounded-xl ${overdue ? 'bg-orange-50 dark:bg-orange-900/10' : 'bg-gray-50 dark:bg-slate-800'}`}>
                      <div className={`shrink-0 w-1 h-10 rounded-full ${overdue ? 'bg-orange-400' : d <= 1 ? 'bg-amber-400' : 'bg-blue-400'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 dark:text-slate-200 truncate">{asgn.title}</p>
                        <p className="text-xs text-gray-400 dark:text-slate-500 truncate">
                          {subName && `${subName} · `}
                          {overdue
                            ? `Due was ${formatDate(asgn.dueDate)} — check submissions`
                            : d === 0 ? 'Due today'
                            : d === 1 ? 'Due tomorrow'
                            : `Due ${formatDate(asgn.dueDate)}`}
                        </p>
                      </div>
                      {overdue ? (
                        <span className="shrink-0 text-[10px] font-bold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 rounded-full">
                          Grade
                        </span>
                      ) : d <= 1 ? (
                        <span className="shrink-0 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                          Soon
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Quick Actions — lg:1/3 */}
        <div className="flex flex-col gap-3">
          {QUICK_LINKS.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center gap-3 p-4 rounded-2xl text-white shadow-md hover:opacity-90 transition-opacity ${link.gradient}`}
            >
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={link.icon} />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white leading-snug truncate">{link.label}</p>
                <p className="text-xs text-white/70 truncate">{link.desc}</p>
              </div>
              <svg className="w-4 h-4 text-white/60 shrink-0 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
