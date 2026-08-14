import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import type { Organization, User, ApiResponse } from '../../types';
import Modal from '../../components/ui/Modal';
import UserAvatar from '../../components/ui/UserAvatar';

export default function UsersPage() {
  const qc = useQueryClient();
  const [orgFilter, setOrgFilter] = useState('');
  const [resetId, setResetId] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const { data: orgsData } = useQuery({
    queryKey: ['admin', 'organizations'],
    queryFn: () => api.get<ApiResponse<Organization[]>>('/organizations').then(r => r.data),
  });
  const orgs = orgsData?.data ?? [];

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['admin', 'users', orgFilter],
    queryFn: () => {
      const params: Record<string, string> = {};
      if (orgFilter) params.orgId = orgFilter;
      return api.get<ApiResponse<User[]>>('/users', { params }).then(r => r.data);
    },
  });

  const users = usersData?.data ?? [];
  const total = usersData?.meta?.total ?? users.length;

  const orgName = (orgId?: string) => {
    if (!orgId) return '—';
    return orgs.find(o => o._id === orgId)?.name ?? orgId;
  };

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => api.put(`/users/${id}`, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });

  const resetPassword = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      api.put(`/users/${id}/reset-password`, { newPassword: password }),
    onSuccess: () => { setResetId(''); setNewPassword(''); },
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100">Group Admins</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">One group admin per organization — auto-created on org registration</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 mb-5">
        <label className="block text-xs font-medium text-gray-700 dark:text-slate-400 mb-2">Filter by Organization</label>
        <select
          className="w-full border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-lg px-3 py-2 text-sm"
          value={orgFilter}
          onChange={e => setOrgFilter(e.target.value)}
        >
          <option value="">All organizations</option>
          {orgs.map(o => <option key={o._id} value={o._id}>{o.name}</option>)}
        </select>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 dark:border-slate-700 text-xs text-gray-500 dark:text-slate-400">{total} group admins</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700">
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Email</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Organization</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Status</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
            {isLoading && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 dark:text-slate-500">Loading...</td></tr>
            )}
            {!isLoading && users.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 dark:text-slate-500">No group admins found.</td></tr>
            )}
            {users.map(u => (
              <tr key={u._id} className="hover:bg-gray-50 dark:hover:bg-slate-700/40">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      name={u.name}
                      photoUrl={u.photoUrl}
                      className="h-9 w-9 rounded-xl text-xs"
                      fallbackClassName="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                    />
                    <span className="font-medium text-gray-900 dark:text-slate-100">{u.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-slate-400">{u.email}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-slate-400 text-sm">{orgName(u.orgId)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.active ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                    {u.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => toggleActive.mutate({ id: u._id, active: !u.active })}
                      className="text-xs px-2 py-1 border rounded border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700"
                    >
                      {u.active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => { setResetId(u._id); setNewPassword(''); }}
                      className="text-xs px-2 py-1 border rounded border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    >
                      Reset PW
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!resetId} onClose={() => setResetId('')} title="Reset Password">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-slate-400 mb-1">New Password *</label>
            <input
              type="password"
              className="w-full border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              minLength={8}
              placeholder="Min 8 characters"
            />
          </div>
          <button
            onClick={() => resetPassword.mutate({ id: resetId, password: newPassword })}
            disabled={newPassword.length < 8 || resetPassword.isPending}
            className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {resetPassword.isPending ? 'Resetting...' : 'Reset Password'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
