import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { formatCurrency, formatDate } from '../../lib/utils';
import { schoolUrl } from '../../utils/tenant';
import api from '../../services/api';
import type { Organization, ApiResponse } from '../../types';

interface UsageMetric {
  orgId: string;
  branchId: string;
  month: string;
  activeStudents: number;
  plan: string;
  totalAmount: number;
}

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
      {/* Decorative circles */}
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

const OrgIcon = () => (
  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);
const StudentsIcon = () => (
  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const RevenueIcon = () => (
  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const AlertIcon = () => (
  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const statusStyles: Record<string, string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  trial: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  suspended: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
};

export default function SuperAdminDashboard() {
  const { t } = useTranslation();

  const { data: orgsData, isLoading: orgsLoading } = useQuery({
    queryKey: ['admin', 'organizations'],
    queryFn: () => api.get<ApiResponse<Organization[]>>('/organizations').then((r) => r.data),
  });

  const { data: usageData } = useQuery({
    queryKey: ['admin', 'usage-metrics'],
    queryFn: () =>
      api.get<ApiResponse<UsageMetric[]>>('/organizations/usage-metrics').then((r) => r.data),
  });

  const orgs = orgsData?.data ?? [];
  const usage = usageData?.data ?? [];

  const activeOrgs = orgs.filter((o) => o.status === 'active').length;
  const trialOrgs = orgs.filter((o) => o.status === 'trial').length;
  const suspendedOrgs = orgs.filter((o) => o.status === 'suspended').length;
  const totalStudents = orgs.reduce((s, o) => s + (o.usageBilling.activeStudents ?? 0), 0);
  const totalRevenue = usage.reduce((s, u) => s + u.totalAmount, 0);

  return (
    <div className="p-6 max-w-6xl mx-auto">

      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-slate-100 tracking-tight">
            {t('dashboard.title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            Platform-wide metrics — {new Date().toLocaleDateString('en-PK', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <Link
          to="/organizations"
          className="btn-primary"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Organization
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Organizations"
          value={orgs.length}
          sub={`${activeOrgs} active · ${trialOrgs} trial`}
          gradient="bg-linear-to-br from-blue-500 to-blue-700"
          icon={<OrgIcon />}
        />
        <StatCard
          label="Active Students"
          value={totalStudents.toLocaleString('en-PK')}
          sub="across all branches"
          gradient="bg-linear-to-br from-violet-500 to-violet-700"
          icon={<StudentsIcon />}
        />
        <StatCard
          label="Monthly Revenue"
          value={formatCurrency(totalRevenue)}
          sub="current billing period"
          gradient="bg-linear-to-br from-amber-400 to-orange-500"
          icon={<RevenueIcon />}
        />
        <StatCard
          label="Suspended"
          value={suspendedOrgs}
          sub={suspendedOrgs > 0 ? 'Needs attention' : 'All accounts healthy'}
          gradient={suspendedOrgs > 0 ? 'bg-linear-to-br from-red-500 to-red-700' : 'bg-linear-to-br from-slate-500 to-slate-700'}
          icon={<AlertIcon />}
        />
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Active', count: activeOrgs, color: 'text-green-600 bg-green-50 border-green-100 dark:text-green-400 dark:bg-green-900/20 dark:border-green-800' },
          { label: 'Trial', count: trialOrgs, color: 'text-amber-600 bg-amber-50 border-amber-100' },
          { label: 'Suspended', count: suspendedOrgs, color: 'text-red-600 bg-red-50 border-red-100' },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border px-4 py-3 flex items-center justify-between ${s.color}`}>
            <span className="text-sm font-semibold">{s.label}</span>
            <span className="text-xl font-extrabold">{s.count}</span>
          </div>
        ))}
      </div>

      {/* Organizations table */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700">
          <div>
            <h2 className="font-bold text-gray-900 dark:text-slate-100">Organizations</h2>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{orgs.length} total registered</p>
          </div>
          <Link to="/organizations" className="text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
            View all →
          </Link>
        </div>

        {orgsLoading ? (
          <div className="px-6 py-12 flex items-center justify-center gap-3 text-gray-400 dark:text-slate-500">
            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm">Loading organizations…</span>
          </div>
        ) : orgs.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-3">
              <OrgIcon />
            </div>
            <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-1">No organizations yet</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mb-4">Add your first school to get started</p>
            <Link to="/organizations" className="btn-primary text-xs px-4 py-2">
              Add Organization
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-slate-700">
            {orgs.slice(0, 10).map((org) => (
              <div
                key={org._id}
                className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-slate-700/40 transition-colors group"
              >
                {/* Org avatar */}
                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 flex items-center justify-center text-xs font-bold shrink-0">
                  {org.name.slice(0, 2).toUpperCase()}
                </div>

                {/* Org info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 truncate">{org.name}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{schoolUrl(org.slug).replace('https://', '')}</p>
                </div>

                {/* Students */}
                <div className="hidden sm:flex items-center gap-1.5 text-sm text-gray-500 dark:text-slate-400 shrink-0">
                  <svg className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-xs font-medium">{(org.usageBilling.activeStudents ?? 0).toLocaleString()}</span>
                </div>

                {/* Status badge */}
                <span className={`hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${statusStyles[org.status] ?? statusStyles.suspended}`}>
                  {org.status}
                </span>

                {/* Date */}
                <span className="hidden lg:block text-xs text-gray-400 dark:text-slate-500 shrink-0 w-24 text-right">
                  {formatDate(org.createdAt)}
                </span>

                {/* Action */}
                <Link
                  to={`/organizations/${org._id}`}
                  className="hidden group-hover:flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors shrink-0"
                >
                  Manage
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
