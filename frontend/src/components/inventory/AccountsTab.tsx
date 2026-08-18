import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountsService } from '../../services/accountsService';
import type { AccountType } from '../../services/accountsService';
import Modal from '../ui/Modal';
import Badge from '../ui/Badge';
import { cn, formatCurrency, formatDate } from '../../lib/utils';

type SubTab = 'chart' | 'journal' | 'trial-balance';

const TYPE_LABEL: Record<AccountType, string> = { asset: 'Assets', liability: 'Liabilities', equity: 'Equity', income: 'Income', expense: 'Expenses' };
const TYPE_ORDER: AccountType[] = ['asset', 'liability', 'equity', 'income', 'expense'];

function pill(active: boolean) {
  return cn('px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors', active ? 'bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 shadow-sm' : 'text-gray-500 dark:text-slate-400');
}

export default function AccountsTab() {
  const [sub, setSub] = useState<SubTab>('chart');
  const qc = useQueryClient();

  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: accountsService.list });
  const { data: entries = [] } = useQuery({ queryKey: ['journal-entries'], queryFn: () => accountsService.journalEntries(), enabled: sub === 'journal' });
  const { data: trialBalance } = useQuery({ queryKey: ['trial-balance'], queryFn: () => accountsService.trialBalance(), enabled: sub === 'trial-balance' });

  const seedMutation = useMutation({
    mutationFn: accountsService.seedDefaults,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  });

  const [accountModal, setAccountModal] = useState(false);
  const [journalModal, setJournalModal] = useState(false);

  const createAccount = useMutation({
    mutationFn: accountsService.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['accounts'] }); setAccountModal(false); },
  });

  const createJournalEntry = useMutation({
    mutationFn: accountsService.createJournalEntry,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['journal-entries'] }); qc.invalidateQueries({ queryKey: ['trial-balance'] }); setJournalModal(false); },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 bg-gray-100 dark:bg-slate-700 p-1 rounded-lg w-fit">
          <button onClick={() => setSub('chart')} className={pill(sub === 'chart')}>Chart of Accounts</button>
          <button onClick={() => setSub('journal')} className={pill(sub === 'journal')}>Journal &amp; Ledger</button>
          <button onClick={() => setSub('trial-balance')} className={pill(sub === 'trial-balance')}>Trial Balance</button>
        </div>
        <div className="flex gap-2">
          {sub === 'chart' && <button onClick={() => setAccountModal(true)} className="btn-primary text-sm">+ Add Account</button>}
          {sub === 'journal' && <button onClick={() => setJournalModal(true)} className="btn-primary text-sm">+ New Journal Entry</button>}
        </div>
      </div>

      {accounts.length === 0 && (
        <div className="card p-6 flex items-center justify-between flex-wrap gap-3 bg-blue-50/60 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30">
          <div>
            <p className="font-semibold text-gray-900 dark:text-slate-100">No Chart of Accounts yet</p>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Seed a standard Pakistani-school starter chart — Cash, Bank, Fee Income, expense categories matching your existing categories, and more. Fee payments, expenses, income and payroll will then post here automatically.</p>
          </div>
          <button onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending} className="btn-primary text-sm shrink-0">
            {seedMutation.isPending ? 'Seeding…' : 'Seed Default Chart of Accounts'}
          </button>
        </div>
      )}

      {sub === 'chart' && (
        <div className="space-y-4">
          {TYPE_ORDER.map((type) => {
            const group = accounts.filter((a) => a.type === type);
            if (group.length === 0) return null;
            return (
              <div key={type} className="card overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white">{TYPE_LABEL[type]}</h3>
                  <Badge variant="default">{group.length}</Badge>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-slate-700">
                  {group.map((a) => (
                    <div key={a._id} className="flex items-center justify-between px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-gray-400 w-14 shrink-0">{a.code}</span>
                        <span className="text-sm text-gray-800 dark:text-slate-200">{a.name}</span>
                        {a.isSystem && <Badge variant="info">System</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {sub === 'journal' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700">
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Entry / Narration</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Source</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {entries.map((e) => (
                <tr key={e._id}>
                  <td className="px-4 py-3 text-gray-500 dark:text-slate-400">{formatDate(e.date)}</td>
                  <td className="px-4 py-3">
                    <p className="text-gray-800 dark:text-slate-200">{e.narration}</p>
                    <p className="font-mono text-[10px] text-gray-400 mt-0.5">{e.entryNo}</p>
                  </td>
                  <td className="px-4 py-3"><Badge variant="default">{e.source.replace('_', ' ')}</Badge></td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold">{formatCurrency(e.lines.reduce((s, l) => s + l.debit, 0))}</td>
                </tr>
              ))}
              {entries.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400 dark:text-slate-500">No journal entries yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {sub === 'trial-balance' && trialBalance && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
            <p className="text-xs text-gray-400">As of {formatDate(trialBalance.asOf)}</p>
            <Badge variant={trialBalance.balanced ? 'success' : 'danger'}>{trialBalance.balanced ? 'Balanced' : 'Out of balance'}</Badge>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700">
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Account</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Debit</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Credit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {trialBalance.rows.map((r) => (
                <tr key={r.accountId}>
                  <td className="px-4 py-2.5"><span className="font-mono text-xs text-gray-400 mr-2">{r.code}</span>{r.name}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{r.debitBalance > 0 ? formatCurrency(r.debitBalance) : '—'}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{r.creditBalance > 0 ? formatCurrency(r.creditBalance) : '—'}</td>
                </tr>
              ))}
              {trialBalance.rows.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400 dark:text-slate-500">No activity posted yet.</td></tr>}
            </tbody>
            {trialBalance.rows.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-200 dark:border-slate-600 font-bold">
                  <td className="px-4 py-3">Total</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(trialBalance.totalDebit)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(trialBalance.totalCredit)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      <Modal open={accountModal} onClose={() => setAccountModal(false)} title="Add Account">
        <AccountForm onSubmit={(d) => createAccount.mutate(d)} loading={createAccount.isPending} />
      </Modal>

      <Modal open={journalModal} onClose={() => setJournalModal(false)} title="New Journal Entry" subtitle="Total debits must equal total credits" size="lg">
        <JournalEntryForm accounts={accounts} onSubmit={(d) => createJournalEntry.mutate(d)} loading={createJournalEntry.isPending} />
      </Modal>
    </div>
  );
}

function AccountForm({ onSubmit, loading }: { onSubmit: (d: { code: string; name: string; type: AccountType }) => void; loading: boolean }) {
  const [form, setForm] = useState<{ code: string; name: string; type: AccountType }>({ code: '', name: '', type: 'expense' });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
      <div>
        <label className="label">Account Code</label>
        <input className="input" placeholder="e.g. 5960" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} required />
      </div>
      <div>
        <label className="label">Account Name</label>
        <input className="input" placeholder="e.g. Bank Charges" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
      </div>
      <div>
        <label className="label">Type</label>
        <select className="input" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as AccountType }))}>
          {TYPE_ORDER.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
        </select>
      </div>
      <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Saving…' : 'Create Account'}</button>
    </form>
  );
}

interface JELine { accountId: string; debit: string; credit: string }

function JournalEntryForm({ accounts, onSubmit, loading }: {
  accounts: { _id: string; code: string; name: string }[];
  onSubmit: (d: { date: string; narration: string; lines: { accountId: string; debit?: number; credit?: number }[] }) => void;
  loading: boolean;
}) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [narration, setNarration] = useState('');
  const [lines, setLines] = useState<JELine[]>([{ accountId: '', debit: '', credit: '' }, { accountId: '', debit: '', credit: '' }]);

  const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const balanced = totalDebit > 0 && Math.abs(totalDebit - totalCredit) < 0.01;

  function updateLine(i: number, patch: Partial<JELine>) {
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><label className="label">Date</label><input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div><label className="label">Narration</label><input className="input" value={narration} onChange={(e) => setNarration(e.target.value)} placeholder="e.g. Opening balance adjustment" /></div>
      </div>

      <div className="space-y-2">
        <label className="label">Lines</label>
        {lines.map((l, i) => (
          <div key={i} className="flex gap-2 items-center">
            <select className="input flex-1" value={l.accountId} onChange={(e) => updateLine(i, { accountId: e.target.value })}>
              <option value="">Select account…</option>
              {accounts.map((a) => <option key={a._id} value={a._id}>{a.code} — {a.name}</option>)}
            </select>
            <input type="number" min={0} className="input w-28" placeholder="Debit" value={l.debit} onChange={(e) => updateLine(i, { debit: e.target.value, credit: e.target.value ? '' : l.credit })} />
            <input type="number" min={0} className="input w-28" placeholder="Credit" value={l.credit} onChange={(e) => updateLine(i, { credit: e.target.value, debit: e.target.value ? '' : l.debit })} />
            <button type="button" onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-500 text-lg px-1" disabled={lines.length <= 2}>×</button>
          </div>
        ))}
        <button type="button" onClick={() => setLines((ls) => [...ls, { accountId: '', debit: '', credit: '' }])} className="text-sm text-blue-600">+ Add line</button>
      </div>

      <div className={cn('rounded-lg p-3 text-sm flex justify-between', balanced ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300' : 'bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300')}>
        <span>Debit: {formatCurrency(totalDebit)}</span>
        <span>Credit: {formatCurrency(totalCredit)}</span>
        <span>{balanced ? 'Balanced ✓' : 'Not balanced'}</span>
      </div>

      <button
        type="button"
        disabled={loading || !balanced || !narration.trim() || lines.some((l) => !l.accountId)}
        onClick={() => onSubmit({
          date, narration: narration.trim(),
          lines: lines.filter((l) => l.accountId).map((l) => ({ accountId: l.accountId, debit: Number(l.debit) || 0, credit: Number(l.credit) || 0 })),
        })}
        className="btn-primary w-full"
      >
        {loading ? 'Posting…' : 'Post Journal Entry'}
      </button>
    </div>
  );
}
