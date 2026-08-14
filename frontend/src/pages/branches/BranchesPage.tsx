import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import type { Branch, ApiResponse } from '../../types';
import { useAuthStore } from '../../stores/authStore';
import Modal from '../../components/ui/Modal';

interface CreateForm {
  name: string;
  city: string;
  code: string;
  address: string;
  phone: string;
  email: string;
}

interface EditForm {
  name: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  principalName: string;
  academicThresholds: {
    weakThreshold: number;
    failingThreshold: number;
    clearancePassMark: number;
  };
}

const EMPTY_CREATE: CreateForm = { name: '', city: '', code: '', address: '', phone: '', email: '' };

function autoCode(name: string): string {
  return name.trim().split(/\s+/).map(w => w[0]?.toUpperCase() ?? '').join('');
}

export default function BranchesPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { setActiveBranch } = useAuthStore();

  const [showCreate, setShowCreate] = useState(false);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [form, setForm] = useState<CreateForm>(EMPTY_CREATE);
  const [editForm, setEditForm] = useState<EditForm>({
    name: '', city: '', address: '', phone: '', email: '', principalName: '',
    academicThresholds: { weakThreshold: 50, failingThreshold: 40, clearancePassMark: 40 },
  });
  const [createError, setCreateError] = useState('');
  const [editError, setEditError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.get<ApiResponse<Branch[]>>('/branches').then(r => r.data),
  });
  const branches = data?.data ?? [];

  const createBranch = useMutation({
    mutationFn: (body: CreateForm) => api.post('/branches', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branches'] });
      setShowCreate(false);
      setForm(EMPTY_CREATE);
      setCreateError('');
    },
    onError: (err: any) => setCreateError(err?.response?.data?.message ?? 'Failed to create branch'),
  });

  const updateBranch = useMutation({
    mutationFn: ({ id, body }: { id: string; body: EditForm }) => api.put(`/branches/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branches'] });
      setEditBranch(null);
      setEditError('');
    },
    onError: (err: any) => setEditError(err?.response?.data?.message ?? 'Failed to update branch'),
  });

  const deactivateBranch = useMutation({
    mutationFn: (id: string) => api.delete(`/branches/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['branches'] }),
  });

  const handleEnterBranch = (branch: Branch) => {
    setActiveBranch({ id: branch._id, name: branch.name });
    navigate('/group');
  };

  const openEdit = (branch: Branch) => {
    setEditBranch(branch);
    setEditForm({
      name: branch.name,
      city: branch.city,
      address: branch.address,
      phone: (branch as any).phone ?? '',
      email: (branch as any).email ?? '',
      principalName: (branch as any).principalName ?? '',
      academicThresholds: {
        weakThreshold: branch.academicThresholds?.weakThreshold ?? 50,
        failingThreshold: branch.academicThresholds?.failingThreshold ?? 40,
        clearancePassMark: branch.academicThresholds?.clearancePassMark ?? 40,
      },
    });
    setEditError('');
  };

  const handleNameChange = (name: string) => {
    setForm(f => ({
      ...f,
      name,
      code: f.code || autoCode(name),
    }));
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100">Branches</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            {branches.length} campus{branches.length !== 1 ? 'es' : ''} in your organization
          </p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setForm(EMPTY_CREATE); setCreateError(''); }}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          + New Branch
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400 dark:text-slate-500 text-sm">Loading branches...</div>
      ) : branches.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-dashed border-gray-300 dark:border-slate-600 px-6 py-16 text-center">
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <p className="text-gray-900 dark:text-slate-100 font-semibold mb-1">No branches yet</p>
          <p className="text-gray-400 dark:text-slate-500 text-sm mb-4">Add your first campus to get started</p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
          >
            + New Branch
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {branches.map(branch => (
            <div
              key={branch._id}
              className={`bg-white dark:bg-slate-800 rounded-xl border p-5 flex flex-col gap-4 ${branch.status === 'inactive' ? 'border-gray-200 dark:border-slate-700 opacity-60' : 'border-gray-200 dark:border-slate-700'}`}
            >
              {/* Branch header */}
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-slate-100 leading-tight">{branch.name}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{branch.city} · {branch.code}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${branch.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                  {branch.status}
                </span>
              </div>

              {/* Branch meta */}
              <div className="text-xs text-gray-500 dark:text-slate-400 space-y-1">
                {(branch as any).principalName && (
                  <p>Principal: <span className="text-gray-700 dark:text-slate-300 font-medium">{(branch as any).principalName}</span></p>
                )}
                {branch.address && branch.address !== '-' && (
                  <p>{branch.address}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1 border-t border-gray-100 dark:border-slate-700">
                <button
                  onClick={() => handleEnterBranch(branch)}
                  disabled={branch.status === 'inactive'}
                  className="flex-1 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Enter Branch View →
                </button>
                <button
                  onClick={() => openEdit(branch)}
                  className="px-3 py-1.5 text-xs text-gray-600 dark:text-slate-400 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Edit
                </button>
                {branch.status === 'active' && (
                  <button
                    onClick={() => deactivateBranch.mutate(branch._id)}
                    className="px-3 py-1.5 text-xs text-red-500 border border-red-100 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Deactivate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        open={showCreate}
        onClose={() => { setShowCreate(false); setCreateError(''); }}
        title="New Branch"
      >
        <form
          onSubmit={e => { e.preventDefault(); createBranch.mutate(form); }}
          className="space-y-4"
        >
          {createError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{createError}</div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-slate-400 mb-1">Branch Name *</label>
            <input
              className="w-full border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm"
              value={form.name}
              onChange={e => handleNameChange(e.target.value)}
              placeholder="e.g. Gulshan Campus"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-slate-400 mb-1">City *</label>
              <input
                className="w-full border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm"
                value={form.city}
                onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                placeholder="Karachi"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-slate-400 mb-1">Short Code</label>
              <input
                className="w-full border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm font-mono"
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="Auto-generated"
                maxLength={10}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-slate-400 mb-1">Address</label>
            <input
              className="w-full border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm"
              value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              placeholder="Can be filled later"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-slate-400 mb-1">Phone</label>
              <input
                className="w-full border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-slate-400 mb-1">Email</label>
              <input
                type="email"
                className="w-full border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={createBranch.isPending}
            className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {createBranch.isPending ? 'Creating...' : 'Create Branch'}
          </button>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={!!editBranch}
        onClose={() => setEditBranch(null)}
        title="Edit Branch"
      >
        <form
          onSubmit={e => { e.preventDefault(); updateBranch.mutate({ id: editBranch!._id, body: editForm }); }}
          className="space-y-4"
        >
          {editError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{editError}</div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-slate-400 mb-1">Branch Name *</label>
            <input
              className="w-full border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm"
              value={editForm.name}
              onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-slate-400 mb-1">City *</label>
              <input
                className="w-full border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm"
                value={editForm.city}
                onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-slate-400 mb-1">Principal Name</label>
              <input
                className="w-full border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm"
                value={editForm.principalName}
                onChange={e => setEditForm(f => ({ ...f, principalName: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-slate-400 mb-1">Address</label>
            <input
              className="w-full border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm"
              value={editForm.address}
              onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-slate-400 mb-1">Phone</label>
              <input
                className="w-full border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm"
                value={editForm.phone}
                onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-slate-400 mb-1">Email</label>
              <input
                type="email"
                className="w-full border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm"
                value={editForm.email}
                onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-slate-400 mb-1.5">Weak-Topic &amp; Clearance Thresholds</label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] text-gray-400 dark:text-slate-500 mb-1">Weak %</label>
                <input
                  type="number" min={0} max={100}
                  className="w-full border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm"
                  value={editForm.academicThresholds.weakThreshold}
                  onChange={e => setEditForm(f => ({ ...f, academicThresholds: { ...f.academicThresholds, weakThreshold: Number(e.target.value) } }))}
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-400 dark:text-slate-500 mb-1">Failing %</label>
                <input
                  type="number" min={0} max={100}
                  className="w-full border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm"
                  value={editForm.academicThresholds.failingThreshold}
                  onChange={e => setEditForm(f => ({ ...f, academicThresholds: { ...f.academicThresholds, failingThreshold: Number(e.target.value) } }))}
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-400 dark:text-slate-500 mb-1">Clearance Pass %</label>
                <input
                  type="number" min={0} max={100}
                  className="w-full border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm"
                  value={editForm.academicThresholds.clearancePassMark}
                  onChange={e => setEditForm(f => ({ ...f, academicThresholds: { ...f.academicThresholds, clearancePassMark: Number(e.target.value) } }))}
                />
              </div>
            </div>
            <p className="text-[10.5px] text-gray-400 dark:text-slate-500 mt-1.5">Below "Weak %" flags a weekly-test topic; below "Failing %" auto-triggers a clearance exam; "Clearance Pass %" clears the flag.</p>
          </div>
          <button
            type="submit"
            disabled={updateBranch.isPending}
            className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {updateBranch.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
