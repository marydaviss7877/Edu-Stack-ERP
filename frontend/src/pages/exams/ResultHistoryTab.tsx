import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { examService } from '../../services/examService';
import { studentService } from '../../services/studentService';
import { useThemeStore } from '../../stores/themeStore';
import Badge from '../../components/ui/Badge';
import { cn } from '../../lib/utils';
import { downloadResultCardPdf } from '../../lib/resultCardPdf';

export default function ResultHistoryTab({
  classId, sectionId, orgName,
}: {
  classId: string;
  sectionId: string;
  orgName: string;
}) {
  const { isDark } = useThemeStore();
  const [studentId, setStudentId] = useState('');

  const { data: students = [] } = useQuery({
    queryKey: ['students-history', classId, sectionId],
    queryFn: () => studentService.list({ classId, sectionId, status: 'active' }).then(r => r.data ?? []),
    enabled: !!classId && !!sectionId,
  });

  const { data: exams = [] } = useQuery({
    queryKey: ['exams-history', classId],
    queryFn: () => examService.list({ classId }),
    enabled: !!classId,
  });

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['result-history', studentId],
    queryFn: () => examService.getResults({ studentId }),
    enabled: !!studentId,
  });

  const examMap = new Map(exams.map(e => [e._id, e]));
  const student = students.find(s => s._id === studentId);

  const sorted = [...results].sort((a, b) => {
    const da = examMap.get(a.examId)?.startDate ?? '';
    const db = examMap.get(b.examId)?.startDate ?? '';
    return da.localeCompare(db);
  });

  const trendData = sorted.map(r => ({
    name: (examMap.get(r.examId)?.name ?? 'Exam').slice(0, 12),
    percentage: r.percentage,
  }));

  const tooltipStyle = {
    borderRadius: '12px',
    border: isDark ? '1px solid #334155' : '1px solid #e5e7eb',
    fontSize: '12px',
    backgroundColor: isDark ? '#1e293b' : '#ffffff',
    color: isDark ? '#e2e8f0' : '#374151',
  };
  const axisColor = isDark ? '#64748b' : '#6b7280';

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <label className="label">Student</label>
        <select className="input" value={studentId} onChange={e => setStudentId(e.target.value)} disabled={!classId || !sectionId}>
          <option value="">{!classId || !sectionId ? 'Select a class and section first...' : 'Choose student...'}</option>
          {students.map(s => <option key={s._id} value={s._id}>{s.rollNo} — {s.profile.name}</option>)}
        </select>
      </div>

      {!studentId ? (
        <div className="card px-5 py-12 text-center text-gray-400 dark:text-slate-500 text-sm">
          Select a student to view their full result history.
        </div>
      ) : isLoading ? (
        <div className="card px-5 py-12 text-center text-gray-400 dark:text-slate-500 text-sm">Loading...</div>
      ) : results.length === 0 ? (
        <div className="card px-5 py-12 text-center text-gray-400 dark:text-slate-500 text-sm">No results recorded for this student yet.</div>
      ) : (
        <>
          {trendData.length >= 2 && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">Marks Trend</h3>
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#f1f5f9'} vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: axisColor }} />
                    <YAxis tick={{ fontSize: 10, fill: axisColor }} domain={[0, 100]} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => [`${v}%`, 'Score']} />
                    <Line type="monotone" dataKey="percentage" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 dark:bg-slate-700/50 dark:border-slate-700">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Exam</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-slate-400">%</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Grade</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Remarks</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-slate-400">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {sorted.map(r => {
                  const exam = examMap.get(r.examId);
                  return (
                    <tr key={r._id} className={cn(!r.isPassed && 'bg-red-50 dark:bg-red-900/20')}>
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-slate-100">{exam?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-center">{r.percentage}%</td>
                      <td className="px-4 py-3 text-center font-bold">{r.grade}</td>
                      <td className="px-4 py-3 text-center">
                        {r.isPassed ? <Badge variant="success">Pass</Badge> : <Badge variant="danger">Fail</Badge>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-slate-400 text-xs max-w-xs">{r.remarks || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => downloadResultCardPdf({
                            result: r,
                            examName: exam?.name ?? '',
                            orgName,
                            studentName: student?.profile.name,
                            rollNo: student?.rollNo,
                          })}
                          className="text-xs px-2 py-1 rounded border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                        >
                          ↓ PDF
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
