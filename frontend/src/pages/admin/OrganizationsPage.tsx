import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import type { Organization, ApiResponse } from '../../types';
import Modal from '../../components/ui/Modal';
import { formatDate } from '../../lib/utils';
import { schoolUrl } from '../../utils/tenant';

function StatusBadge({ status }: { status: Organization['status'] }) {
  const cls = status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : status === 'trial' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400';
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{status}</span>;
}

interface CreateOrgForm {
  name: string; slug: string; contactEmail: string; contactPhone: string;
  plan: string; adminName: string; adminEmail: string; adminPassword: string;
}

const DEFAULT_FORM: CreateOrgForm = {
  name: '', slug: '', contactEmail: '', contactPhone: '',
  plan: 'starter', adminName: '', adminEmail: '', adminPassword: '',
};

export default function OrganizationsPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [form, setForm] = useState<CreateOrgForm>(DEFAULT_FORM);
  const [createError, setCreateError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'organizations', statusFilter],
    queryFn: () => api.get<ApiResponse<Organization[]>>('/organizations', { params: statusFilter ? { status: statusFilter } : {} }).then(r => r.data),
  });

  const orgs = data?.data ?? [];
  const total = data?.meta?.total ?? orgs.length;

  const createOrg = useMutation({
    mutationFn: (body: CreateOrgForm) => api.post<ApiResponse<{ organization: Organization }>>('/organizations', body).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'organizations'] });
      setShowCreate(false);
      setForm(DEFAULT_FORM);
      setCreateError('');
    },
    onError: (err: any) => setCreateError(err?.response?.data?.message ?? 'Failed to create organization'),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.put(`/organizations/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'organizations'] }),
  });

  const autoSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    createOrg.mutate(form);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100">Organizations</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">{total} total organizations</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          + New Organization
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        {(['', 'trial', 'active', 'suspended'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${statusFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700'}`}
          >
            {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 dark:bg-slate-700/50 dark:border-slate-700">
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Organization</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Plan</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Students</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Created</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
            {isLoading && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 dark:text-slate-500">Loading...</td></tr>
            )}
            {!isLoading && orgs.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 dark:text-slate-500">No organizations found.</td></tr>
            )}
            {orgs.map(org => (
              <tr key={org._id} className="hover:bg-gray-50 dark:hover:bg-slate-700/40 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900 dark:text-slate-100">{org.name}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500">{schoolUrl(org.slug).replace('https://', '')}</p>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-slate-400 capitalize">{org.plan}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-slate-400">{org.usageBilling.activeStudents ?? 0}</td>
                <td className="px-4 py-3"><StatusBadge status={org.status} /></td>
                <td className="px-4 py-3 text-gray-500 dark:text-slate-400">{formatDate(org.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  {org.status === 'active' || org.status === 'trial' ? (
                    <button
                      onClick={() => updateStatus.mutate({ id: org._id, status: 'suspended' })}
                      className="text-xs text-red-600 hover:text-red-700 px-2 py-1 rounded border border-red-200 hover:bg-red-50"
                    >
                      Suspend
                    </button>
                  ) : (
                    <button
                      onClick={() => updateStatus.mutate({ id: org._id, status: 'active' })}
                      className="text-xs text-green-600 hover:text-green-700 px-2 py-1 rounded border border-green-200 hover:bg-green-50"
                    >
                      Activate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); setForm(DEFAULT_FORM); setCreateError(''); }} title="Create Organization" size="xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          {createError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{createError}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-3">Organization Details</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-slate-400 mb-1">Organization Name *</label>
              <input className="w-full border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: autoSlug(e.target.value) }))} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-slate-400 mb-1">Slug *</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} required placeholder="my-school" />
              <p className="text-xs text-gray-400 mt-0.5">{schoolUrl(form.slug).replace('https://', '')}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-slate-400 mb-1">Contact Email *</label>
              <input type="email" className="w-full border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.contactEmail}
                onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-slate-400 mb-1">Contact Phone</label>
              <input className="w-full border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.contactPhone}
                onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-slate-400 mb-1">Plan *</label>
              <select className="w-full border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.plan}
                onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}>
                <option value="starter">Starter</option>
                <option value="growth">Growth</option>
                <option value="scale">Scale</option>
              </select>
            </div>

            <div className="col-span-2 border-t border-gray-100 dark:border-slate-700 pt-3">
              <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-3">Group Admin Account</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-slate-400 mb-1">Admin Name *</label>
              <input className="w-full border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.adminName}
                onChange={e => setForm(f => ({ ...f, adminName: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-slate-400 mb-1">Admin Email *</label>
              <input type="email" className="w-full border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.adminEmail}
                onChange={e => setForm(f => ({ ...f, adminEmail: e.target.value }))} required />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 dark:text-slate-400 mb-1">Admin Password *</label>
              <input type="password" className="w-full border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.adminPassword}
                onChange={e => setForm(f => ({ ...f, adminPassword: e.target.value }))} required minLength={8} />
            </div>
          </div>

          <button type="submit" disabled={createOrg.isPending} className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {createOrg.isPending ? 'Creating...' : 'Create Organization'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
