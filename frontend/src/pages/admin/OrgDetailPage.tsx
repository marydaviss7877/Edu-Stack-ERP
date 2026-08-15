import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import type { Organization, ApiResponse } from '../../types';
import { formatDate } from '../../lib/utils';
import { schoolUrl } from '../../utils/tenant';

const PLAN_LABELS = { starter: 'Starter', growth: 'Growth', scale: 'Scale' };
const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  trial: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
  suspended: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
};

export default function OrgDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', contactEmail: '', contactPhone: '', plan: '', status: '' });
  const [saveErr, setSaveErr] = useState('');

  const { data, isLoading } = useQuery<Organization>({
    queryKey: ['admin', 'org', id],
    queryFn: () => api.get<ApiResponse<Organization>>(`/organizations/${id}`).then(r => {
      const org = r.data.data!;
      setForm({
        name: org.name,
        contactEmail: org.contactEmail,
        contactPhone: org.contactPhone ?? '',
        plan: org.plan,
        status: org.status,
      });
      return org;
    }),
  });

  const update = useMutation({
    mutationFn: (body: typeof form) => api.put<ApiResponse<Organization>>(`/organizations/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'org', id] });
      qc.invalidateQueries({ queryKey: ['admin', 'organizations'] });
      setEditing(false);
      setSaveErr('');
    },
    onError: (err: any) => setSaveErr(err?.response?.data?.message ?? 'Update failed'),
  });

  if (isLoading) {
    return (
      <div className="p-6 text-center text-sm text-gray-400 dark:text-slate-500">Loading...</div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center text-sm text-red-500">Organization not found.</div>
    );
  }

  const org = data;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Back + header */}
      <button
        onClick={() => navigate('/organizations')}
        className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 mb-6 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Organizations
      </button>

      {/* Org header card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 mb-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 flex items-center justify-center text-lg font-bold shrink-0">
              {org.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100">{org.name}</h1>
              <p className="text-sm text-gray-400 dark:text-slate-500 mt-0.5">{schoolUrl(org.slug).replace('https://', '')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_STYLES[org.status]}`}>
              {org.status}
            </span>
            <button
              onClick={() => setEditing(e => !e)}
              className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              {editing ? 'Cancel' : 'Edit'}
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-gray-100 dark:border-slate-700">
          <div>
            <p className="text-xs text-gray-400 dark:text-slate-500">Plan</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 capitalize mt-0.5">{org.plan}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 dark:text-slate-500">Active Students</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 mt-0.5">{org.usageBilling.activeStudents ?? 0}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 dark:text-slate-500">Registered</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 mt-0.5">{formatDate(org.createdAt)}</p>
          </div>
        </div>
      </div>

      {/* Edit form */}
      {editing && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 mb-5">
          <h2 className="font-semibold text-gray-900 dark:text-slate-100 mb-4">Edit Organization</h2>
          {saveErr && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400 rounded-lg px-4 py-2.5 text-sm mb-4">{saveErr}</div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 dark:text-slate-400 mb-1">Organization Name</label>
              <input
                className="w-full border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-slate-400 mb-1">Contact Email</label>
              <input
                type="email"
                className="w-full border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.contactEmail}
                onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-slate-400 mb-1">Contact Phone</label>
              <input
                className="w-full border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.contactPhone}
                onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-slate-400 mb-1">Plan</label>
              <select
                className="w-full border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.plan}
                onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}
              >
                {Object.entries(PLAN_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-slate-400 mb-1">Status</label>
              <select
                className="w-full border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              >
                <option value="trial">Trial</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>
          <button
            onClick={() => update.mutate(form)}
            disabled={update.isPending}
            className="mt-4 w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {update.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}

      {/* Info card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 mb-5">
        <h2 className="font-semibold text-gray-900 dark:text-slate-100 mb-4">Details</h2>
        <dl className="space-y-3">
          {[
            { label: 'Contact Email', value: org.contactEmail },
            { label: 'Contact Phone', value: org.contactPhone ?? '—' },
            { label: 'Slug', value: schoolUrl(org.slug).replace('https://', '') },
            { label: 'Trial Ends', value: org.trialEndsAt ? formatDate(org.trialEndsAt) : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-slate-700/50 last:border-0">
              <dt className="text-sm text-gray-500 dark:text-slate-400">{label}</dt>
              <dd className="text-sm font-medium text-gray-900 dark:text-slate-100">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Add-ons card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
        <h2 className="font-semibold text-gray-900 dark:text-slate-100 mb-1">Add-ons</h2>
        <p className="text-xs text-gray-400 dark:text-slate-500 mb-4">Premium features unlocked per organization.</p>
        <div className="flex items-center justify-between py-3 border-b border-gray-50 dark:border-slate-700/50">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-slate-100">Public Website Builder</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
              Lets the school publish a branded website at their subdomain.
            </p>
          </div>
          <button
            onClick={() => update.mutate({ ...data, websiteAddon: !org.websiteAddon } as any)}
            disabled={update.isPending}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 ${org.websiteAddon ? 'bg-blue-600' : 'bg-gray-200 dark:bg-slate-600'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${org.websiteAddon ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-slate-100">Peer Feedback (AI)</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
              AI-generated, aggregated-only peer feedback surveys. Off by default — see the requirements doc before enabling for a school.
            </p>
          </div>
          <button
            onClick={() => update.mutate({ ...data, peerFeedbackAddon: !org.peerFeedbackAddon } as any)}
            disabled={update.isPending}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 ${org.peerFeedbackAddon ? 'bg-blue-600' : 'bg-gray-200 dark:bg-slate-600'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${org.peerFeedbackAddon ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
