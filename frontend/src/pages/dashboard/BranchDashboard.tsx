import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { studentService } from '../../services/studentService';
import { feeService } from '../../services/feeService';
import { academicService } from '../../services/academicService';
import { notificationService } from '../../services/notificationService';
import { formatCurrency } from '../../lib/utils';
import { inventoryService } from '../../services/inventoryService';
import FinanceSnapshot from '../../components/inventory/FinanceSnapshot';

const today = new Date();
const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
const MONTHS_BACK = 6;

function last6Months() {
  return Array.from({ length: MONTHS_BACK }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - (MONTHS_BACK - 1 - i), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
}

const PIE_COLORS = {
  paid: '#10b981',
  unpaid: '#ef4444',
  partial: '#f59e0b',
  waived: '#3b82f6',
  overdue: '#dc2626',
};

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

const QUICK_LINKS = [
  {
    to: '/dashboard/inventory',
    label: 'Assets & Finance',
    desc: 'Expenses, stock & surplus',
    roles: ['accountant', 'branch_principal', 'it_admin'],
    icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
    color: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:group-hover:bg-emerald-900/50',
  },
  {
    to: '/dashboard/attendance',
    label: 'Mark Attendance',
    desc: 'Today\'s class attendance',
    roles: ['teacher', 'branch_principal'],
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
    color: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:group-hover:bg-emerald-900/50',
  },
  {
    to: '/dashboard/students',
    label: 'Student Admissions',
    desc: 'Manage student records',
    roles: ['branch_principal', 'it_admin'],
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
    color: 'bg-violet-50 text-violet-600 group-hover:bg-violet-100 dark:bg-violet-900/30 dark:text-violet-400 dark:group-hover:bg-violet-900/50',
  },
  {
    to: '/dashboard/fees',
    label: 'Fee Collection',
    desc: 'View & process challans',
    roles: ['accountant', 'branch_principal'],
    icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
    color: 'bg-amber-50 text-amber-600 group-hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:group-hover:bg-amber-900/50',
  },
  {
    to: '/dashboard/payroll',
    label: 'Process Payroll',
    desc: 'Staff salary management',
    roles: ['accountant'],
    icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    color: 'bg-blue-50 text-blue-600 group-hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:group-hover:bg-blue-900/50',
  },
  {
    to: '/dashboard/exams',
    label: 'Exam Results',
    desc: 'Enter & view results',
    roles: ['teacher', 'branch_principal'],
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    color: 'bg-rose-50 text-rose-600 group-hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400 dark:group-hover:bg-rose-900/50',
  },
  {
    to: '/dashboard/assignments',
    label: 'Assignments',
    desc: 'View & submit work',
    roles: ['student', 'teacher'],
    icon: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z',
    color: 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:group-hover:bg-indigo-900/50',
  },
  {
    to: '/dashboard/timetable',
    label: 'My Timetable',
    desc: 'Classes & schedule',
    roles: ['student', 'teacher'],
    icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    color: 'bg-teal-50 text-teal-600 group-hover:bg-teal-100 dark:bg-teal-900/30 dark:text-teal-400 dark:group-hover:bg-teal-900/50',
  },
  {
    to: '/dashboard/notifications',
    label: 'Notifications',
    desc: 'School announcements',
    roles: ['branch_principal', 'teacher', 'student', 'accountant', 'it_admin'],
    icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
    color: 'bg-gray-50 text-gray-600 group-hover:bg-gray-100 dark:bg-slate-700 dark:text-slate-300 dark:group-hover:bg-slate-600',
  },
];

export default function BranchDashboard() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const { isDark } = useThemeStore();
  const isAccountant = user?.role === 'accountant';
  const canViewFinance = user?.role === 'accountant' || user?.role === 'branch_principal';

  const { data: years = [] } = useQuery({
    queryKey: ['years'],
    queryFn: academicService.getYears,
  });
  const currentYear = years.find((y) => y.isCurrent) ?? years[0];

  const { data: studentsResp } = useQuery({
    queryKey: ['students-count', currentYear?._id],
    queryFn: () => studentService.list({ academicYearId: currentYear!._id, status: 'active' }),
    enabled: !!currentYear,
  });
  const totalStudents = studentsResp?.meta?.total ?? studentsResp?.data?.length ?? 0;

  const { data: feeSummary = [] } = useQuery({
    queryKey: ['fee-summary', currentMonth],
    queryFn: () => feeService.getSummary({ month: currentMonth }),
  });

  const { data: notifCount = 0 } = useQuery({
    queryKey: ['notif-count'],
    queryFn: notificationService.getUnreadCount,
  });

  const { data: finance } = useQuery({
    queryKey: ['inventory-finance', user?.branchId],
    queryFn: () => inventoryService.finance(),
    enabled: canViewFinance,
  });
  const { data: inventory } = useQuery({
    queryKey: ['inventory-dashboard', user?.branchId],
    queryFn: inventoryService.dashboard,
    enabled: canViewFinance,
  });

  const months = last6Months();
  const { data: feeHistory = [] } = useQuery({
    queryKey: ['fee-history'],
    queryFn: async () => {
      const results = await Promise.all(months.map((m) => feeService.getSummary({ month: m })));
      return months.map((m, i) => {
        const paid = results[i].find((s) => s._id === 'paid')?.totalPaid ?? 0;
        const pending = results[i]
          .filter((s) => ['unpaid', 'partial', 'overdue'].includes(s._id))
          .reduce((sum, s) => sum + (s.totalNet - s.totalPaid), 0);
        return { month: m.slice(5), paid, pending };
      });
    },
    enabled: !isAccountant,
  });

  const totalCollected = feeSummary.reduce((s, x) => s + x.totalPaid, 0);
  const totalPending = feeSummary
    .filter((s) => ['unpaid', 'partial', 'overdue'].includes(s._id))
    .reduce((s, x) => s + (x.totalNet - x.totalPaid), 0);
  const pieData = feeSummary.map((s) => ({ name: s._id, value: s.count })).filter((s) => s.value > 0);

  const filteredQuickLinks = QUICK_LINKS.filter(
    (l) => !user?.role || l.roles.includes(user.role)
  );

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

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">

      {/* Welcome header */}
      <div className="mb-6">
        <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-0.5">{greeting()}</p>
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-slate-100 tracking-tight">
          {t('dashboard.welcome', { name: user?.name?.split(' ')[0] ?? user?.name })}
        </h1>
        <p className="text-sm text-gray-400 dark:text-slate-500 mt-0.5">
          {today.toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Active Students"
            value={totalStudents.toLocaleString('en-PK')}
            sub={currentYear?.label}
            gradient="bg-linear-to-br from-blue-500 to-blue-700"
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
            label="Pending Fees"
            value={formatCurrency(totalPending)}
            sub={currentMonth}
            gradient={totalPending > 0 ? 'bg-linear-to-br from-red-500 to-red-700' : 'bg-linear-to-br from-slate-500 to-slate-600'}
            icon={
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            label="Notifications"
            value={notifCount}
            sub={notifCount > 0 ? 'Unread messages' : 'All caught up'}
            gradient="bg-linear-to-br from-violet-500 to-violet-700"
            icon={
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            }
          />
        </div>

      {canViewFinance && (
        <FinanceSnapshot
          finance={finance}
          inventory={inventory}
          href="/dashboard/inventory"
          scopeLabel="Campus"
        />
      )}

      {/* Charts row */}
      {(feeHistory.length > 0 || pieData.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {feeHistory.length > 0 && (
            <div className="lg:col-span-2 card p-5">
              <h2 className="font-bold text-gray-900 dark:text-slate-100 mb-4">Fee Collection — Last 6 Months</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={feeHistory} margin={{ top: 0, right: 0, left: -16, bottom: 0 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <Tooltip
                    formatter={(v) => formatCurrency(Number(v))}
                    contentStyle={tooltipStyle}
                    cursor={{ fill: isDark ? 'rgba(99,102,241,0.08)' : 'rgba(16,185,129,0.06)' }}
                  />
                  <Bar dataKey="paid" name="Collected" fill="#10b981" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="pending" name="Pending" fill="#fca5a5" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {pieData.length > 0 && (
            <div className="card p-5">
              <h2 className="font-bold text-gray-900 dark:text-slate-100 mb-4">Challans — {currentMonth}</h2>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={PIE_COLORS[entry.name as keyof typeof PIE_COLORS] ?? '#94a3b8'} />
                    ))}
                  </Pie>
                  <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '11px', color: isDark ? '#94a3b8' : undefined }} />
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Quick actions */}
      {filteredQuickLinks.length > 0 && (
        <div>
          <h2 className="font-bold text-gray-900 dark:text-slate-100 mb-3">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {filteredQuickLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="group flex items-center gap-3 p-4 card hover:border-blue-200 dark:hover:border-blue-700 hover:shadow-md transition-all duration-150"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${link.color}`}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={link.icon} />
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
      )}
    </div>
  );
}
