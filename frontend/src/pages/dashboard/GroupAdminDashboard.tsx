import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { feeService } from '../../services/feeService';
import { notificationService } from '../../services/notificationService';
import { admissionService } from '../../services/admissionService';
import { inventoryService } from '../../services/inventoryService';
import FinanceSnapshot from '../../components/inventory/FinanceSnapshot';
import { formatCurrency } from '../../lib/utils';
import api from '../../services/api';
import type { ApiResponse, Organization } from '../../types';

// ── Constants ─────────────────────────────────────────────
const today = new Date();
const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
const MONTHS_BACK = 6;

function last6Months() {
  return Array.from({ length: MONTHS_BACK }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - (MONTHS_BACK - 1 - i), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
}

// ── Types ─────────────────────────────────────────────────
interface BranchStat {
  _id: string;
  name: string;
  code: string;
  city: string;
  status: 'active' | 'inactive';
  principalName?: string;
  studentCount: number;
  staffCount: number;
  feeCollected: number;
  feePending: number;
}

// ── Sub-components ────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  gradient: string;
  icon: React.ReactNode;
}

function StatCard({ label, value, sub, gradient, icon }: StatCardProps) {
  return (
    <div className={`relative rounded-2xl p-5 text-white shadow-lg overflow-hidden ${gradient}`}>
      <div className="absolute -right-5 -top-5 w-24 h-24 rounded-full bg-white/10 pointer-events-none" />
      <div className="absolute -right-8 bottom-0 w-20 h-20 rounded-full bg-white/5 pointer-events-none" />
      <div className="relative">
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-3">
          {icon}
        </div>
        <p className="text-3xl font-extrabold tracking-tight leading-none">{value}</p>
        <p className="text-sm text-white/80 font-medium mt-1.5">{label}</p>
        {sub && <p className="text-xs text-white/55 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function BranchCard({ branch, onEnter }: { branch: BranchStat; onEnter: () => void }) {
  const total = branch.feeCollected + branch.feePending;
  const collectionRate = total > 0 ? Math.round((branch.feeCollected / total) * 100) : 0;

  const rateColor =
    collectionRate >= 80 ? 'bg-emerald-500' :
    collectionRate >= 50 ? 'bg-amber-400' :
    'bg-red-500';

  const rateTextColor =
    collectionRate >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
    collectionRate >= 50 ? 'text-amber-600 dark:text-amber-400' :
    'text-red-600 dark:text-red-400';

  return (
    <div className={`card p-5 flex flex-col gap-4 ${branch.status === 'inactive' ? 'opacity-50' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-gray-900 dark:text-slate-100 truncate text-[0.95rem] leading-tight">
              {branch.name}
            </h3>
            {branch.status === 'inactive' && (
              <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400">
                Inactive
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
            {branch.city} · <span className="font-mono">{branch.code}</span>
          </p>
        </div>
        <div className="shrink-0 w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-extrabold">
          {branch.name.slice(0, 2).toUpperCase()}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-slate-50 dark:bg-slate-700/40 px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-0.5">Students</p>
          <p className="text-lg font-extrabold text-gray-900 dark:text-slate-100 leading-none">
            {branch.studentCount.toLocaleString('en-PK')}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 dark:bg-slate-700/40 px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-0.5">Staff</p>
          <p className="text-lg font-extrabold text-gray-900 dark:text-slate-100 leading-none">
            {branch.staffCount.toLocaleString('en-PK')}
          </p>
        </div>
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500/70 mb-0.5">Collected</p>
          <p className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400 leading-none">
            {formatCurrency(branch.feeCollected)}
          </p>
        </div>
        <div className={`rounded-xl px-3 py-2.5 ${branch.feePending > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-slate-50 dark:bg-slate-700/40'}`}>
          <p className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${branch.feePending > 0 ? 'text-red-400/70' : 'text-gray-400 dark:text-slate-500'}`}>
            Pending
          </p>
          <p className={`text-sm font-extrabold leading-none ${branch.feePending > 0 ? 'text-red-700 dark:text-red-400' : 'text-gray-500 dark:text-slate-400'}`}>
            {branch.feePending > 0 ? formatCurrency(branch.feePending) : '—'}
          </p>
        </div>
      </div>

      {/* Collection rate */}
      {total > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10.5px] font-semibold text-gray-400 dark:text-slate-500">Collection Rate</p>
            <span className={`text-[10.5px] font-extrabold ${rateTextColor}`}>{collectionRate}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${rateColor}`}
              style={{ width: `${collectionRate}%` }}
            />
          </div>
        </div>
      )}

      {/* Enter view */}
      <button
        onClick={onEnter}
        className="mt-auto w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-blue-200 dark:border-blue-700/60 text-blue-600 dark:text-blue-400 text-xs font-semibold hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
        </svg>
        Enter Branch View
      </button>
    </div>
  );
}

const QUICK_LINKS = [
  {
    to: '/group/inventory',
    label: 'Assets & Finance',
    desc: 'Surplus, expenses & inventory',
    iconD: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
    color: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:group-hover:bg-emerald-900/50',
  },
  {
    to: '/group/branches',
    label: 'Manage Branches',
    desc: 'Add, edit, and configure branches',
    iconD: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
    color: 'bg-blue-50 text-blue-600 group-hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:group-hover:bg-blue-900/50',
  },
  {
    to: '/group/staff',
    label: 'Staff & HR',
    desc: 'Manage staff across all branches',
    iconD: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zM7 13a3 3 0 100-6 3 3 0 000 6z',
    color: 'bg-violet-50 text-violet-600 group-hover:bg-violet-100 dark:bg-violet-900/30 dark:text-violet-400 dark:group-hover:bg-violet-900/50',
  },
  {
    to: '/group/fees',
    label: 'Fee Management',
    desc: 'Challans, collections & reports',
    iconD: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
    color: 'bg-amber-50 text-amber-600 group-hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:group-hover:bg-amber-900/50',
  },
  {
    to: '/group/payroll',
    label: 'Payroll',
    desc: 'Process staff salaries',
    iconD: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    color: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:group-hover:bg-emerald-900/50',
  },
  {
    to: '/group/admission',
    label: 'Admissions',
    desc: 'Review & process applications',
    iconD: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
    color: 'bg-teal-50 text-teal-600 group-hover:bg-teal-100 dark:bg-teal-900/30 dark:text-teal-400 dark:group-hover:bg-teal-900/50',
  },
  {
    to: '/group/attendance',
    label: 'Attendance',
    desc: 'Oversight across all branches',
    iconD: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
    color: 'bg-cyan-50 text-cyan-600 group-hover:bg-cyan-100 dark:bg-cyan-900/30 dark:text-cyan-400 dark:group-hover:bg-cyan-900/50',
  },
  {
    to: '/group/exams',
    label: 'Exams & Results',
    desc: 'Schedules, results & reports',
    iconD: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    color: 'bg-rose-50 text-rose-600 group-hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400 dark:group-hover:bg-rose-900/50',
  },
  {
    to: '/group/sops',
    label: 'SOPs & Policies',
    desc: 'Publish org-wide procedures',
    iconD: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 12h6m-6 4h3',
    color: 'bg-fuchsia-50 text-fuchsia-600 group-hover:bg-fuchsia-100 dark:bg-fuchsia-900/30 dark:text-fuchsia-400 dark:group-hover:bg-fuchsia-900/50',
  },
  {
    to: '/group/roles',
    label: 'Roles & Permissions',
    desc: 'View staff role hierarchy',
    iconD: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    color: 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:group-hover:bg-indigo-900/50',
  },
  {
    to: '/group/academic',
    label: 'Academic Setup',
    desc: 'Years, classes & sections',
    iconD: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
    color: 'bg-sky-50 text-sky-600 group-hover:bg-sky-100 dark:bg-sky-900/30 dark:text-sky-400 dark:group-hover:bg-sky-900/50',
  },
  {
    to: '/group/settings',
    label: 'Group Settings',
    desc: 'Branding, website & subscription',
    iconD: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
    color: 'bg-gray-50 text-gray-600 group-hover:bg-gray-100 dark:bg-slate-700 dark:text-slate-300 dark:group-hover:bg-slate-600',
  },
];

// ── Plan / status display maps ─────────────────────────────
const PLAN_BADGE: Record<string, string> = {
  starter: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
  growth:  'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  scale:   'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300',
};
const STATUS_BADGE: Record<string, { label: string; dot: string; chip: string }> = {
  active:    { label: 'Active',    dot: 'bg-emerald-500', chip: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' },
  trial:     { label: 'Trial',     dot: 'bg-amber-400',   chip: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' },
  suspended: { label: 'Suspended', dot: 'bg-red-500',     chip: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' },
};

// ── Main Component ─────────────────────────────────────────
export default function GroupAdminDashboard() {
  const { user, activeBranch, setActiveBranch } = useAuthStore();
  const { isDark } = useThemeStore();
  const navigate = useNavigate();

  // ── Fetch org metadata (plan, status, trial, student count) ──
  const { data: org } = useQuery({
    queryKey: ['org', user?.orgId],
    queryFn: () =>
      api.get<ApiResponse<Organization>>(`/organizations/${user!.orgId}`).then(r => r.data.data!),
    enabled: !!user?.orgId,
  });

  // ── Fetch per-branch stats (students, staff, fees) ──
  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ['branch-stats', currentMonth],
    queryFn: () =>
      api.get<ApiResponse<BranchStat[]>>(`/branches/stats?month=${currentMonth}`).then(r => r.data.data!),
  });

  // ── Org-wide fee summary for current month ──
  const { data: feeSummary = [] } = useQuery({
    queryKey: ['fee-summary', currentMonth],
    queryFn: () => feeService.getSummary({ month: currentMonth }),
  });

  // ── Org-wide fee history — 6 months ──
  const months = last6Months();
  const { data: feeHistory = [] } = useQuery({
    queryKey: ['fee-history-org'],
    queryFn: async () => {
      const results = await Promise.all(months.map(m => feeService.getSummary({ month: m })));
      return months.map((m, i) => {
        const paid = results[i].find(s => s._id === 'paid')?.totalPaid ?? 0;
        const pending = results[i]
          .filter(s => ['unpaid', 'partial', 'overdue'].includes(s._id))
          .reduce((sum, s) => sum + (s.totalNet - s.totalPaid), 0);
        return { month: m.slice(5), paid, pending };
      });
    },
  });

  // ── Notification count ──
  const { data: notifCount = 0 } = useQuery({
    queryKey: ['notif-count'],
    queryFn: notificationService.getUnreadCount,
  });

  const { data: finance } = useQuery({
    queryKey: ['inventory-finance', activeBranch?.id ?? 'all'],
    queryFn: () => inventoryService.finance(),
  });
  const { data: inventory } = useQuery({
    queryKey: ['inventory-dashboard', activeBranch?.id ?? 'all'],
    queryFn: inventoryService.dashboard,
  });

  // ── Org-wide admission pipeline ──
  const { data: admissionStats } = useQuery({
    queryKey: ['admission-stats'],
    queryFn: admissionService.getStats,
  });
  const pendingAdmissions =
    (admissionStats?.byStatus?.submitted ?? 0) + (admissionStats?.byStatus?.under_review ?? 0);

  // ── Derived stats ──
  const activeBranches = branches.filter(b => b.status === 'active');
  const totalStudents = org?.usageBilling?.activeStudents ?? branches.reduce((s, b) => s + b.studentCount, 0);
  const totalStaff    = branches.reduce((s, b) => s + b.staffCount, 0);
  const totalCollected = feeSummary.reduce((s, x) => s + x.totalPaid, 0);
  const totalPending   = feeSummary
    .filter(s => ['unpaid', 'partial', 'overdue'].includes(s._id))
    .reduce((s, x) => s + (x.totalNet - x.totalPaid), 0);

  // ── Attention needed: branches missing a principal, low collection, or inactive ──
  type AttentionItem = { branch: BranchStat; reason: string; tone: 'red' | 'amber' };
  const attentionItems: AttentionItem[] = branches.flatMap(b => {
    const items: AttentionItem[] = [];
    if (b.status === 'inactive') {
      items.push({ branch: b, reason: 'Branch is inactive', tone: 'amber' });
      return items;
    }
    if (!b.principalName) {
      items.push({ branch: b, reason: 'No principal assigned', tone: 'red' });
    }
    const total = b.feeCollected + b.feePending;
    const rate = total > 0 ? (b.feeCollected / total) * 100 : 100;
    if (total > 0 && rate < 50) {
      items.push({ branch: b, reason: `Fee collection at ${Math.round(rate)}%`, tone: 'red' });
    }
    return items;
  });

  // ── Trial banner ──
  const isTrial = org?.status === 'trial';
  const trialDaysLeft = isTrial && org?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(org.trialEndsAt).getTime() - Date.now()) / 86400000))
    : null;

  const greeting = () => {
    const h = today.getHours();
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
  const axisColor = isDark ? '#64748b' : '#6b7280';

  const plan = org?.plan ?? 'starter';
  const statusInfo = STATUS_BADGE[org?.status ?? 'active'] ?? STATUS_BADGE.active;

  function handleEnterBranch(branch: BranchStat) {
    setActiveBranch({ id: branch._id, name: branch.name });
    navigate('/group/students');
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">

      {/* ── Trial warning banner ─────────────────────────── */}
      {isTrial && trialDaysLeft !== null && trialDaysLeft <= 14 && (
        <div className="mb-5 flex items-center gap-3 px-4 py-3 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50">
          <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm text-amber-800 dark:text-amber-300 flex-1">
            Your trial ends in <span className="font-bold">{trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''}</span>.
            Contact <a href="mailto:billing@tws.enterprises" className="underline font-semibold">billing@tws.enterprises</a> to activate a plan.
          </p>
          <Link to="/group/settings?tab=subscription" className="shrink-0 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline">
            View plan →
          </Link>
        </div>
      )}

      {/* ── Welcome header ───────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-0.5">{greeting()}</p>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-slate-100 tracking-tight">
            {user?.name?.split(' ')[0] ?? user?.name}
          </h1>
          <p className="text-sm text-gray-400 dark:text-slate-500 mt-0.5">
            {today.toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Plan + status chips */}
        {org && (
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${PLAN_BADGE[plan] ?? PLAN_BADGE.starter}`}>
              {plan.charAt(0).toUpperCase() + plan.slice(1)}
            </span>
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg ${statusInfo.chip}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
              {statusInfo.label}
            </span>
          </div>
        )}
      </div>

      {/* ── Stat cards ───────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Active Branches"
          value={activeBranches.length}
          sub={branches.length > activeBranches.length ? `${branches.length - activeBranches.length} inactive` : 'All operational'}
          gradient="bg-linear-to-br from-blue-500 to-blue-700"
          icon={
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        />
        <StatCard
          label="Total Students"
          value={totalStudents.toLocaleString('en-PK')}
          sub={`${totalStaff} staff · all branches`}
          gradient="bg-linear-to-br from-violet-500 to-violet-700"
          icon={
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
        <StatCard
          label="Fees Collected"
          value={formatCurrency(totalCollected)}
          sub={currentMonth}
          gradient="bg-linear-to-br from-amber-400 to-orange-500"
          icon={
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Fees Pending"
          value={formatCurrency(totalPending)}
          sub={totalPending > 0 ? 'Across all branches' : 'No outstanding dues'}
          gradient={totalPending > 0 ? 'bg-linear-to-br from-red-500 to-red-700' : 'bg-linear-to-br from-slate-500 to-slate-600'}
          icon={
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      <FinanceSnapshot
        finance={finance}
        inventory={inventory}
        href="/group/inventory"
        scopeLabel={activeBranch?.name ?? 'All campuses'}
      />

      {/* ── Notifications pill (if unread) ──────────────── */}
      {notifCount > 0 && (
        <Link
          to="/group/notifications"
          className="mb-6 flex items-center gap-3 px-4 py-3 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
        >
          <span className="w-7 h-7 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </span>
          <p className="flex-1 text-sm text-blue-800 dark:text-blue-300">
            You have <span className="font-bold">{notifCount} unread notification{notifCount !== 1 ? 's' : ''}</span>
          </p>
          <svg className="w-4 h-4 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      )}

      {/* ── Pending admissions pill ─────────────────────── */}
      {pendingAdmissions > 0 && (
        <Link
          to="/group/admission"
          className="mb-6 flex items-center gap-3 px-4 py-3 rounded-2xl bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-700/50 hover:bg-teal-100 dark:hover:bg-teal-900/30 transition-colors"
        >
          <span className="w-7 h-7 rounded-xl bg-teal-600 flex items-center justify-center shrink-0">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </span>
          <p className="flex-1 text-sm text-teal-800 dark:text-teal-300">
            <span className="font-bold">{pendingAdmissions} admission application{pendingAdmissions !== 1 ? 's' : ''}</span> awaiting review across all branches
          </p>
          <svg className="w-4 h-4 text-teal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      )}

      {/* ── Attention Needed ────────────────────────────── */}
      {attentionItems.length > 0 && (
        <div className="mb-6">
          <h2 className="font-bold text-gray-900 dark:text-slate-100 mb-3">Attention Needed</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {attentionItems.map((item, i) => (
              <div
                key={`${item.branch._id}-${i}`}
                className={`flex items-center gap-3 p-4 rounded-2xl border ${
                  item.tone === 'red'
                    ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30'
                    : 'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30'
                }`}
              >
                <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  item.tone === 'red'
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                    : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                }`}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 truncate">{item.branch.name}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">{item.reason}</p>
                </div>
                <Link
                  to="/group/branches"
                  className="shrink-0 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Review →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Branch Performance ───────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-bold text-gray-900 dark:text-slate-100">Branch Performance</h2>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
              {currentMonth} · fee collection across all branches
            </p>
          </div>
          <Link
            to="/group/branches"
            className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            Manage branches →
          </Link>
        </div>

        {branchesLoading ? (
          <div className="flex items-center justify-center py-16 text-gray-300 dark:text-slate-600">
            <div className="w-7 h-7 border-[3px] border-current border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : branches.length === 0 ? (
          <div className="card px-6 py-12 flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-400 dark:text-blue-500 flex items-center justify-center">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-800 dark:text-slate-100">No branches yet</p>
              <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">Add your first branch to get started</p>
            </div>
            <Link to="/group/branches" className="btn-primary text-sm px-5 py-2.5">
              Add Branch
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {branches.map(branch => (
              <BranchCard
                key={branch._id}
                branch={branch}
                onEnter={() => handleEnterBranch(branch)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Fee Collection Chart ─────────────────────────── */}
      {feeHistory.length > 0 && (
        <div className="card p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 dark:text-slate-100">
              Fee Collection — Last 6 Months
            </h2>
            <span className="text-xs text-gray-400 dark:text-slate-500">All branches combined</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={feeHistory} margin={{ top: 0, right: 0, left: -16, bottom: 0 }}>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} tickFormatter={v => `${Math.round(v / 1000)}k`} />
              <Tooltip
                formatter={v => formatCurrency(Number(v))}
                contentStyle={tooltipStyle}
                cursor={{ fill: isDark ? 'rgba(99,102,241,0.08)' : 'rgba(16,185,129,0.06)' }}
              />
              <Bar dataKey="paid" name="Collected" fill="#10b981" radius={[6, 6, 0, 0]} />
              <Bar dataKey="pending" name="Pending" fill="#fca5a5" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Quick Actions ────────────────────────────────── */}
      <div>
        <h2 className="font-bold text-gray-900 dark:text-slate-100 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {QUICK_LINKS.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className="group flex items-center gap-3 p-4 card hover:border-blue-200 dark:hover:border-blue-700 hover:shadow-md transition-all duration-150"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${link.color}`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={link.iconD} />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 truncate">{link.label}</p>
                <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{link.desc}</p>
              </div>
              <svg className="w-4 h-4 text-gray-300 dark:text-slate-600 shrink-0 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
