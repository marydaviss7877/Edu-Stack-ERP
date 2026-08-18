import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payrollService } from '../../services/payrollService';
import type { PayrollDoc } from '../../services/payrollService';
import { userService } from '../../services/userService';
import { branchHeaderService } from '../../services/branchHeaderService';
import PageHeader from '../../components/ui/PageHeader';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import { useAuthStore } from '../../stores/authStore';
import { cn, formatCurrency } from '../../lib/utils';
import { downloadPayslipPdf } from '../../lib/payslipPdf';
import StaffAdvancesTab from '../../components/payroll/StaffAdvancesTab';
import StaffClearanceTab from '../../components/payroll/StaffClearanceTab';

const today = new Date();
const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

type MainTab = 'payroll' | 'advances' | 'clearance';

const STATUS_VARIANT: Record<string, 'default' | 'warning' | 'success'> = {
  draft: 'default', approved: 'warning', paid: 'success',
};

function downloadPayrollCsv(payrolls: PayrollDoc[], month: string) {
  const headers = ['Staff Name', 'Role', 'Month', 'Basic Salary', 'Allowances', 'Gross Salary', 'Deductions', 'Absent Days', 'Net Pay', 'Status'];
  const rows = payrolls.map(p => {
    const staff = typeof p.staffId === 'object' ? p.staffId : null;
    return [
      staff?.name ?? '',
      staff?.role?.replace('_', ' ') ?? '',
      month,
      p.basicSalary,
      p.allowances.reduce((s, a) => s + a.amount, 0),
      p.grossSalary,
      p.totalDeductions,
      p.absentDays,
      p.netPay,
      p.status,
    ].join(',');
  });
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `payroll_${month}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function PayrollPage() {
  const user    = useAuthStore(s => s.user);
  const orgSlug = useAuthStore(s => s.orgSlug);
  const qc = useQueryClient();
  const canManage = user?.role === 'accountant' || user?.role === 'branch_principal';

  const { data: branchHeader } = useQuery({ queryKey: ['branch-header'], queryFn: branchHeaderService.get });
  const orgName = branchHeader?.schoolName ?? orgSlug ?? 'School';

  const [mainTab, setMainTab] = useState<MainTab>('payroll');
  const [month, setMonth] = useState(currentMonth);
  const [editOpen, setEditOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<PayrollDoc | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkMonth, setBulkMonth] = useState(currentMonth);
  const [newStaffId, setNewStaffId] = useState('');
  const [newBasic, setNewBasic] = useState('');
  const [allowances, setAllowances] = useState<{ name: string; amount: string }[]>([]);
  const [deductions, setDeductions] = useState<{ name: string; amount: string }[]>([]);
  const [payMethodOpen, setPayMethodOpen] = useState(false);
  const [payTarget, setPayTarget] = useState<PayrollDoc | null>(null);
  const [payMethod, setPayMethod] = useState('bank_transfer');
  const [apiError, setApiError] = useState('');

  const { data: payrolls = [], isLoading } = useQuery({
    queryKey: ['payroll', month],
    queryFn: () => payrollService.list({ month }),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => userService.list({ role: 'teacher' }),
    enabled: editOpen,
  });

  const createMutation = useMutation({
    mutationFn: payrollService.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payroll'] }); closeEdit(); },
    onError: (e: { response?: { data?: { message?: string } } }) => setApiError(e?.response?.data?.message ?? 'Error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PayrollDoc> }) => payrollService.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payroll'] }); closeEdit(); },
    onError: (e: { response?: { data?: { message?: string } } }) => setApiError(e?.response?.data?.message ?? 'Error'),
  });

  const approveMutation = useMutation({
    mutationFn: payrollService.approve,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll'] }),
  });

  const markPaidMutation = useMutation({
    mutationFn: ({ id, method }: { id: string; method: string }) => payrollService.markPaid(id, method),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payroll'] }); setPayMethodOpen(false); },
  });

  const bulkMutation = useMutation({
    mutationFn: payrollService.bulkProcess,
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ['payroll'] }); setBulkOpen(false); alert(`Created ${r.data?.created}, skipped ${r.data?.skipped}`); },
    onError: (e: { response?: { data?: { message?: string } } }) => setApiError(e?.response?.data?.message ?? 'Error'),
  });

  const closeEdit = () => { setEditOpen(false); setEditRecord(null); setNewStaffId(''); setNewBasic(''); setAllowances([]); setDeductions([]); setApiError(''); };

  const openEdit = (r: PayrollDoc) => {
    setEditRecord(r);
    const s = typeof r.staffId === 'object' ? r.staffId._id : r.staffId;
    setNewStaffId(s);
    setNewBasic(String(r.basicSalary));
    setAllowances(r.allowances.map(a => ({ name: a.name, amount: String(a.amount) })));
    setDeductions(r.deductions.map(d => ({ name: d.name, amount: String(d.amount) })));
    setApiError('');
    setEditOpen(true);
  };

  const handleSave = () => {
    if (!newStaffId || !newBasic) { setApiError('Staff and basic salary required.'); return; }
    const allowancesParsed = allowances.map(a => ({ name: a.name, amount: Number(a.amount) }));
    const deductionsParsed = deductions.map(d => ({ name: d.name, amount: Number(d.amount) }));
    if (editRecord) {
      updateMutation.mutate({ id: editRecord._id, data: { basicSalary: Number(newBasic), allowances: allowancesParsed, deductions: deductionsParsed } });
    } else {
      createMutation.mutate({ staffId: newStaffId, month, basicSalary: Number(newBasic), allowances: allowancesParsed, deductions: deductionsParsed });
    }
  };

  const totalNetPay = payrolls.reduce((s, p) => s + p.netPay, 0);
  const totalPaid = payrolls.filter(p => p.status === 'paid').reduce((s, p) => s + p.netPay, 0);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader
        title="Payroll"
        actions={canManage && mainTab === 'payroll' ? (
          <div className="flex gap-2">
            <button onClick={() => { setBulkMonth(month); setApiError(''); setBulkOpen(true); }} className="btn-secondary text-sm">Bulk Process</button>
            <button onClick={() => { closeEdit(); setEditOpen(true); }} className="btn-primary text-sm">+ Add Payroll</button>
          </div>
        ) : undefined}
      />

      <div className="flex gap-1 bg-gray-100 dark:bg-slate-700 p-1 rounded-lg mb-6 w-fit">
        {([
          ['payroll', 'Payroll'],
          ['advances', 'Advances & Loans'],
          ['clearance', 'Clearance'],
        ] as [MainTab, string][]).map(([id, label]) => (
          <button key={id} onClick={() => setMainTab(id)}
            className={cn('px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
              mainTab === id ? 'bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 shadow-sm' : 'text-gray-500 dark:text-slate-400')}>
            {label}
          </button>
        ))}
      </div>

      {mainTab === 'advances' && <StaffAdvancesTab canManage={canManage} />}
      {mainTab === 'clearance' && <StaffClearanceTab canManage={canManage} />}

      {mainTab === 'payroll' && (
      <>
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="card p-4">
          <p className="text-xs text-gray-500 dark:text-slate-400">Total Payable</p>
          <p className="text-xl font-bold mt-1 dark:text-slate-100">{formatCurrency(totalNetPay)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 dark:text-slate-400">Paid Out</p>
          <p className="text-xl font-bold text-green-600 mt-1">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 dark:text-slate-400">Pending</p>
          <p className="text-xl font-bold text-orange-500 mt-1">{formatCurrency(totalNetPay - totalPaid)}</p>
        </div>
      </div>

      {/* Month filter */}
      <div className="card p-4 mb-4">
        <div className="flex items-center gap-3">
          <label className="label mb-0">Month</label>
          <input type="month" className="input w-48" value={month} onChange={e => setMonth(e.target.value)} />
          <button
            onClick={() => downloadPayrollCsv(payrolls, month)}
            disabled={payrolls.length === 0}
            className="ml-auto text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
          >
            ↓ CSV
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 dark:bg-slate-700/50 dark:border-slate-700">
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Staff</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Basic</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Gross</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Deductions</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Net Pay</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Status</th>
              {canManage && <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
            {isLoading && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 dark:text-slate-500 text-sm">Loading...</td></tr>}
            {!isLoading && payrolls.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 dark:text-slate-500 text-sm">No payroll records. Click "Bulk Process" to auto-generate.</td></tr>
            )}
            {payrolls.map(p => {
              const staffMember = typeof p.staffId === 'object' ? p.staffId : null;
              return (
                <tr key={p._id} className="hover:bg-gray-50 dark:hover:bg-slate-700/40">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-slate-100">{staffMember?.name ?? '—'}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 capitalize">{staffMember?.role?.replace('_', ' ')}</p>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(p.basicSalary)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(p.grossSalary)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-red-600">
                    -{formatCurrency(p.totalDeductions)}
                    {p.absentDays > 0 && <span className="block text-xs text-gray-400">{p.absentDays} absent day(s)</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatCurrency(p.netPay)}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={STATUS_VARIANT[p.status] ?? 'default'}>{p.status}</Badge>
                  </td>
                  {canManage && (
                    <td className="px-4 py-3 text-center">
                      <div className="flex gap-1 justify-center flex-wrap">
                        {p.status === 'draft' && (
                          <>
                            <button onClick={() => openEdit(p)} className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors">Edit</button>
                            <button onClick={() => approveMutation.mutate(p._id)} className="text-xs px-2 py-1 rounded border border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/20 transition-colors">Approve</button>
                          </>
                        )}
                        {p.status === 'approved' && (
                          <button onClick={() => { setPayTarget(p); setPayMethod('bank_transfer'); setPayMethodOpen(true); }} className="text-xs px-2 py-1 rounded border border-green-200 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20 transition-colors">Mark Paid</button>
                        )}
                        <button
                          onClick={() => downloadPayslipPdf(p, orgName)}
                          className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
                          title="Download Payslip PDF"
                        >
                          ↓ Payslip
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </>
      )}

      {/* Add/Edit Payroll Modal */}
      <Modal open={editOpen} onClose={closeEdit} title={editRecord ? 'Edit Payroll' : 'Add Payroll Record'} size="lg">
        <div className="space-y-4">
          {apiError && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{apiError}</div>}
          {!editRecord && (
            <div>
              <label className="label">Staff Member</label>
              <select className="input" value={newStaffId} onChange={e => setNewStaffId(e.target.value)}>
                <option value="">Select staff...</option>
                {staff.map(s => <option key={s._id} value={s._id}>{s.name} ({s.role})</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="label">Basic Salary (PKR)</label>
            <input type="number" className="input" value={newBasic} onChange={e => setNewBasic(e.target.value)} placeholder="e.g. 25000" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Allowances</label>
              <button onClick={() => setAllowances(prev => [...prev, { name: '', amount: '' }])} className="text-sm text-blue-600">+ Add</button>
            </div>
            {allowances.map((a, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input className="input flex-1" placeholder="e.g. House Rent" value={a.name} onChange={e => setAllowances(prev => prev.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x))} />
                <input type="number" className="input w-28" placeholder="Amount" value={a.amount} onChange={e => setAllowances(prev => prev.map((x, idx) => idx === i ? { ...x, amount: e.target.value } : x))} />
                <button onClick={() => setAllowances(prev => prev.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-500 text-lg">×</button>
              </div>
            ))}
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Deductions</label>
              <button onClick={() => setDeductions(prev => [...prev, { name: '', amount: '' }])} className="text-sm text-blue-600">+ Add</button>
            </div>
            {deductions.map((d, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input className="input flex-1" placeholder="e.g. EOBI" value={d.name} onChange={e => setDeductions(prev => prev.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x))} />
                <input type="number" className="input w-28" placeholder="Amount" value={d.amount} onChange={e => setDeductions(prev => prev.map((x, idx) => idx === i ? { ...x, amount: e.target.value } : x))} />
                <button onClick={() => setDeductions(prev => prev.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-500 text-lg">×</button>
              </div>
            ))}
          </div>
          {newBasic && (
            <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
              Net Pay ≈ {formatCurrency(
                Number(newBasic) +
                allowances.reduce((s, a) => s + (Number(a.amount) || 0), 0) -
                deductions.reduce((s, d) => s + (Number(d.amount) || 0), 0)
              )}
            </div>
          )}
          <div className="flex gap-3 justify-end">
            <button onClick={closeEdit} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending} className="btn-primary">
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Bulk Process Modal */}
      <Modal open={bulkOpen} onClose={() => setBulkOpen(false)} title="Bulk Process Payroll" size="sm">
        <div className="space-y-4">
          {apiError && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{apiError}</div>}
          <p className="text-sm text-gray-600 dark:text-slate-400">Creates draft payroll records for all active branch staff for the selected month. Existing records are skipped.</p>
          <div>
            <label className="label">Month</label>
            <input type="month" className="input" value={bulkMonth} onChange={e => setBulkMonth(e.target.value)} />
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setBulkOpen(false)} className="btn-secondary">Cancel</button>
            <button onClick={() => bulkMutation.mutate({ month: bulkMonth })} disabled={bulkMutation.isPending} className="btn-primary">
              {bulkMutation.isPending ? 'Processing...' : 'Process'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Mark Paid Modal */}
      <Modal open={payMethodOpen} onClose={() => setPayMethodOpen(false)} title="Mark Payroll as Paid" size="sm">
        <div className="space-y-4">
          {payTarget && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm dark:bg-slate-700/50 dark:text-slate-300">
              Net Pay: <span className="font-semibold">{formatCurrency(payTarget.netPay)}</span>
            </div>
          )}
          <div>
            <label className="label">Payment Method</label>
            <select className="input" value={payMethod} onChange={e => setPayMethod(e.target.value)}>
              {['bank_transfer', 'cash', 'cheque'].map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setPayMethodOpen(false)} className="btn-secondary">Cancel</button>
            <button onClick={() => payTarget && markPaidMutation.mutate({ id: payTarget._id, method: payMethod })} disabled={markPaidMutation.isPending} className="btn-primary">
              {markPaidMutation.isPending ? 'Saving...' : 'Confirm Paid'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
