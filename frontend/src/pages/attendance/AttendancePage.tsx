import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { academicService } from '../../services/academicService';
import { attendanceService } from '../../services/attendanceService';
import type { AttendanceRecord, StaffStatus, ProgressGroupBy } from '../../services/attendanceService';
import { studentService } from '../../services/studentService';
import { branchHeaderService } from '../../services/branchHeaderService';
import { downloadAttendancePdf, downloadAttendanceCsv, downloadProgressReportCsv, downloadProgressReportPdf } from '../../lib/attendancePdf';
import PageHeader from '../../components/ui/PageHeader';
import Badge from '../../components/ui/Badge';
import { useAuthStore } from '../../stores/authStore';
import { cn } from '../../lib/utils';

type Status = 'present' | 'absent' | 'late' | 'excused';

const STATUS_COLORS: Record<Status, string> = {
  present: 'bg-green-100 text-green-700 border-green-200',
  absent: 'bg-red-100 text-red-700 border-red-200',
  late: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  excused: 'bg-blue-100 text-blue-700 border-blue-200',
};

const STATUS_DOT: Record<string, string> = {
  present: 'bg-green-500',
  absent: 'bg-red-500',
  late: 'bg-yellow-500',
  excused: 'bg-blue-400',
};

const CYCLE: Status[] = ['present', 'absent', 'late', 'excused'];

function StudentAttendanceView() {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));

  const { data, isLoading } = useQuery({
    queryKey: ['my-attendance', month, year],
    queryFn: () => attendanceService.getMyRecords({ month, year }),
  });

  const stats = data?.stats;
  const records = data?.records ?? [];
  const recordMap: Record<string, string> = {};
  records.forEach(r => { recordMap[r.date] = r.status; });

  // build calendar days for selected month
  const firstDay = new Date(parseInt(year), parseInt(month) - 1, 1);
  const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
  const startDow = firstDay.getDay(); // 0=Sun

  const calendarCells: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const pad = (n: number) => String(n).padStart(2, '0');
  const dateKey = (day: number) => `${year}-${pad(parseInt(month))}-${pad(day)}`;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <PageHeader title="My Attendance" />

      {/* Month selector */}
      <div className="flex gap-3 mb-5">
        <select value={month} onChange={e => setMonth(e.target.value)} className="text-sm border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200">
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={String(i + 1)}>
              {new Date(2000, i).toLocaleString('default', { month: 'long' })}
            </option>
          ))}
        </select>
        <select value={year} onChange={e => setYear(e.target.value)} className="text-sm border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200">
          {[2024, 2025, 2026].map(y => <option key={y} value={String(y)}>{y}</option>)}
        </select>
      </div>

      {/* Shortage alert */}
      {stats?.isShortage && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <span className="text-base">⚠️</span>
          <span>Attendance shortage — your attendance is below the required {stats.threshold}% threshold.</span>
        </div>
      )}

      {/* Stats cards */}
      {isLoading ? (
        <div className="text-center text-gray-400 text-sm py-10">Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {[
              { label: 'Present', value: stats?.present ?? 0, color: 'text-green-600 bg-green-50 border-green-100' },
              { label: 'Absent', value: stats?.absent ?? 0, color: 'text-red-600 bg-red-50 border-red-100' },
              { label: 'Late', value: stats?.late ?? 0, color: 'text-yellow-600 bg-yellow-50 border-yellow-100' },
              { label: 'Excused', value: stats?.excused ?? 0, color: 'text-blue-600 bg-blue-50 border-blue-100' },
            ].map(s => (
              <div key={s.label} className={cn('rounded-xl border p-4 text-center', s.color)}>
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs font-medium mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Percentage bar */}
          <div className="card p-4 mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Overall Attendance</span>
              <span className={cn('text-lg font-bold', (stats?.percentage ?? 0) >= (stats?.threshold ?? 75) ? 'text-green-600' : 'text-red-600')}>
                {stats?.percentage ?? 0}%
              </span>
            </div>
            <div className="h-2.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', (stats?.percentage ?? 0) >= (stats?.threshold ?? 75) ? 'bg-green-500' : 'bg-red-500')}
                style={{ width: `${stats?.percentage ?? 0}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-xs text-gray-400">{stats?.total ?? 0} school days recorded</span>
              <span className="text-xs text-gray-400">Required: {stats?.threshold ?? 75}%</span>
            </div>
          </div>

          {/* Calendar */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">Daily Attendance</h3>
            <div className="grid grid-cols-7 gap-1 mb-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="text-center text-xs text-gray-400 font-medium py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarCells.map((day, idx) => {
                if (!day) return <div key={idx} />;
                const key = dateKey(day);
                const status = recordMap[key];
                return (
                  <div
                    key={idx}
                    title={status ?? 'No record'}
                    className={cn(
                      'aspect-square flex flex-col items-center justify-center rounded-lg text-xs font-medium relative',
                      status ? STATUS_COLORS[status as Status] : 'bg-gray-50 dark:bg-slate-700 text-gray-300 dark:text-slate-600 border border-gray-100 dark:border-slate-600'
                    )}
                  >
                    {day}
                    {status && (
                      <span className={cn('w-1.5 h-1.5 rounded-full mt-0.5', STATUS_DOT[status])} />
                    )}
                  </div>
                );
              })}
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-slate-700">
              {Object.entries(STATUS_DOT).map(([s, dot]) => (
                <div key={s} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
                  <span className={cn('w-2 h-2 rounded-full', dot)} />
                  <span className="capitalize">{s}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
                <span className="w-2 h-2 rounded-full bg-gray-200 dark:bg-slate-600" />
                <span>No record</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StaffAttendanceView() {
  const today = new Date().toISOString().split('T')[0];

  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [date, setDate] = useState(today);
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [submitted, setSubmitted] = useState(false);
  const [view, setView] = useState<'mark' | 'summary' | 'progress'>('mark');
  const [summaryMonth, setSummaryMonth] = useState(String(new Date().getMonth() + 1));
  const [summaryYear, setSummaryYear] = useState(String(new Date().getFullYear()));
  const [progressGroupBy, setProgressGroupBy] = useState<ProgressGroupBy>('class');

  const role = useAuthStore(s => s.user?.role);
  const orgSlug = useAuthStore(s => s.orgSlug);
  const { data: branchHeader } = useQuery({ queryKey: ['branch-header'], queryFn: branchHeaderService.get });
  const orgName = branchHeader?.schoolName ?? orgSlug ?? 'School';

  const { data: years = [] } = useQuery({ queryKey: ['years'], queryFn: academicService.getYears });
  const currentYear = years.find(y => y.isCurrent) ?? years[0];

  const { data: classes = [] } = useQuery({ queryKey: ['classes', currentYear?._id], queryFn: () => academicService.getClasses(currentYear?._id), enabled: !!currentYear });
  const { data: sections = [] } = useQuery({ queryKey: ['sections', classId], queryFn: () => academicService.getSections(classId || undefined), enabled: !!classId });

  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ['students-attendance', classId, sectionId, currentYear?._id],
    queryFn: () => studentService.list({ classId, sectionId, academicYearId: currentYear!._id, status: 'active' }).then(r => r.data ?? []),
    enabled: !!classId && !!sectionId && !!currentYear,
  });

  useEffect(() => {
    if (students.length) {
      const initial: Record<string, Status> = {};
      students.forEach(s => { initial[s._id] = 'present'; });
      setStatuses(initial);
      setSubmitted(false);
    }
  }, [students]);

  const { data: sectionSummary = [] } = useQuery({
    queryKey: ['section-summary', sectionId, summaryMonth, summaryYear],
    queryFn: () => attendanceService.getSectionSummary({ sectionId, month: summaryMonth, year: summaryYear }),
    enabled: !!sectionId && view === 'summary',
  });

  const { data: progressReport = [] } = useQuery({
    queryKey: ['attendance-progress-report', progressGroupBy, summaryMonth, summaryYear],
    queryFn: () => attendanceService.getProgressReport({ groupBy: progressGroupBy, month: summaryMonth, year: summaryYear }),
    enabled: view === 'progress',
  });

  const markMutation = useMutation({
    mutationFn: attendanceService.mark,
    onSuccess: () => setSubmitted(true),
  });

  const toggleStatus = (studentId: string) => {
    setStatuses(prev => {
      const current = prev[studentId] ?? 'present';
      const nextIdx = (CYCLE.indexOf(current) + 1) % CYCLE.length;
      return { ...prev, [studentId]: CYCLE[nextIdx] };
    });
  };

  const markAllPresent = () => {
    const all: Record<string, Status> = {};
    students.forEach(s => { all[s._id] = 'present'; });
    setStatuses(all);
  };

  const handleSubmit = () => {
    if (!classId || !sectionId) return;
    const records: AttendanceRecord[] = students.map(s => ({ studentId: s._id, status: statuses[s._id] ?? 'present' }));
    markMutation.mutate({ classId, sectionId, date, records });
  };

  const presentCount = Object.values(statuses).filter(s => s === 'present').length;
  const absentCount = Object.values(statuses).filter(s => s === 'absent').length;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader title="Attendance" />

      {/* Controls */}
      <div className="card p-4 mb-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="label">Class</label>
            <select className="input" value={classId} onChange={e => { setClassId(e.target.value); setSectionId(''); setSubmitted(false); }}>
              <option value="">Select class...</option>
              {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Section</label>
            <select className="input" value={sectionId} onChange={e => { setSectionId(e.target.value); setSubmitted(false); }} disabled={!classId}>
              <option value="">Select section...</option>
              {sections.map(s => <option key={s._id} value={s._id}>Section {s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={date} max={today} onChange={e => { setDate(e.target.value); setSubmitted(false); }} />
          </div>
          <div className="flex items-end gap-2">
            <button onClick={() => setView('mark')} className={cn('flex-1 py-2.5 text-sm rounded-lg border transition-colors', view === 'mark' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700')}>Mark</button>
            <button onClick={() => setView('summary')} className={cn('flex-1 py-2.5 text-sm rounded-lg border transition-colors', view === 'summary' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700')}>Summary</button>
            {role !== 'teacher' && (
              <button onClick={() => setView('progress')} className={cn('flex-1 py-2.5 text-sm rounded-lg border transition-colors', view === 'progress' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700')}>Progress</button>
            )}
          </div>
        </div>
      </div>

      {/* Mark attendance view */}
      {view === 'mark' && (
        <>
          {students.length > 0 && !submitted && (
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-600">
                <span className="font-medium text-green-600">{presentCount} present</span>
                {absentCount > 0 && <span className="ml-2 font-medium text-red-600">{absentCount} absent</span>}
                <span className="text-gray-400 ml-2">/ {students.length} total</span>
              </p>
              <button onClick={markAllPresent} className="btn-secondary text-xs">Mark All Present</button>
            </div>
          )}

          {submitted && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 text-sm text-green-700">
              ✓ Attendance saved for {date}. Click a student to re-mark.
            </div>
          )}

          <div className="card divide-y divide-gray-100">
            {loadingStudents && (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">Loading students...</div>
            )}
            {!loadingStudents && students.length === 0 && classId && sectionId && (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">No active students in this section.</div>
            )}
            {!loadingStudents && !classId && (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">Select a class and section to mark attendance.</div>
            )}
            {students.map((student) => {
              const status = statuses[student._id] ?? 'present';
              return (
                <div key={student._id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700/40">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-gray-400 dark:text-slate-500 w-10">{student.rollNo}</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-slate-100">{student.profile.name}</span>
                  </div>
                  <button
                    onClick={() => toggleStatus(student._id)}
                    className={cn('px-3 py-1 rounded-lg border text-xs font-medium transition-all', STATUS_COLORS[status])}
                  >
                    {status}
                  </button>
                </div>
              );
            })}
          </div>

          {students.length > 0 && !submitted && (
            <button
              onClick={handleSubmit}
              disabled={markMutation.isPending}
              className="btn-primary w-full mt-4 py-3 text-base"
            >
              {markMutation.isPending ? 'Saving...' : 'Save Attendance'}
            </button>
          )}
        </>
      )}

      {/* Monthly summary view */}
      {view === 'summary' && sectionId && (
        <>
          <div className="flex flex-wrap gap-3 mb-4 items-center">
            <select value={summaryMonth} onChange={e => setSummaryMonth(e.target.value)} className="text-sm border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200">
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={String(i + 1)}>{new Date(2000, i).toLocaleString('default', { month: 'long' })}</option>
              ))}
            </select>
            <select value={summaryYear} onChange={e => setSummaryYear(e.target.value)} className="text-sm border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200">
              {[2024, 2025, 2026].map(y => <option key={y} value={String(y)}>{y}</option>)}
            </select>
            <div className="ml-auto flex gap-2">
              <button
                onClick={() => downloadAttendanceCsv({
                  records: sectionSummary,
                  className: classes.find(c => c._id === classId)?.name ?? classId,
                  sectionName: sections.find(s => s._id === sectionId)?.name ?? sectionId,
                  month: summaryMonth,
                  year: summaryYear,
                })}
                disabled={sectionSummary.length === 0}
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-40"
              >
                ↓ CSV
              </button>
              <button
                onClick={() => downloadAttendancePdf({
                  records: sectionSummary,
                  className: classes.find(c => c._id === classId)?.name ?? classId,
                  sectionName: sections.find(s => s._id === sectionId)?.name ?? sectionId,
                  month: summaryMonth,
                  year: summaryYear,
                  orgName,
                })}
                disabled={sectionSummary.length === 0}
                className="text-xs px-3 py-1.5 rounded-lg bg-navy-900 dark:bg-navy-800 border border-navy-700 text-white hover:bg-navy-800 dark:hover:bg-navy-700 transition-colors disabled:opacity-40"
              >
                ↓ PDF
              </button>
            </div>
          </div>

          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Roll No</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Name</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Present</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Absent</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-slate-400">%</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Alert</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {sectionSummary.map((s) => (
                  <tr key={String(s.studentId)} className={cn(s.isShortage ? 'bg-red-50 dark:bg-red-900/20' : '')}>
                    <td className="px-4 py-3 font-mono text-gray-500 dark:text-slate-400">{s.rollNo}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-slate-100">{s.name}</td>
                    <td className="px-4 py-3 text-center text-green-600">{s.present}</td>
                    <td className="px-4 py-3 text-center text-red-600">{s.absent}</td>
                    <td className="px-4 py-3 text-center font-medium">
                      <span className={cn(s.percentage < 75 ? 'text-red-600' : 'text-green-600')}>{s.percentage}%</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {s.isShortage && <Badge variant="danger">Shortage</Badge>}
                    </td>
                  </tr>
                ))}
                {sectionSummary.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No attendance records for this period.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Teacher/class/subject-wise progress report */}
      {view === 'progress' && (
        <>
          <div className="flex flex-wrap gap-3 mb-4 items-center">
            <div className="flex gap-1.5">
              {(['class', 'teacher', 'subject'] as const).map(g => (
                <button
                  key={g}
                  onClick={() => setProgressGroupBy(g)}
                  className={cn('px-3 py-1.5 text-xs font-medium rounded-lg border capitalize transition-colors', progressGroupBy === g ? 'bg-navy-950 text-white border-navy-950' : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700')}
                >
                  {g}-wise
                </button>
              ))}
            </div>
            <select value={summaryMonth} onChange={e => setSummaryMonth(e.target.value)} className="text-sm border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200">
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={String(i + 1)}>{new Date(2000, i).toLocaleString('default', { month: 'long' })}</option>
              ))}
            </select>
            <select value={summaryYear} onChange={e => setSummaryYear(e.target.value)} className="text-sm border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200">
              {[2024, 2025, 2026].map(y => <option key={y} value={String(y)}>{y}</option>)}
            </select>
            <div className="ml-auto flex gap-2">
              <button
                onClick={() => downloadProgressReportCsv({ rows: progressReport, groupBy: progressGroupBy, month: summaryMonth, year: summaryYear })}
                disabled={progressReport.length === 0}
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-40"
              >
                ↓ CSV
              </button>
              <button
                onClick={() => downloadProgressReportPdf({ rows: progressReport, groupBy: progressGroupBy, month: summaryMonth, year: summaryYear, orgName })}
                disabled={progressReport.length === 0}
                className="text-xs px-3 py-1.5 rounded-lg bg-navy-900 dark:bg-navy-800 border border-navy-700 text-white hover:bg-navy-800 dark:hover:bg-navy-700 transition-colors disabled:opacity-40"
              >
                ↓ PDF
              </button>
            </div>
          </div>

          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400 capitalize">{progressGroupBy}</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Sessions</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Present</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Absent</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-slate-400">%</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {progressReport.map(r => (
                  <tr key={r.key} className={cn(r.isShortage ? 'bg-red-50 dark:bg-red-900/20' : '')}>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-slate-100">{r.label}{r.sublabel ? ` — ${r.sublabel}` : ''}</td>
                    <td className="px-4 py-3 text-center text-gray-500 dark:text-slate-400">{r.sessionsMarked}</td>
                    <td className="px-4 py-3 text-center text-green-600">{r.present}</td>
                    <td className="px-4 py-3 text-center text-red-600">{r.absent}</td>
                    <td className="px-4 py-3 text-center font-medium">
                      <span className={cn(r.percentage < 75 ? 'text-red-600' : 'text-green-600')}>{r.percentage}%</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.isShortage && <Badge variant="danger">Below Target</Badge>}
                    </td>
                  </tr>
                ))}
                {progressReport.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No attendance records for this period.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

const STAFF_CYCLE: StaffStatus[] = ['present', 'absent', 'late', 'on_leave'];
const STAFF_COLORS: Record<StaffStatus, string> = {
  present:  'bg-green-100 text-green-700 border-green-200',
  absent:   'bg-red-100 text-red-700 border-red-200',
  late:     'bg-yellow-100 text-yellow-700 border-yellow-200',
  on_leave: 'bg-blue-100 text-blue-700 border-blue-200',
};

function StaffDailyAttendanceView() {
  const qc = useQueryClient();
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [view, setView] = useState<'mark' | 'summary'>('mark');
  const [summaryMonth, setSummaryMonth] = useState(String(new Date().getMonth() + 1));
  const [summaryYear, setSummaryYear] = useState(String(new Date().getFullYear()));
  const [statuses, setStatuses] = useState<Record<string, StaffStatus>>({});
  const [submitted, setSubmitted] = useState(false);

  const { data: staffAttendance = [] } = useQuery({
    queryKey: ['staff-attendance', date],
    queryFn: () => attendanceService.getStaff({ date }),
    enabled: view === 'mark',
  });

  const { data: summary = [] } = useQuery({
    queryKey: ['staff-summary', summaryMonth, summaryYear],
    queryFn: () => attendanceService.getStaffSummary({ month: summaryMonth, year: summaryYear }),
    enabled: view === 'summary',
  });

  // Pre-fill statuses from existing records when date changes
  useEffect(() => {
    if (staffAttendance.length > 0) {
      const existing: Record<string, StaffStatus> = {};
      staffAttendance.forEach(r => {
        const id = typeof r.staffId === 'object' ? r.staffId._id : r.staffId;
        existing[id] = r.status;
      });
      setStatuses(existing);
    }
    setSubmitted(false);
  }, [staffAttendance, date]);

  const markMutation = useMutation({
    mutationFn: attendanceService.markStaff,
    onSuccess: () => {
      setSubmitted(true);
      qc.invalidateQueries({ queryKey: ['staff-attendance'] });
      qc.invalidateQueries({ queryKey: ['staff-summary'] });
    },
  });

  const toggleStatus = (staffId: string) => {
    setStatuses(prev => {
      const cur = prev[staffId] ?? 'present';
      const next = STAFF_CYCLE[(STAFF_CYCLE.indexOf(cur) + 1) % STAFF_CYCLE.length];
      return { ...prev, [staffId]: next };
    });
    setSubmitted(false);
  };

  const staffList = staffAttendance.length > 0
    ? staffAttendance.map(r => ({ id: typeof r.staffId === 'object' ? r.staffId._id : r.staffId, name: typeof r.staffId === 'object' ? r.staffId.name : '—', role: typeof r.staffId === 'object' ? r.staffId.role : '' }))
    : [];

  const handleSave = () => {
    const records = staffList.map(s => ({ staffId: s.id, status: statuses[s.id] ?? 'present' }));
    if (records.length === 0) return;
    markMutation.mutate({ date, records });
  };

  const roleLabel = (r: string) => r.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader title="Staff Attendance" />

      <div className="card p-4 mb-5">
        <div className="flex gap-3 flex-wrap items-end">
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={date} max={today} onChange={e => { setDate(e.target.value); setSubmitted(false); }} />
          </div>
          <div className="flex gap-2 items-end pb-0.5">
            <button onClick={() => setView('mark')} className={cn('px-4 py-2 text-sm rounded-lg border transition-colors', view === 'mark' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700')}>Mark</button>
            <button onClick={() => setView('summary')} className={cn('px-4 py-2 text-sm rounded-lg border transition-colors', view === 'summary' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700')}>Monthly Summary</button>
          </div>
        </div>
      </div>

      {view === 'mark' && (
        <>
          {submitted && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 text-sm text-green-700">
              ✓ Staff attendance saved for {date}.
            </div>
          )}
          {staffList.length === 0 ? (
            <div className="card px-5 py-10 text-center text-gray-400 text-sm">
              No staff records found. Ensure staff have been added and have logged in at least once.
            </div>
          ) : (
            <>
              <div className="card divide-y divide-gray-100 dark:divide-slate-700 mb-4">
                {staffList.map(s => {
                  const status = statuses[s.id] ?? 'present';
                  return (
                    <div key={s.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700/40">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-slate-100 text-sm">{s.name}</p>
                        <p className="text-xs text-gray-400 dark:text-slate-500">{roleLabel(s.role)}</p>
                      </div>
                      <button
                        onClick={() => toggleStatus(s.id)}
                        className={cn('px-3 py-1 rounded-lg border text-xs font-medium transition-all capitalize', STAFF_COLORS[status])}
                      >
                        {status.replace('_', ' ')}
                      </button>
                    </div>
                  );
                })}
              </div>
              <button onClick={handleSave} disabled={markMutation.isPending} className="btn-primary w-full py-3 text-base">
                {markMutation.isPending ? 'Saving...' : 'Save Staff Attendance'}
              </button>
            </>
          )}
        </>
      )}

      {view === 'summary' && (
        <>
          <div className="flex gap-3 mb-4">
            <select value={summaryMonth} onChange={e => setSummaryMonth(e.target.value)} className="text-sm border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200">
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={String(i + 1)}>{new Date(2000, i).toLocaleString('default', { month: 'long' })}</option>
              ))}
            </select>
            <select value={summaryYear} onChange={e => setSummaryYear(e.target.value)} className="text-sm border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200">
              {[2024, 2025, 2026].map(y => <option key={y} value={String(y)}>{y}</option>)}
            </select>
          </div>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Role</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Present</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Absent</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Late</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-slate-400">On Leave</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {summary.map(s => (
                  <tr key={String(s.staffId)}>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-slate-100">{s.name}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-slate-400">{roleLabel(s.role)}</td>
                    <td className="px-4 py-3 text-center text-green-600">{s.present}</td>
                    <td className="px-4 py-3 text-center text-red-600">{s.absent}</td>
                    <td className="px-4 py-3 text-center text-yellow-600">{s.late}</td>
                    <td className="px-4 py-3 text-center text-blue-600">{s.on_leave}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{s.total}</td>
                  </tr>
                ))}
                {summary.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">No records for this period.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function LiveAttendanceStatus() {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);

  const { data, isLoading } = useQuery({
    queryKey: ['attendance-today-status', date],
    queryFn: () => attendanceService.getTodayStatus({ date }),
    refetchInterval: 60_000,
  });

  const sections = data?.sections ?? [];
  const markedCount = data?.summary.markedSections ?? 0;
  const totalCount = data?.summary.totalSections ?? 0;

  return (
    <div className="px-6 pt-6">
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </span>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300">Live Attendance Status</h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 dark:text-slate-400">{markedCount}/{totalCount} sections marked</span>
            <input
              type="date"
              value={date}
              max={today}
              onChange={e => setDate(e.target.value)}
              className="text-xs border border-gray-200 dark:border-slate-600 rounded-lg px-2 py-1 bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center text-gray-400 text-sm py-6">Loading...</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {sections.map(s => (
              <div
                key={s.sectionId}
                className={cn(
                  'rounded-lg border p-3',
                  !s.isMarked
                    ? 'border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/40'
                    : s.percentage < 75
                      ? 'border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10'
                      : 'border-green-200 dark:border-green-900/40 bg-green-50 dark:bg-green-900/10'
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-gray-800 dark:text-slate-200 truncate">{s.className} - {s.sectionName}</span>
                  {s.isMarked ? (
                    <span className={cn('text-xs font-bold shrink-0', s.percentage < 75 ? 'text-red-600' : 'text-green-600')}>{s.percentage}%</span>
                  ) : (
                    <span className="text-xs text-gray-400 shrink-0">—</span>
                  )}
                </div>
                {s.isMarked ? (
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">
                    {s.marked}/{s.totalStudents} marked · {s.absent} absent{s.markedByName ? ` · by ${s.markedByName}` : ''}
                  </p>
                ) : (
                  <p className="text-[11px] text-gray-400">Not marked yet</p>
                )}
              </div>
            ))}
            {sections.length === 0 && (
              <div className="col-span-full text-center text-gray-400 text-sm py-6">No sections found for the current academic year.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PrincipalAttendanceView() {
  const [tab, setTab] = useState<'students' | 'staff'>('students');
  return (
    <div>
      <LiveAttendanceStatus />
      <div className="flex gap-2 px-6 pt-4">
        {(['students', 'staff'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn('px-4 py-2 text-sm font-medium rounded-lg border transition-colors capitalize', tab === t ? 'bg-navy-950 text-white border-navy-950' : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700')}
          >
            {t === 'students' ? 'Student Attendance' : 'Staff Attendance'}
          </button>
        ))}
      </div>
      {tab === 'students' ? <StaffAttendanceView /> : <StaffDailyAttendanceView />}
    </div>
  );
}

export default function AttendancePage() {
  const user = useAuthStore(s => s.user);
  if (user?.role === 'student') return <StudentAttendanceView />;
  if (user?.role === 'branch_principal' || user?.role === 'it_admin') return <PrincipalAttendanceView />;
  return <StaffAttendanceView />;
}
