import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { staffAdvanceService } from '../../services/staffAdvanceService';
import type { AdvanceType } from '../../services/staffAdvanceService';
import { userService } from '../../services/userService';
import Modal from '../ui/Modal';
import Badge from '../ui/Badge';
import { formatCurrency } from '../../lib/utils';

const STATUS_VARIANT: Record<string, 'default' | 'warning' | 'success' | 'danger' | 'info'> = {
  pending: 'warning', approved: 'info', active: 'success', closed: 'default', rejected: 'danger',
};

export default function StaffAdvancesTab({ canManage }: { canManage: boolean }) {
  const qc = useQueryClient();
  const [requestOpen, setRequestOpen] = useState(false);
  const [disburseTarget, setDisburseTarget] = useState<string | null>(null);
  const [disburseMethod, setDisburseMethod] = useState('cash');

  const { data: records = [], isLoading } = useQuery({ queryKey: ['staff-advances'], queryFn: () => staffAdvanceService.list() });
  const { data: staff = [] } = useQuery({ queryKey: ['staff'], queryFn: () => userService.list({ role: 'teacher' }), enabled: requestOpen });

  const createMutation = useMutation({
    mutationFn: staffAdvanceService.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['staff-advances'] }); setRequestOpen(false); },
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action, data }: { id: string; action: 'approve' | 'reject' | 'disburse'; data?: Record<string, string> }) =>
      staffAdvanceService.action(id, action, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['staff-advances'] }); setDisburseTarget(null); },
  });

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <button onClick={() => setRequestOpen(true)} className="btn-primary text-sm">+ New Advance / Loan</button>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700">
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Staff</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Type</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Amount</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Balance</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Status</th>
              {canManage && <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
            {isLoading && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">Loading…</td></tr>}
            {!isLoading && records.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">No advances or loans yet.</td></tr>}
            {records.map((r) => {
              const staffMember = typeof r.staffId === 'object' ? r.staffId : null;
              return (
                <tr key={r._id} className="hover:bg-gray-50 dark:hover:bg-slate-700/40">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-slate-100">{staffMember?.name ?? '—'}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{r.reason}</p>
                  </td>
                  <td className="px-4 py-3 capitalize text-gray-600 dark:text-slate-300">{r.type}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(r.amount)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.status === 'pending' || r.status === 'rejected' ? '—' : formatCurrency(r.balanceRemaining)}</td>
                  <td className="px-4 py-3"><Badge variant={STATUS_VARIANT[r.status] ?? 'default'}>{r.status}</Badge></td>
                  {canManage && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-1.5 justify-end flex-wrap">
                        {r.status === 'pending' && (
                          <>
                            <button onClick={() => actionMutation.mutate({ id: r._id, action: 'approve' })} className="text-xs px-2 py-1 rounded border border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400">Approve</button>
                            <button onClick={() => actionMutation.mutate({ id: r._id, action: 'reject', data: { reason: 'Rejected' } })} className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400">Reject</button>
                          </>
                        )}
                        {r.status === 'approved' && (
                          <button onClick={() => { setDisburseTarget(r._id); setDisburseMethod('cash'); }} className="text-xs px-2 py-1 rounded border border-green-200 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400">Disburse</button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal open={requestOpen} onClose={() => setRequestOpen(false)} title="New Advance / Loan">
        <AdvanceForm staff={staff} onSubmit={(d) => createMutation.mutate(d)} loading={createMutation.isPending} />
      </Modal>

      <Modal open={!!disburseTarget} onClose={() => setDisburseTarget(null)} title="Disburse Advance / Loan" size="sm">
        <div className="space-y-4">
          <div>
            <label className="label">Disbursement Method</label>
            <select className="input" value={disburseMethod} onChange={(e) => setDisburseMethod(e.target.value)}>
              {['cash', 'bank_transfer', 'cheque'].map((m) => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setDisburseTarget(null)} className="btn-secondary">Cancel</button>
            <button
              onClick={() => disburseTarget && actionMutation.mutate({ id: disburseTarget, action: 'disburse', data: { method: disburseMethod } })}
              disabled={actionMutation.isPending}
              className="btn-primary"
            >
              {actionMutation.isPending ? 'Saving…' : 'Confirm Disbursement'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function AdvanceForm({ staff, onSubmit, loading }: {
  staff: { _id: string; name: string; role: string }[];
  onSubmit: (d: { staffId: string; type: AdvanceType; amount: number; reason: string; installmentsTotal?: number }) => void;
  loading: boolean;
}) {
  const [staffId, setStaffId] = useState('');
  const [type, setType] = useState<AdvanceType>('advance');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [installments, setInstallments] = useState('1');

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ staffId, type, amount: Number(amount), reason, installmentsTotal: Number(installments) || 1 }); }} className="space-y-4">
      <div>
        <label className="label">Staff Member</label>
        <select className="input" value={staffId} onChange={(e) => setStaffId(e.target.value)} required>
          <option value="">Select staff…</option>
          {staff.map((s) => <option key={s._id} value={s._id}>{s.name} ({s.role})</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Type</label>
          <select className="input" value={type} onChange={(e) => setType(e.target.value as AdvanceType)}>
            <option value="advance">Advance</option>
            <option value="loan">Loan</option>
          </select>
        </div>
        <div>
          <label className="label">Amount (PKR)</label>
          <input type="number" min={1} className="input" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </div>
      </div>
      <div>
        <label className="label">Reason</label>
        <input className="input" placeholder="e.g. Medical emergency" value={reason} onChange={(e) => setReason(e.target.value)} required />
      </div>
      <div>
        <label className="label">Repay over (installments / months)</label>
        <input type="number" min={1} className="input" value={installments} onChange={(e) => setInstallments(e.target.value)} />
        {amount && installments && (
          <p className="text-xs text-gray-400 mt-1">≈ {formatCurrency(Math.ceil(Number(amount) / (Number(installments) || 1)))} deducted per payroll cycle</p>
        )}
      </div>
      <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Saving…' : 'Submit for Approval'}</button>
    </form>
  );
}
