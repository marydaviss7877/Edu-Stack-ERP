import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import type { Organization, ApiResponse } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import { schoolUrl } from '../../utils/tenant';

interface UsageMetric {
  _id: string;
  orgId: string;
  branchId?: string;
  month: string;
  activeStudents: number;
  plan: string;
  pricePerStudent: number;
  totalAmount: number;
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
      <p className="text-sm text-gray-500 dark:text-slate-400">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-slate-100 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

const today = new Date();
const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

export default function BillingPage() {
  const [month, setMonth] = useState(currentMonth);

  const { data: orgsData } = useQuery({
    queryKey: ['admin', 'organizations'],
    queryFn: () => api.get<ApiResponse<Organization[]>>('/organizations').then(r => r.data),
  });

  const { data: usageData, isLoading } = useQuery({
    queryKey: ['admin', 'usage-metrics', month],
    queryFn: () => api.get<ApiResponse<UsageMetric[]>>('/organizations/usage-metrics', { params: { month } }).then(r => r.data),
  });

  const orgs = orgsData?.data ?? [];
  const metrics = usageData?.data ?? [];

  const orgMap = Object.fromEntries(orgs.map(o => [o._id, o]));

  const totalRevenue = metrics.reduce((s, m) => s + m.totalAmount, 0);
  const totalStudents = metrics.reduce((s, m) => s + m.activeStudents, 0);
  const uniqueOrgs = new Set(metrics.map(m => m.orgId)).size;

  const months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100">Usage & Billing</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Per-student billing metrics</p>
        </div>
        <select
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="text-sm border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-lg px-3 py-1.5"
        >
          {months.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Revenue" value={formatCurrency(totalRevenue)} sub={month} />
        <StatCard label="Billed Students" value={totalStudents.toLocaleString()} sub={month} />
        <StatCard label="Billing Orgs" value={uniqueOrgs} sub="with active usage" />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700">
          <h2 className="font-semibold text-gray-900 dark:text-slate-100">Usage Breakdown — {month}</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700">
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Organization</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Plan</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Students</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Rate/Student</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
            {isLoading && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 dark:text-slate-500">Loading...</td></tr>
            )}
            {!isLoading && metrics.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 dark:text-slate-500">No billing data for {month}.</td></tr>
            )}
            {metrics.map(m => {
              const org = orgMap[m.orgId];
              return (
                <tr key={m._id} className="hover:bg-gray-50 dark:hover:bg-slate-700/40">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-slate-100">{org?.name ?? m.orgId}</p>
                    {org && <p className="text-xs text-gray-400 dark:text-slate-500">{schoolUrl(org.slug).replace('https://', '')}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-slate-400 capitalize">{m.plan}</td>
                  <td className="px-4 py-3 text-center text-gray-600 dark:text-slate-400">{m.activeStudents}</td>
                  <td className="px-4 py-3 text-center text-gray-600 dark:text-slate-400">{formatCurrency(m.pricePerStudent)}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-slate-100">{formatCurrency(m.totalAmount)}</td>
                </tr>
              );
            })}
            {metrics.length > 0 && (
              <tr className="bg-gray-50 dark:bg-slate-700/50 border-t border-gray-200 dark:border-slate-700">
                <td colSpan={4} className="px-4 py-3 font-semibold text-gray-900 dark:text-slate-100 text-right">Total</td>
                <td className="px-4 py-3 font-bold text-gray-900 dark:text-slate-100 text-right">{formatCurrency(totalRevenue)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Per-org summary */}
      {orgs.length > 0 && (
        <div className="mt-6 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700">
            <h2 className="font-semibold text-gray-900 dark:text-slate-100">All Organizations</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {orgs.map(org => (
              <div key={org._id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{org.name}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500">{org.slug} · {org.plan} plan</p>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-right">
                    <p className="font-medium text-gray-900 dark:text-slate-100">{org.usageBilling.activeStudents ?? 0}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500">active students</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400 dark:text-slate-500">last counted</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{org.usageBilling.lastCountedAt ? formatDate(org.usageBilling.lastCountedAt) : '—'}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    org.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' :
                    org.status === 'trial' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400' :
                    'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                  }`}>
                    {org.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
