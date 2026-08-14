import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import type { User, Branch, ApiResponse } from '../../types';
import { useAuthStore } from '../../stores/authStore';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import UserAvatar from '../../components/ui/UserAvatar';

const ROLE_VARIANTS: Record<string, 'info' | 'success' | 'warning' | 'default'> = {
  branch_principal: 'info',
  teacher: 'success',
  accountant: 'warning',
  it_admin: 'warning',
};

const GROUP_ADMIN_ROLES = ['branch_principal', 'teacher', 'accountant', 'it_admin'] as const;
const PRINCIPAL_ROLES = ['teacher', 'accountant', 'it_admin'] as const;

interface CreateForm {
  name: string;
  email: string;
  password: string;
  role: string;
  branchId: string;
  phone: string;
}

export default function StaffPage() {
  const user = useAuthStore(s => s.user);
  const qc = useQueryClient();
  const isGroupAdmin = user?.role === 'group_admin';
  const creatableRoles = isGroupAdmin ? GROUP_ADMIN_ROLES : PRINCIPAL_ROLES;

  const [roleFilter, setRoleFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateForm>({
    name: '', email: '', password: '', role: creatableRoles[0], branchId: '', phone: '',
  });
  const [createError, setCreateError] = useState('');
  const [resetId, setResetId] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.get<ApiResponse<Branch[]>>('/branches').then(r => r.data),
    enabled: isGroupAdmin,
  });
  const branches = branchesData?.data ?? [];

  const { data: staffData, isLoading } = useQuery({
    queryKey: ['staff', roleFilter, branchFilter],
    queryFn: () => {
      const params: Record<string, string> = {};
      if (roleFilter) params.role = roleFilter;
      if (branchFilter) params.branchId = branchFilter;
      return api.get<ApiResponse<User[]>>('/users', { params }).then(r => r.data);
    },
  });
  const staff = staffData?.data ?? [];
  const total = staffData?.meta?.total ?? staff.length;

  const branchName = (branchId?: string) => {
    if (!branchId) return '—';
    return branches.find(b => b._id === branchId)?.name ?? '—';
  };

  const createStaff = useMutation({
    mutationFn: (body: Partial<CreateForm>) => api.post('/users', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff'] });
      setShowCreate(false);
      setForm({ name: '', email: '', password: '', role: creatableRoles[0], branchId: '', phone: '' });
      setCreateError('');
    },
    onError: (err: any) => setCreateError(err?.response?.data?.message ?? 'Failed to create staff member'),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => api.put(`/users/${id}`, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }),
  });

  const resetPassword = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      api.put(`/users/${id}/reset-password`, { newPassword: password }),
    onSuccess: () => { setResetId(''); setNewPassword(''); },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Partial<CreateForm> = { ...form };
    if (!isGroupAdmin) {
      delete payload.branchId;
    } else if (!form.branchId) {
      delete payload.branchId;
    }
    if (!form.phone) delete payload.phone;
    createStaff.mutate(payload);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100">Staff Management</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            {isGroupAdmin
              ? 'Manage branch principals and staff across your organization'
              : 'Manage teachers and staff for your branch'}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Add Staff
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex gap-2 flex-wrap">
          {(['', ...creatableRoles] as const).map(r => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                roleFilter === r
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
            >
              {r === '' ? 'All Roles' : r.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
        {isGroupAdmin && branches.length > 0 && (
          <select
            className="border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-1.5 text-xs text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-700"
            value={branchFilter}
            onChange={e => setBranchFilter(e.target.value)}
          >
            <option value="">All Branches</option>
            {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
          </select>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 dark:border-slate-700 text-xs text-gray-500 dark:text-slate-400">{total} staff members</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700">
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Email</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Role</th>
              {isGroupAdmin && <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Branch</th>}
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Status</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
            {isLoading && (
              <tr><td colSpan={isGroupAdmin ? 6 : 5} className="px-4 py-8 text-center text-gray-400 dark:text-slate-500">Loading...</td></tr>
            )}
            {!isLoading && staff.length === 0 && (
              <tr><td colSpan={isGroupAdmin ? 6 : 5} className="px-4 py-8 text-center text-gray-400 dark:text-slate-500">No staff found.</td></tr>
            )}
            {staff.map(s => (
              <tr key={s._id} className="hover:bg-gray-50 dark:hover:bg-slate-700/40">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      name={s.name}
                      photoUrl={s.profilePhotoUrl}
                      className="h-9 w-9 rounded-xl text-xs"
                      fallbackClassName="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                    />
                    <span className="font-medium text-gray-900 dark:text-slate-100">{s.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{s.email}</td>
                <td className="px-4 py-3">
                  <Badge variant={ROLE_VARIANTS[s.role] ?? 'default'}>{s.role.replace(/_/g, ' ')}</Badge>
                </td>
                {isGroupAdmin && (
                  <td className="px-4 py-3 text-gray-500 dark:text-slate-400 text-xs">{branchName(s.branchId)}</td>
                )}
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.active ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                    {s.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => toggleActive.mutate({ id: s._id, active: !s.active })}
                      className="text-xs px-2 py-1 border rounded border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700"
                    >
                      {s.active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => { setResetId(s._id); setNewPassword(''); }}
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

      {/* Create Modal */}
      <Modal
        open={showCreate}
        onClose={() => { setShowCreate(false); setCreateError(''); setForm({ name: '', email: '', password: '', role: creatableRoles[0], branchId: '', phone: '' }); }}
        title="Add Staff Member"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {createError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{createError}</div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-slate-400 mb-1">Full Name *</label>
            <input
              className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-slate-400 mb-1">Email *</label>
            <input
              type="email"
              className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-slate-400 mb-1">Role *</label>
            <select
              className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
            >
              {creatableRoles.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          {isGroupAdmin && (
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-slate-400 mb-1">Branch *</label>
              <select
                className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.branchId}
                onChange={e => setForm(f => ({ ...f, branchId: e.target.value }))}
                required
              >
                <option value="">Select branch...</option>
                {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-slate-400 mb-1">Password *</label>
            <input
              type="password"
              className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required
              minLength={8}
              placeholder="Min 8 characters"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-slate-400 mb-1">Phone</label>
            <input
              className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            />
          </div>
          <button
            type="submit"
            disabled={createStaff.isPending}
            className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {createStaff.isPending ? 'Creating...' : 'Add Staff Member'}
          </button>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal open={!!resetId} onClose={() => setResetId('')} title="Reset Password">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-slate-400 mb-1">New Password *</label>
            <input
              type="password"
              className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
