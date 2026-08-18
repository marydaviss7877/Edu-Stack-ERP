import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { examService, type ExamDoc } from '../../services/examService';
import { useThemeStore } from '../../stores/themeStore';
import { cn } from '../../lib/utils';

const GRADE_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#f97316', '#ef4444', '#94a3b8'];

function StatTile({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' | 'neutral' }) {
  return (
    <div className="card p-4">
      <div className={cn('text-2xl font-bold',
        tone === 'good' ? 'text-green-600' : tone === 'bad' ? 'text-red-600' : 'text-gray-900 dark:text-slate-100')}>
        {value}
      </div>
      <div className="text-xs text-gray-400 dark:text-slate-500 mt-1">{label}</div>
    </div>
  );
}

export default function ExamAnalyticsTab({
  exams, classId, sectionId, academicYearId,
}: {
  exams: ExamDoc[];
  classId: string;
  sectionId: string;
  academicYearId?: string;
}) {
  const { isDark } = useThemeStore();
  const [examId, setExamId] = useState('');

  useEffect(() => {
    if (!examId && exams.length > 0) setExamId(exams[0]._id);
  }, [exams, examId]);

  const { data: analytics, isLoading: loadingAnalytics } = useQuery({
    queryKey: ['exam-analytics', examId, classId, sectionId],
    queryFn: () => examService.getAnalytics(examId, { classId, sectionId }),
    enabled: !!examId,
  });

  const { data: progress = [], isLoading: loadingProgress } = useQuery({
    queryKey: ['exam-progress', classId, sectionId, academicYearId],
    queryFn: () => examService.getProgress({ classId, sectionId, academicYearId: academicYearId! }),
    enabled: !!classId && !!academicYearId,
  });

  const tooltipStyle = {
    borderRadius: '12px',
    border: isDark ? '1px solid #334155' : '1px solid #e5e7eb',
    fontSize: '12px',
    backgroundColor: isDark ? '#1e293b' : '#ffffff',
    color: isDark ? '#e2e8f0' : '#374151',
  };
  const axisColor = isDark ? '#64748b' : '#6b7280';

  return (
    <div className="space-y-5">
      {/* Exam picker */}
      <div className="card p-4">
        <label className="label">Exam</label>
        <select className="input" value={examId} onChange={e => setExamId(e.target.value)}>
          <option value="">Select exam...</option>
          {exams.map(ex => <option key={ex._id} value={ex._id}>{ex.name}</option>)}
        </select>
      </div>

      {/* Single-exam breakdown */}
      {examId && (
        loadingAnalytics ? (
          <div className="card px-5 py-12 text-center text-gray-400 dark:text-slate-500 text-sm">Loading analytics...</div>
        ) : !analytics || analytics.totalStudents === 0 ? (
          <div className="card px-5 py-12 text-center text-gray-400 dark:text-slate-500 text-sm">No results entered for this exam yet.</div>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatTile label="Students" value={String(analytics.totalStudents)} />
              <StatTile label="Class Average" value={`${analytics.classAverage}%`} />
              <StatTile label="Pass Rate" value={`${analytics.passRate}%`} tone={analytics.passRate >= 60 ? 'good' : 'bad'} />
              <StatTile label="Absent" value={String(analytics.absentCount)} tone={analytics.absentCount > 0 ? 'bad' : 'neutral'} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Subject-wise average */}
              <div className="card p-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">Subject-wise Average</h3>
                {analytics.subjectStats.length === 0 ? (
                  <div className="text-center text-gray-400 dark:text-slate-500 text-sm py-10">No subject data</div>
                ) : (
                  <div style={{ height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.subjectStats} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#f1f5f9'} vertical={false} />
                        <XAxis dataKey="subjectName" tick={{ fontSize: 10, fill: axisColor }} interval={0} angle={-20} textAnchor="end" height={50} />
                        <YAxis tick={{ fontSize: 10, fill: axisColor }} domain={[0, 100]} />
                        <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => [`${v}%`, 'Average']} />
                        <Bar dataKey="average" name="Average %" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Grade distribution */}
              <div className="card p-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">Grade Distribution</h3>
                {analytics.gradeDistribution.length === 0 ? (
                  <div className="text-center text-gray-400 dark:text-slate-500 text-sm py-10">No grade data</div>
                ) : (
                  <div style={{ height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={analytics.gradeDistribution} dataKey="count" nameKey="grade" innerRadius={45} outerRadius={75} paddingAngle={2}>
                          {analytics.gradeDistribution.map((_, i) => (
                            <Cell key={i} fill={GRADE_COLORS[i % GRADE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '11px', color: isDark ? '#94a3b8' : undefined }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            {/* Top / bottom performers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="card overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300">Top Performers</h3>
                </div>
                <ul className="divide-y divide-gray-100 dark:divide-slate-700">
                  {analytics.topPerformers.map((s, i) => (
                    <li key={s.studentId} className="px-4 py-2.5 flex items-center justify-between text-sm">
                      <span className="text-gray-700 dark:text-slate-300">#{i + 1} {s.name ?? '—'} <span className="text-gray-400 dark:text-slate-500">({s.rollNo ?? '—'})</span></span>
                      <span className="font-medium text-green-600">{s.percentage}% · {s.grade}</span>
                    </li>
                  ))}
                  {analytics.topPerformers.length === 0 && <li className="px-4 py-6 text-center text-gray-400 text-sm">No data</li>}
                </ul>
              </div>
              <div className="card overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300">Needs Attention</h3>
                </div>
                <ul className="divide-y divide-gray-100 dark:divide-slate-700">
                  {analytics.bottomPerformers.map(s => (
                    <li key={s.studentId} className="px-4 py-2.5 flex items-center justify-between text-sm">
                      <span className="text-gray-700 dark:text-slate-300">{s.name ?? '—'} <span className="text-gray-400 dark:text-slate-500">({s.rollNo ?? '—'})</span></span>
                      <span className={cn('font-medium', s.isPassed ? 'text-amber-600' : 'text-red-600')}>{s.percentage}% · {s.grade}</span>
                    </li>
                  ))}
                  {analytics.bottomPerformers.length === 0 && <li className="px-4 py-6 text-center text-gray-400 text-sm">No data</li>}
                </ul>
              </div>
            </div>
          </div>
        )
      )}

      {/* Progress over time */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">Progress Over Time (this academic year)</h3>
        {!academicYearId ? (
          <div className="text-center text-gray-400 dark:text-slate-500 text-sm py-10">Academic year not resolved yet</div>
        ) : loadingProgress ? (
          <div className="text-center text-gray-400 dark:text-slate-500 text-sm py-10">Loading...</div>
        ) : progress.length < 2 ? (
          <div className="text-center text-gray-400 dark:text-slate-500 text-sm py-10">Not enough exams yet to show a trend.</div>
        ) : (
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={progress.map(p => ({ ...p, name: p.examName.slice(0, 14) }))} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#f1f5f9'} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: axisColor }} />
                <YAxis tick={{ fontSize: 10, fill: axisColor }} domain={[0, 100]} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown, key: unknown) => [`${v}%`, key === 'classAverage' ? 'Class Average' : 'Pass Rate']} />
                <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '11px', color: isDark ? '#94a3b8' : undefined }} />
                <Line type="monotone" dataKey="classAverage" name="Class Average %" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="passRate" name="Pass Rate %" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
