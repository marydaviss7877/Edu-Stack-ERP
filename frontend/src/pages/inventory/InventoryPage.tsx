import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownRight, ArrowUpRight, Banknote, Boxes, Building2,
  Check, CircleDollarSign, ClipboardCheck, FileText, Package, Plus, ReceiptText,
  RefreshCw, Search, ShoppingCart, Store, TrendingUp, Truck, WalletCards, Wrench, X,
} from 'lucide-react';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import PageHeader from '../../components/ui/PageHeader';
import { useAuthStore } from '../../stores/authStore';
import { cn, formatCurrency, formatDate } from '../../lib/utils';
import {
  inventoryService,
  type Expense,
  type FinanceSummary,
  type InventoryDashboard,
  type InventoryItem,
  type IncomeEntry,
  type ProcurementRequest,
  type Vendor,
} from '../../services/inventoryService';

type Tab = 'overview' | 'items' | 'expenses' | 'income' | 'procurement' | 'vendors';
type FormState = Record<string, string>;

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <TrendingUp className="w-4 h-4" /> },
  { id: 'items', label: 'Assets & Stock', icon: <Boxes className="w-4 h-4" /> },
  { id: 'expenses', label: 'Expenses', icon: <ReceiptText className="w-4 h-4" /> },
  { id: 'income', label: 'Income', icon: <CircleDollarSign className="w-4 h-4" /> },
  { id: 'procurement', label: 'Procurement', icon: <ShoppingCart className="w-4 h-4" /> },
  { id: 'vendors', label: 'Vendors', icon: <Store className="w-4 h-4" /> },
];

const defaultForm = (tab: Tab): FormState => ({
  type: 'fixed_asset',
  quantity: '1',
  unitCost: '0',
  usefulLifeMonths: '60',
  condition: 'good',
  status: tab === 'expenses' ? 'submitted' : 'draft',
  paymentMethod: 'bank_transfer',
  procurementMethod: 'quotation',
  taxStatus: 'unknown',
});

const branchName = (value: InventoryItem['branchId'] | Expense['branchId']) =>
  typeof value === 'string' ? '' : value.name;

const statusVariant = (status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'amber' => {
  if (['paid', 'received', 'approved', 'in_stock', 'active', 'good', 'new'].includes(status)) return 'success';
  if (['submitted', 'quotation', 'ordered', 'assigned'].includes(status)) return 'info';
  if (['draft', 'fair', 'partially_received'].includes(status)) return 'warning';
  if (['rejected', 'lost', 'disposed', 'void', 'blacklisted', 'unserviceable'].includes(status)) return 'danger';
  if (['under_maintenance', 'poor', 'suspended'].includes(status)) return 'amber';
  return 'default';
};

function MetricCard({ label, value, hint, icon, tone }: {
  label: string; value: string; hint?: string; icon: React.ReactNode; tone: string;
}) {
  return (
    <div className="card p-4 sm:p-5 min-w-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">{label}</p>
          <p className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white mt-1 truncate">{value}</p>
          {hint && <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{hint}</p>}
        </div>
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', tone)}>{icon}</div>
      </div>
    </div>
  );
}

function FinanceHero({ data }: { data: FinanceSummary }) {
  const positive = data.operatingSurplus >= 0;
  return (
    <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-navy-950 via-blue-950 to-blue-700 text-white p-5 sm:p-7 shadow-xl">
      <div className="absolute -right-16 -top-20 w-56 h-56 bg-blue-400/20 rounded-full blur-2xl" />
      <div className="relative grid lg:grid-cols-[1.1fr_1.9fr] gap-6 items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-blue-200 font-semibold">{data.month} financial position</p>
          <p className="text-sm text-white/65 mt-3">{positive ? 'Net operating surplus' : 'Net operating deficit'}</p>
          <div className="flex items-center gap-2 mt-1">
            {positive ? <ArrowUpRight className="w-6 h-6 text-emerald-300" /> : <ArrowDownRight className="w-6 h-6 text-red-300" />}
            <p className="text-2xl sm:text-4xl font-extrabold tracking-tight">{formatCurrency(Math.abs(data.operatingSurplus))}</p>
          </div>
          <p className="text-sm text-blue-100 mt-2">{data.operatingMargin.toFixed(1)}% operating margin</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
          {[
            ['Total income', data.totalRevenue],
            ['Fee receipts', data.feeRevenue],
            ['Other income', data.otherIncome],
            ['Operating expenses', data.operatingExpenses],
            ['Payroll', data.payroll],
            ['Depreciation', data.depreciation],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-2xl bg-white/10 border border-white/10 px-3 py-3 backdrop-blur-sm min-w-0">
              <p className="text-[10px] text-white/55 uppercase tracking-wide truncate">{label}</p>
              <p className="text-sm font-bold mt-1 truncate">{formatCurrency(Number(value))}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Overview({ finance, inventory }: { finance?: FinanceSummary; inventory?: InventoryDashboard }) {
  if (!finance || !inventory) return <LoadingState />;
  return (
    <div className="space-y-5">
      <FinanceHero data={finance} />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard label="Cash surplus" value={formatCurrency(finance.cashSurplus)} hint="Before depreciation" icon={<Banknote className="w-5 h-5" />} tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30" />
        <MetricCard label="Outstanding fees" value={formatCurrency(finance.outstandingFees)} hint="Not counted as income" icon={<WalletCards className="w-5 h-5" />} tone="bg-red-50 text-red-600 dark:bg-red-900/30" />
        <MetricCard label="Net book value" value={formatCurrency(inventory.netBookValue)} hint={`${inventory.fixedAssets} fixed assets`} icon={<Building2 className="w-5 h-5" />} tone="bg-blue-50 text-blue-600 dark:bg-blue-900/30" />
        <MetricCard label="Approvals waiting" value={String(inventory.pendingExpenses + inventory.pendingProcurements)} hint="Expenses + procurement" icon={<ClipboardCheck className="w-5 h-5" />} tone="bg-violet-50 text-violet-600 dark:bg-violet-900/30" />
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-1">
          <h2 className="font-bold text-gray-900 dark:text-white">Inventory health</h2>
          <div className="space-y-3 mt-4">
            <HealthRow label="Low-stock items" value={inventory.lowStock} icon={<Package className="w-4 h-4" />} danger={inventory.lowStock > 0} />
            <HealthRow label="Maintenance required" value={inventory.maintenanceDue} icon={<Wrench className="w-4 h-4" />} danger={inventory.maintenanceDue > 0} />
            <HealthRow label="Verification overdue" value={inventory.verificationOverdue} icon={<ClipboardCheck className="w-4 h-4" />} danger={inventory.verificationOverdue > 0} />
            <HealthRow label="Consumable categories" value={inventory.consumables} icon={<Boxes className="w-4 h-4" />} />
          </div>
        </div>
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white">Branch performance</h2>
              <p className="text-xs text-gray-400 mt-0.5">Cash income less paid expenses and payroll</p>
            </div>
            <Badge variant="info">{finance.branchPerformance.length || 1} campus view</Badge>
          </div>
          {finance.branchPerformance.length ? (
            <div className="space-y-4 mt-5">
              {finance.branchPerformance.map((branch) => {
                const max = Math.max(branch.revenue, 1);
                const expensePct = Math.min(100, Math.max(0, (branch.cashExpenses / max) * 100));
                return (
                  <div key={branch.branchId}>
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <div className="min-w-0"><p className="text-sm font-semibold text-gray-800 dark:text-slate-200 truncate">{branch.name}</p><p className="text-[11px] text-gray-400">Income {formatCurrency(branch.revenue)}</p></div>
                      <p className={cn('text-sm font-extrabold shrink-0', branch.cashSurplus >= 0 ? 'text-emerald-600' : 'text-red-600')}>{formatCurrency(branch.cashSurplus)}</p>
                    </div>
                    <div className="h-2 rounded-full bg-emerald-100 dark:bg-emerald-900/20 overflow-hidden"><div className="h-full bg-red-400 rounded-full" style={{ width: `${expensePct}%` }} /></div>
                  </div>
                );
              })}
            </div>
          ) : <p className="text-sm text-gray-400 mt-8 text-center">Branch-specific comparison appears in organization-wide Group Admin view.</p>}
        </div>
      </div>
      <p className="text-xs text-gray-400 dark:text-slate-500 px-1">For public or nonprofit institutions, profit is presented as operating surplus/deficit. This is a management view, not an audited statutory statement.</p>
    </div>
  );
}

function HealthRow({ label, value, icon, danger }: { label: string; value: number; icon: React.ReactNode; danger?: boolean }) {
  return <div className="flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-slate-700/40 px-3 py-2.5"><span className={danger ? 'text-red-500' : 'text-blue-500'}>{icon}</span><span className="flex-1 text-sm text-gray-600 dark:text-slate-300">{label}</span><span className={cn('font-extrabold', danger ? 'text-red-600' : 'text-gray-900 dark:text-white')}>{value}</span></div>;
}

function LoadingState() {
  return <div className="min-h-72 grid place-items-center"><RefreshCw className="w-7 h-7 text-blue-500 animate-spin" /></div>;
}

function EmptyState({ title }: { title: string }) {
  return <div className="card min-h-56 grid place-items-center text-center p-8"><div><FileText className="w-9 h-9 mx-auto text-gray-300" /><p className="font-semibold text-gray-600 dark:text-slate-300 mt-3">{title}</p><p className="text-xs text-gray-400 mt-1">Use the Add button to create the first record.</p></div></div>;
}

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const { user, activeBranch } = useAuthStore();
  const isInventoryOnly = user?.role === 'it_admin';
  const visibleTabs = isInventoryOnly ? tabs.filter(item => ['items', 'procurement', 'vendors'].includes(item.id)) : tabs;
  const [tab, setTab] = useState<Tab>(isInventoryOnly ? 'items' : 'overview');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [transactionItem, setTransactionItem] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm('overview'));
  const [error, setError] = useState('');
  const scopeKey = activeBranch?.id ?? 'all';

  const financeQuery = useQuery({ queryKey: ['inventory-finance', scopeKey], queryFn: () => inventoryService.finance(), enabled: !isInventoryOnly });
  const dashboardQuery = useQuery({ queryKey: ['inventory-dashboard', scopeKey], queryFn: inventoryService.dashboard });
  const metadataQuery = useQuery({ queryKey: ['inventory-metadata'], queryFn: inventoryService.metadata });
  const itemsQuery = useQuery({ queryKey: ['inventory-items', scopeKey], queryFn: () => inventoryService.items() });
  const expensesQuery = useQuery({ queryKey: ['inventory-expenses', scopeKey], queryFn: () => inventoryService.expenses(), enabled: !isInventoryOnly });
  const incomeQuery = useQuery({ queryKey: ['inventory-income', scopeKey], queryFn: inventoryService.income, enabled: !isInventoryOnly });
  const procurementQuery = useQuery({ queryKey: ['inventory-procurement', scopeKey], queryFn: () => inventoryService.procurements() });
  const vendorsQuery = useQuery({ queryKey: ['inventory-vendors'], queryFn: inventoryService.vendors });
  const branchesQuery = useQuery({ queryKey: ['branches'], queryFn: inventoryService.branches, enabled: user?.role === 'group_admin' });

  const refresh = () => queryClient.invalidateQueries({
    predicate: query => String(query.queryKey[0] ?? '').startsWith('inventory'),
  });
  const mutation = useMutation({
    mutationFn: async () => {
      const branchId = user?.role === 'group_admin' ? (form.branchId || activeBranch?.id) : user?.branchId;
      if (tab !== 'vendors' && !branchId) throw new Error('Select a branch before creating this record.');
      if (tab === 'items' && (!form.name?.trim() || !form.category?.trim())) throw new Error('Item name and category are required.');
      if (tab === 'expenses' && (!form.description?.trim() || !form.category?.trim() || Number(form.amount) <= 0)) throw new Error('Description, category and an amount greater than zero are required.');
      if (tab === 'income' && (!form.description?.trim() || !form.category?.trim() || Number(form.amount) <= 0)) throw new Error('Description, category and an amount greater than zero are required.');
      if (tab === 'procurement' && (!form.title?.trim() || Number(form.quantity) <= 0)) throw new Error('Request title and a quantity greater than zero are required.');
      if (tab === 'vendors' && !form.name?.trim()) throw new Error('Vendor name is required.');
      if (tab === 'items') return inventoryService.createItem({
        branchId, name: form.name, type: form.type as InventoryItem['type'], category: form.category,
        quantity: Number(form.quantity), availableQuantity: Number(form.quantity), unitCost: Number(form.unitCost),
        usefulLifeMonths: form.type === 'fixed_asset' ? Number(form.usefulLifeMonths) : undefined,
        location: form.location, department: form.department, condition: form.condition as InventoryItem['condition'],
        reorderLevel: Number(form.reorderLevel || 0), unit: form.unit || 'unit',
      });
      if (tab === 'expenses') return inventoryService.createExpense({
        branchId, expenseDate: form.expenseDate || new Date().toISOString(), category: form.category,
        description: form.description, grossAmount: Number(form.amount), netPaid: Number(form.amount),
        status: 'submitted', costCenter: form.costCenter, paymentMethod: form.paymentMethod,
      });
      if (tab === 'income') return inventoryService.createIncome({
        branchId, receivedAt: form.receivedAt || new Date().toISOString(), category: form.category,
        description: form.description, amount: Number(form.amount), paymentMethod: form.paymentMethod,
        payerName: form.payerName, fundingSource: form.fundingSource,
      });
      if (tab === 'procurement') return inventoryService.createProcurement({
        branchId, title: form.title, purpose: form.purpose || form.title, department: form.department,
        budgetHead: form.budgetHead, procurementMethod: form.procurementMethod,
        status: 'draft', items: [{ name: form.title, specifications: form.specifications, quantity: Number(form.quantity), unit: form.unit || 'unit', estimatedUnitCost: Number(form.unitCost) }],
      });
      if (tab === 'vendors') return inventoryService.createVendor({
        name: form.name, ntn: form.ntn, strn: form.strn, phone: form.phone, email: form.email,
        contactPerson: form.contactPerson, taxStatus: form.taxStatus as Vendor['taxStatus'], status: 'active',
      });
      throw new Error('Choose a record type.');
    },
    onSuccess: () => { setModalOpen(false); setForm(defaultForm(tab)); setError(''); refresh(); },
    onError: (e) => setError(e instanceof Error ? e.message : 'Could not save record.'),
  });

  const actionMutation = useMutation<Expense | ProcurementRequest, Error, { kind: 'expense' | 'procurement'; id: string; action: string }>({
    mutationFn: ({ kind, id, action }: { kind: 'expense' | 'procurement'; id: string; action: string }) =>
      kind === 'expense'
        ? inventoryService.expenseAction(id, action as 'submit' | 'approve' | 'reject' | 'pay', action === 'pay' ? { paymentMethod: 'bank_transfer' } : undefined)
        : inventoryService.procurementAction(id, action as 'submit' | 'approve' | 'reject'),
    onSuccess: () => { setError(''); refresh(); },
    onError: (e) => setError(e instanceof Error ? e.message : 'Could not update this record.'),
  });

  const transactionMutation = useMutation({
    mutationFn: () => inventoryService.transact(transactionItem!._id, {
      type: form.transactionType || 'verification', quantity: Number(form.quantity || 0),
      fromLocation: form.fromLocation, toLocation: form.toLocation, referenceNo: form.referenceNo, notes: form.notes,
    }),
    onSuccess: () => { setTransactionItem(null); setForm(defaultForm(tab)); setError(''); refresh(); },
    onError: (e) => setError(e instanceof Error ? e.message : 'Could not record transaction.'),
  });

  const filteredItems = useMemo(() => (itemsQuery.data ?? []).filter((item) =>
    !search || `${item.name} ${item.assetCode} ${item.category} ${item.serialNo ?? ''}`.toLowerCase().includes(search.toLowerCase())
  ), [itemsQuery.data, search]);
  const searchText = search.toLowerCase();
  const filteredExpenses = (expensesQuery.data ?? []).filter(item => !search || `${item.voucherNo} ${item.description} ${item.category} ${item.status}`.toLowerCase().includes(searchText));
  const filteredIncome = (incomeQuery.data ?? []).filter(item => !search || `${item.receiptNo} ${item.description} ${item.category} ${item.payerName ?? ''}`.toLowerCase().includes(searchText));
  const filteredProcurements = (procurementQuery.data ?? []).filter(item => !search || `${item.requestNo} ${item.title} ${item.purpose} ${item.department ?? ''} ${item.status}`.toLowerCase().includes(searchText));
  const filteredVendors = (vendorsQuery.data ?? []).filter(item => !search || `${item.name} ${item.ntn ?? ''} ${item.contactPerson ?? ''} ${item.phone ?? ''}`.toLowerCase().includes(searchText));

  const role = user?.role ?? '';
  const canCreate = tab === 'items' ||
    (['procurement', 'vendors'].includes(tab) && ['accountant', 'branch_principal', 'group_admin'].includes(role)) ||
    (['expenses', 'income'].includes(tab) && ['accountant', 'group_admin'].includes(role));
  const canApprove = ['group_admin', 'branch_principal'].includes(user?.role ?? '');
  const canPay = ['group_admin', 'accountant'].includes(user?.role ?? '');
  const canSubmitProcurement = ['group_admin', 'branch_principal', 'accountant'].includes(role);

  const openCreate = () => { setForm({ ...defaultForm(tab), branchId: activeBranch?.id ?? '' }); setError(''); setModalOpen(true); };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1500px] mx-auto">
      <PageHeader
        title="Assets, Inventory & Finance"
        subtitle="Pakistan-ready asset control, income, expenditure, procurement and campus surplus"
        actions={<button onClick={() => refresh()} className="btn-secondary px-3" title="Refresh"><RefreshCw className="w-4 h-4" /></button>}
      />

      <div className="flex gap-1 overflow-x-auto pb-2 mb-5 scrollbar-none" role="tablist">
        {visibleTabs.map((item) => <button key={item.id} onClick={() => { setTab(item.id); setSearch(''); setError(''); }} className={cn('shrink-0 inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors', tab === item.id ? 'bg-blue-600 text-white shadow-sm' : 'bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:text-gray-900')}>{item.icon}{item.label}</button>)}
      </div>

      {error && !modalOpen && !transactionItem && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">{error}</div>}

      {tab === 'overview' && <Overview finance={financeQuery.data} inventory={dashboardQuery.data} />}

      {tab !== 'overview' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-lg">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-10" placeholder={`Search ${tabs.find(t => t.id === tab)?.label.toLowerCase()}…`} />
            </div>
            {canCreate && <button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" />Add {{ items: 'item', expenses: 'expense', income: 'income', procurement: 'request', vendors: 'vendor', overview: 'record' }[tab]}</button>}
          </div>

          {tab === 'items' && (itemsQuery.isLoading ? <LoadingState /> : filteredItems.length ? <ItemGrid items={filteredItems} onTransaction={(item) => { setTransactionItem(item); setForm({ ...defaultForm(tab), transactionType: item.type === 'consumable' ? 'issue' : 'verification', quantity: item.type === 'consumable' ? '1' : '0' }); setError(''); }} /> : <EmptyState title="No assets or stock found" />)}
          {tab === 'expenses' && (expensesQuery.isLoading ? <LoadingState /> : filteredExpenses.length ? <ExpenseGrid items={filteredExpenses} canApprove={canApprove} canPay={canPay} onAction={(id, action) => actionMutation.mutate({ kind: 'expense', id, action })} /> : <EmptyState title="No expenses found" />)}
          {tab === 'income' && (incomeQuery.isLoading ? <LoadingState /> : filteredIncome.length ? <IncomeGrid items={filteredIncome} /> : <EmptyState title="No income records found" />)}
          {tab === 'procurement' && (procurementQuery.isLoading ? <LoadingState /> : filteredProcurements.length ? <ProcurementGrid items={filteredProcurements} canApprove={canApprove} canSubmit={canSubmitProcurement} onAction={(id, action) => actionMutation.mutate({ kind: 'procurement', id, action })} /> : <EmptyState title="No procurement requests found" />)}
          {tab === 'vendors' && (vendorsQuery.isLoading ? <LoadingState /> : filteredVendors.length ? <VendorGrid items={filteredVendors} /> : <EmptyState title="No vendors found" />)}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={`Add ${tabs.find(t => t.id === tab)?.label ?? 'record'}`} subtitle="Required fields are marked with *" size="lg" footer={<><button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button><button className="btn-primary" disabled={mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? 'Saving…' : 'Save record'}</button></>}>
        <CreateForm tab={tab} form={form} setForm={setForm} metadata={metadataQuery.data} branches={branchesQuery.data ?? []} showBranch={user?.role === 'group_admin' && !activeBranch} />
        {error && <p className="mt-4 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl p-3">{error}</p>}
      </Modal>

      <Modal open={!!transactionItem} onClose={() => setTransactionItem(null)} title={`Record transaction · ${transactionItem?.name ?? ''}`} subtitle={transactionItem?.assetCode} footer={<><button className="btn-secondary" onClick={() => setTransactionItem(null)}>Cancel</button><button className="btn-primary" disabled={transactionMutation.isPending} onClick={() => transactionMutation.mutate()}>Record transaction</button></>}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Transaction type"><select className="input" value={form.transactionType ?? 'verification'} onChange={e => setFormValue(setForm, 'transactionType', e.target.value)}>{['receipt','issue','return','transfer','adjustment','maintenance','verification','loss','disposal'].map(v => <option key={v} value={v}>{v.replaceAll('_', ' ')}</option>)}</select></Field>
          <Field label="Quantity"><input className="input" type="number" min="0" value={form.quantity ?? '0'} onChange={e => setFormValue(setForm, 'quantity', e.target.value)} /></Field>
          <Field label="From location"><input className="input" value={form.fromLocation ?? ''} onChange={e => setFormValue(setForm, 'fromLocation', e.target.value)} /></Field>
          <Field label="To location"><input className="input" value={form.toLocation ?? ''} onChange={e => setFormValue(setForm, 'toLocation', e.target.value)} /></Field>
          <Field label="Reference"><input className="input" value={form.referenceNo ?? ''} onChange={e => setFormValue(setForm, 'referenceNo', e.target.value)} /></Field>
          <Field label="Notes"><input className="input" value={form.notes ?? ''} onChange={e => setFormValue(setForm, 'notes', e.target.value)} /></Field>
        </div>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </Modal>
    </div>
  );
}

function setFormValue(setForm: React.Dispatch<React.SetStateAction<FormState>>, key: string, value: string) {
  setForm(current => ({ ...current, [key]: value }));
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="label">{label}</span>{children}</label>;
}

function CreateForm({ tab, form, setForm, metadata, branches, showBranch }: {
  tab: Tab; form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>>;
  metadata?: { assetCategories: string[]; expenseCategories: string[]; incomeCategories: string[]; procurementMethods: string[] };
  branches: { _id: string; name: string }[]; showBranch: boolean;
}) {
  const input = (key: string) => ({ value: form[key] ?? '', onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setFormValue(setForm, key, e.target.value) });
  const branch = showBranch ? <Field label="Branch *"><select className="input" {...input('branchId')}><option value="">Select branch</option>{branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}</select></Field> : null;
  if (tab === 'items') return <div className="grid sm:grid-cols-2 gap-4">{branch}<Field label="Item type *"><select className="input" {...input('type')}><option value="fixed_asset">Fixed asset</option><option value="consumable">Consumable stock</option></select></Field><Field label="Name *"><input className="input" {...input('name')} /></Field><Field label="Category *"><input className="input" list="asset-categories" {...input('category')} /><datalist id="asset-categories">{metadata?.assetCategories.map(v => <option key={v} value={v} />)}</datalist></Field><Field label="Quantity *"><input className="input" type="number" min="0" {...input('quantity')} /></Field><Field label="Unit cost (PKR)"><input className="input" type="number" min="0" {...input('unitCost')} /></Field><Field label="Unit"><input className="input" placeholder="unit, box, litre…" {...input('unit')} /></Field><Field label="Reorder level"><input className="input" type="number" min="0" {...input('reorderLevel')} /></Field><Field label="Location"><input className="input" {...input('location')} /></Field><Field label="Department"><input className="input" {...input('department')} /></Field>{form.type === 'fixed_asset' && <Field label="Useful life (months)"><input className="input" type="number" min="1" {...input('usefulLifeMonths')} /></Field>}<Field label="Condition"><select className="input" {...input('condition')}>{['new','good','fair','poor','unserviceable'].map(v => <option key={v}>{v}</option>)}</select></Field></div>;
  if (tab === 'expenses') return <div className="grid sm:grid-cols-2 gap-4">{branch}<Field label="Description *"><input className="input" {...input('description')} /></Field><Field label="Category *"><input className="input" list="expense-categories" {...input('category')} /><datalist id="expense-categories">{metadata?.expenseCategories.map(v => <option key={v} value={v} />)}</datalist></Field><Field label="Gross amount (PKR) *"><input className="input" type="number" min="0" {...input('amount')} /></Field><Field label="Cost centre"><input className="input" {...input('costCenter')} /></Field><Field label="Expense date"><input className="input" type="date" {...input('expenseDate')} /></Field><Field label="Payment method"><select className="input" {...input('paymentMethod')}>{['bank_transfer','cash','cheque','jazzcash','easypaisa','other'].map(v => <option key={v}>{v.replaceAll('_',' ')}</option>)}</select></Field><p className="sm:col-span-2 text-xs text-gray-400">This enters the maker/checker workflow as Submitted. Group Admin or Principal approval is required before payment.</p></div>;
  if (tab === 'income') return <div className="grid sm:grid-cols-2 gap-4">{branch}<Field label="Description *"><input className="input" {...input('description')} /></Field><Field label="Category *"><input className="input" list="income-categories" {...input('category')} /><datalist id="income-categories">{metadata?.incomeCategories.map(v => <option key={v} value={v} />)}</datalist></Field><Field label="Amount (PKR) *"><input className="input" type="number" min="0" {...input('amount')} /></Field><Field label="Received date"><input className="input" type="date" {...input('receivedAt')} /></Field><Field label="Payer"><input className="input" {...input('payerName')} /></Field><Field label="Funding source"><input className="input" {...input('fundingSource')} /></Field><Field label="Payment method"><select className="input" {...input('paymentMethod')}>{['bank_transfer','cash','cheque','jazzcash','easypaisa','other'].map(v => <option key={v}>{v.replaceAll('_',' ')}</option>)}</select></Field></div>;
  if (tab === 'procurement') return <div className="grid sm:grid-cols-2 gap-4">{branch}<Field label="Request title *"><input className="input" {...input('title')} /></Field><Field label="Department"><input className="input" {...input('department')} /></Field><Field label="Purpose"><textarea className="input min-h-24" {...input('purpose')} /></Field><Field label="Specifications"><textarea className="input min-h-24" {...input('specifications')} /></Field><Field label="Quantity *"><input className="input" type="number" min="0" {...input('quantity')} /></Field><Field label="Estimated unit cost"><input className="input" type="number" min="0" {...input('unitCost')} /></Field><Field label="Unit"><input className="input" {...input('unit')} /></Field><Field label="Budget head"><input className="input" {...input('budgetHead')} /></Field><Field label="Procurement method"><select className="input" {...input('procurementMethod')}>{metadata?.procurementMethods.map(v => <option key={v}>{v.replaceAll('_',' ')}</option>)}</select></Field></div>;
  return <div className="grid sm:grid-cols-2 gap-4"><Field label="Vendor name *"><input className="input" {...input('name')} /></Field><Field label="Contact person"><input className="input" {...input('contactPerson')} /></Field><Field label="NTN"><input className="input" {...input('ntn')} /></Field><Field label="STRN"><input className="input" {...input('strn')} /></Field><Field label="Phone"><input className="input" {...input('phone')} /></Field><Field label="Email"><input className="input" type="email" {...input('email')} /></Field><Field label="Tax status"><select className="input" {...input('taxStatus')}>{['unknown','filer','non_filer','exempt'].map(v => <option key={v}>{v.replaceAll('_',' ')}</option>)}</select></Field></div>;
}

function ItemGrid({ items, onTransaction }: { items: InventoryItem[]; onTransaction: (item: InventoryItem) => void }) {
  return <div className="grid lg:grid-cols-2 2xl:grid-cols-3 gap-4">{items.map(item => <article key={item._id} className="card p-4 sm:p-5"><div className="flex gap-3"><div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 grid place-items-center shrink-0">{item.type === 'fixed_asset' ? <Building2 className="w-5 h-5" /> : <Package className="w-5 h-5" />}</div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><h3 className="font-bold text-gray-900 dark:text-white truncate">{item.name}</h3><p className="font-mono text-[11px] text-gray-400 mt-0.5">{item.assetCode}</p></div><Badge variant={statusVariant(item.status)}>{item.status.replaceAll('_',' ')}</Badge></div><p className="text-xs text-gray-500 dark:text-slate-400 mt-3 line-clamp-2">{item.category} · {item.location || 'No location'}{branchName(item.branchId) ? ` · ${branchName(item.branchId)}` : ''}</p><div className="grid grid-cols-3 gap-2 mt-4"><MiniValue label="Available" value={`${item.availableQuantity}/${item.quantity}`} /><MiniValue label="Unit cost" value={formatCurrency(item.unitCost)} /><MiniValue label="Condition" value={item.condition} /></div><button onClick={() => onTransaction(item)} className="btn-secondary w-full mt-4 py-2"><RefreshCw className="w-3.5 h-3.5" />Transaction / verify</button></div></div></article>)}</div>;
}

function MiniValue({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-slate-50 dark:bg-slate-700/40 px-2.5 py-2 min-w-0"><p className="text-[9px] uppercase tracking-wide text-gray-400">{label}</p><p className="text-xs font-bold text-gray-800 dark:text-slate-200 mt-0.5 truncate capitalize">{value}</p></div>; }

function ExpenseGrid({ items, canApprove, canPay, onAction }: { items: Expense[]; canApprove: boolean; canPay: boolean; onAction: (id: string, action: string) => void }) {
  return <div className="grid lg:grid-cols-2 gap-4">{items.map(item => <article key={item._id} className="card p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-mono text-[11px] text-gray-400">{item.voucherNo}</p><h3 className="font-bold text-gray-900 dark:text-white mt-1">{item.description}</h3><p className="text-xs text-gray-400 mt-1">{item.category} · {formatDate(item.expenseDate)}{branchName(item.branchId) ? ` · ${branchName(item.branchId)}` : ''}</p></div><Badge variant={statusVariant(item.status)}>{item.status}</Badge></div><div className="flex items-end justify-between mt-5 gap-3"><div><p className="text-[10px] uppercase text-gray-400">Net amount</p><p className="text-xl font-extrabold text-gray-900 dark:text-white">{formatCurrency(item.netPaid)}</p></div><div className="flex gap-2 flex-wrap justify-end">{canApprove && item.status === 'submitted' && <><button className="btn-secondary py-2 px-3 text-emerald-600" onClick={() => onAction(item._id,'approve')}><Check className="w-4 h-4" />Approve</button><button className="btn-secondary py-2 px-3 text-red-600" onClick={() => onAction(item._id,'reject')}><X className="w-4 h-4" />Reject</button></>}{canPay && item.status === 'approved' && <button className="btn-primary py-2 px-3" onClick={() => onAction(item._id,'pay')}><Banknote className="w-4 h-4" />Mark paid</button>}</div></div></article>)}</div>;
}

function IncomeGrid({ items }: { items: IncomeEntry[] }) { return <div className="grid lg:grid-cols-2 2xl:grid-cols-3 gap-4">{items.map(item => <article key={item._id} className="card p-5"><div className="flex items-start justify-between"><CircleDollarSign className="w-6 h-6 text-emerald-500" /><Badge variant={statusVariant(item.status)}>{item.status}</Badge></div><p className="text-2xl font-extrabold text-emerald-600 mt-4">{formatCurrency(item.amount)}</p><h3 className="font-semibold text-gray-900 dark:text-white mt-2">{item.description}</h3><p className="text-xs text-gray-400 mt-1">{item.category} · {formatDate(item.receivedAt)}{branchName(item.branchId) ? ` · ${branchName(item.branchId)}` : ''}</p><div className="flex gap-2 mt-4"><Badge>{item.paymentMethod.replaceAll('_',' ')}</Badge>{item.restrictedFund && <Badge variant="purple">Restricted fund</Badge>}</div></article>)}</div>; }

function ProcurementGrid({ items, canApprove, canSubmit, onAction }: { items: ProcurementRequest[]; canApprove: boolean; canSubmit: boolean; onAction: (id: string, action: string) => void }) { return <div className="grid lg:grid-cols-2 gap-4">{items.map(item => <article key={item._id} className="card p-5"><div className="flex gap-3"><div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-900/30 grid place-items-center shrink-0"><ShoppingCart className="w-5 h-5" /></div><div className="flex-1 min-w-0"><div className="flex justify-between gap-2"><div><p className="font-mono text-[11px] text-gray-400">{item.requestNo}</p><h3 className="font-bold text-gray-900 dark:text-white mt-1">{item.title}</h3></div><Badge variant={statusVariant(item.status)}>{item.status.replaceAll('_',' ')}</Badge></div><p className="text-xs text-gray-400 mt-2">{item.procurementMethod.replaceAll('_',' ')} · {item.items.length} line item(s){branchName(item.branchId) ? ` · ${branchName(item.branchId)}` : ''}</p><p className="text-xl font-extrabold text-gray-900 dark:text-white mt-4">{formatCurrency(item.estimatedTotal)}</p><div className="flex gap-2 mt-4 flex-wrap">{canSubmit && item.status === 'draft' && <button className="btn-secondary py-2 px-3" onClick={() => onAction(item._id,'submit')}><ArrowUpRight className="w-4 h-4" />Submit</button>}{canApprove && item.status === 'submitted' && <><button className="btn-secondary py-2 px-3 text-emerald-600" onClick={() => onAction(item._id,'approve')}><Check className="w-4 h-4" />Approve</button><button className="btn-secondary py-2 px-3 text-red-600" onClick={() => onAction(item._id,'reject')}><X className="w-4 h-4" />Reject</button></>}</div></div></div></article>)}</div>; }

function VendorGrid({ items }: { items: Vendor[] }) { return <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{items.map(item => <article key={item._id} className="card p-5"><div className="flex items-start justify-between"><div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-900/30 grid place-items-center"><Truck className="w-5 h-5" /></div><Badge variant={statusVariant(item.status)}>{item.status}</Badge></div><h3 className="font-bold text-gray-900 dark:text-white mt-4">{item.name}</h3><p className="text-xs text-gray-400 mt-1">{item.contactPerson || 'No contact person'} · {item.phone || 'No phone'}</p><div className="flex gap-2 mt-4"><Badge variant={item.taxStatus === 'filer' ? 'success' : item.taxStatus === 'non_filer' ? 'warning' : 'default'}>{item.taxStatus.replaceAll('_',' ')}</Badge>{item.ntn && <Badge>NTN {item.ntn}</Badge>}</div></article>)}</div>; }
