import { useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { weeklyPaperService } from '../../services/weeklyPaperService';
import PageHeader from '../../components/ui/PageHeader';
import Badge from '../../components/ui/Badge';
import { cn } from '../../lib/utils';
import { WeakTopicsTab, ClearanceTab } from './WeeklyPapersPage';

type Tab = 'tests' | 'weak' | 'clearance';

// ── My Weekly Tests tab — only this student's own graded topic tests ──────────

function MyWeeklyTestsTab() {
  const { data: progress, isLoading } = useQuery({
    queryKey: ['student-progress'],
    queryFn: () => weeklyPaperService.getMyProgress(),
  });

  const weekly = [...(progress?.weekly ?? [])].reverse();

  return (
    <div className="card divide-y divide-gray-100 dark:divide-slate-700">
      {isLoading && <div className="px-5 py-8 text-center text-gray-400 text-sm">Loading...</div>}
      {!isLoading && weekly.length === 0 && (
        <div className="px-5 py-8 text-center text-gray-400 text-sm">No weekly tests yet.</div>
      )}
      {weekly.map(w => (
        <div key={w.paperId} className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
              {w.subjectName || 'Subject'} — {w.topicName ?? (w.chapterNumber ? `Chapter ${w.chapterNumber}` : 'Topic test')}
            </p>
            <p className="text-xs text-gray-400 dark:text-slate-500">
              {new Date(w.scheduledDate).toLocaleDateString()} · {w.totalMarks} marks
            </p>
          </div>
          <Badge variant={w.isAbsent ? 'default' : w.isWeak ? 'danger' : 'success'}>
            {w.isAbsent ? 'Absent' : `${w.marksObtained}/${w.totalMarks} (${Math.round(w.percentage)}%)`}
          </Badge>
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function StudentPapersPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isMonthlyReportLink = location.pathname.endsWith('monthly-report');
  const [tab, setTab] = useState<Tab>(isMonthlyReportLink ? 'weak' : 'tests');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'tests', label: 'My Weekly Tests' },
    { id: 'weak', label: 'Weak Topics' },
    { id: 'clearance', label: 'Clearance Exams' },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader title="My Weekly Tests & Progress" subtitle="Your weekly subject tests, weak-topic tracking, and clearance exams" />

      <div className="flex gap-1 bg-gray-100 dark:bg-slate-700 p-1 rounded-lg mb-6 w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn('px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
              tab === t.id ? 'bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200')}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'tests' && <MyWeeklyTestsTab />}
      {tab === 'weak' && (
        <WeakTopicsTab
          isStudent
          initialMonth={isMonthlyReportLink ? searchParams.get('month') ?? undefined : undefined}
          initialYear={isMonthlyReportLink ? searchParams.get('year') ?? undefined : undefined}
        />
      )}
      {tab === 'clearance' && <ClearanceTab role="student" />}
    </div>
  );
}
