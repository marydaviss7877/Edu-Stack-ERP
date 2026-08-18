import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { staffClearanceService } from '../../services/staffClearanceService';
import type { ClearanceReason } from '../../services/staffClearanceService';
import { userService } from '../../services/userService';
import Modal from '../ui/Modal';
import Badge from '../ui/Badge';
import { formatCurrency, formatDate } from '../../lib/utils';

const REASON_LABEL: Record<ClearanceReason, string> = {
  resignation: 'Resignation', termination: 'Termination', retirement: 'Retirement', contract_end: 'Contract End',
};

export default function StaffClearanceTab({ canManage }: { canManage: boolean }) {
  const qc = useQueryClient();
  const [initiateOpen, setInitiateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data: records = [], isLoading } = useQuery({ queryKey: ['staff-clearances'], queryFn: () => staffClearanceService.list() });
  const { data: staff = [] } = useQuery({ queryKey: ['staff'], queryFn: () => userService.list({ role: 'teacher' }), enabled: initiateOpen });

  const initiateMutation = useMutation({
    mutationFn: staffClearanceService.initiate,
    onSuccess: (record) => { qc.invalidateQueries({ queryKey: ['staff-clearances'] }); setInitiateOpen(false); setDetailId(record._id); },
  });

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <button onClick={() => setInitiateOpen(true)} className="btn-primary text-sm">+ Initiate Clearance</button>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700">
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Staff</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Reason</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Initiated</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Status</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
            {isLoading && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">Loading…</td></tr>}
            {!isLoading && records.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">No clearance records yet.</td></tr>}
            {records.map((r) => {
              const staffMember = typeof r.staffId === 'object' ? r.staffId : null;
              return (
                <tr key={r._id} className="hover:bg-gray-50 dark:hover:bg-slate-700/40 cursor-pointer" onClick={() => setDetailId(r._id)}>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-slate-100">{staffMember?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{REASON_LABEL[r.reason]}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-slate-400">{formatDate(r.initiatedAt)}</td>
                  <td className="px-4 py-3"><Badge variant={r.status === 'cleared' ? 'success' : 'warning'}>{r.status}</Badge></td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-xs text-blue-600 hover:underline">View →</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal open={initiateOpen} onClose={() => setInitiateOpen(false)} title="Initiate Staff Clearance">
        <InitiateForm staff={staff} onSubmit={(d) => initiateMutation.mutate(d)} loading={initiateMutation.isPending} />
      </Modal>

      {detailId && <ClearanceDetailModal id={detailId} canManage={canManage} onClose={() => setDetailId(null)} />}
    </div>
  );
}

function InitiateForm({ staff, onSubmit, loading }: {
  staff: { _id: string; name: string; role: string }[];
  onSubmit: (d: { staffId: string; reason: ClearanceReason }) => void;
  loading: boolean;
}) {
  const [staffId, setStaffId] = useState('');
  const [reason, setReason] = useState<ClearanceReason>('resignation');

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ staffId, reason }); }} className="space-y-4">
      <div>
        <label className="label">Staff Member</label>
        <select className="input" value={staffId} onChange={(e) => setStaffId(e.target.value)} required>
          <option value="">Select staff…</option>
          {staff.map((s) => <option key={s._id} value={s._id}>{s.name} ({s.role})</option>)}
        </select>
      </div>
      <div>
        <label className="label">Reason</label>
        <select className="input" value={reason} onChange={(e) => setReason(e.target.value as ClearanceReason)}>
          {(Object.keys(REASON_LABEL) as ClearanceReason[]).map((r) => <option key={r} value={r}>{REASON_LABEL[r]}</option>)}
        </select>
      </div>
      <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Starting…' : 'Start Clearance'}</button>
    </form>
  );
}

function ClearanceDetailModal({ id, canManage, onClose }: { id: string; canManage: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['staff-clearance', id], queryFn: () => staffClearanceService.get(id) });

  const updateChecklist = useMutation({
    mutationFn: (patch: Parameters<typeof staffClearanceService.updateChecklist>[1]) => staffClearanceService.updateChecklist(id, patch),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['staff-clearance', id] }); qc.invalidateQueries({ queryKey: ['staff-clearances'] }); },
  });

  const complete = useMutation({
    mutationFn: () => staffClearanceService.complete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['staff-clearance', id] }); qc.invalidateQueries({ queryKey: ['staff-clearances'] }); },
  });

  const record = data?.clearance;
  const staffMember = record && typeof record.staffId === 'object' ? record.staffId : null;
  const allChecked = !!record && record.advancesCleared && record.assetsReturned && record.duesSettled;

  return (
    <Modal open onClose={onClose} title={staffMember ? `Clearance — ${staffMember.name}` : 'Clearance'} size="lg">
      {!data ? (
        <p className="text-sm text-gray-400 text-center py-6">Loading…</p>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">{REASON_LABEL[record!.reason]} · Initiated {formatDate(record!.initiatedAt)}</span>
            <Badge variant={record!.status === 'cleared' ? 'success' : 'warning'}>{record!.status}</Badge>
          </div>

          {data.outstandingAdvances.length > 0 && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 p-4">
              <p className="font-semibold text-amber-800 dark:text-amber-300 text-sm">Outstanding advances/loans: {formatCurrency(data.outstandingAdvanceTotal)}</p>
              <ul className="mt-2 space-y-1">
                {data.outstandingAdvances.map((a) => (
                  <li key={a._id} className="text-xs text-amber-700 dark:text-amber-400">{a.type} — {formatCurrency(a.balanceRemaining)} remaining</li>
                ))}
              </ul>
            </div>
          )}

          {data.assignedAssets.length > 0 && (
            <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 p-4">
              <p className="font-semibold text-blue-800 dark:text-blue-300 text-sm">Assets currently assigned</p>
              <ul className="mt-2 space-y-1">
                {data.assignedAssets.map((a) => (
                  <li key={a._id} className="text-xs text-blue-700 dark:text-blue-400">{a.name} ({a.assetCode})</li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-2">
            <p className="label mb-1">Checklist</p>
            {([
              ['advancesCleared', 'All advances and loans cleared'],
              ['assetsReturned', 'All assigned assets returned'],
              ['duesSettled', 'Final dues and settlements complete'],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  disabled={!canManage || record!.status === 'cleared'}
                  checked={record![key]}
                  onChange={(e) => updateChecklist.mutate({ [key]: e.target.checked })}
                />
                {label}
              </label>
            ))}
          </div>

          {canManage && record!.status === 'pending' && (
            <button onClick={() => complete.mutate()} disabled={!allChecked || complete.isPending} className="btn-primary w-full">
              {complete.isPending ? 'Completing…' : allChecked ? 'Complete Clearance' : 'Confirm all checklist items to complete'}
            </button>
          )}

          {record!.status === 'cleared' && (
            <p className="text-sm text-emerald-600 text-center">Cleared on {formatDate(record!.clearedAt!)}. You can now issue an experience or clearance letter from Letters &amp; Certificates.</p>
          )}
        </div>
      )}
    </Modal>
  );
}
