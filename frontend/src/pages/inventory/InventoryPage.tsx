import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownRight, ArrowUpRight, Banknote, Boxes, Building2,
  AlertCircle, Check, ChevronRight, CircleDollarSign, ClipboardCheck, FileText,
  FolderTree, Landmark, MapPin, Package, Plus, ReceiptText, RefreshCw, Search, ShieldCheck,
  ShoppingBag, ShoppingCart, Store, TrendingUp, Truck, WalletCards, Wrench, X,
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
import AccountsTab from '../../components/inventory/AccountsTab';
import POSTab from '../../components/inventory/POSTab';

type Tab = 'overview' | 'items' | 'expenses' | 'income' | 'procurement' | 'vendors' | 'accounts' | 'pos';
type FormState = Record<string, string>;
const INVENTORY_NOW = new Date();

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <TrendingUp className="w-4 h-4" /> },
  { id: 'items', label: 'Assets & Stock', icon: <Boxes className="w-4 h-4" /> },
  { id: 'expenses', label: 'Expenses', icon: <ReceiptText className="w-4 h-4" /> },
  { id: 'income', label: 'Income', icon: <CircleDollarSign className="w-4 h-4" /> },
  { id: 'procurement', label: 'Procurement', icon: <ShoppingCart className="w-4 h-4" /> },
  { id: 'vendors', label: 'Vendors', icon: <Store className="w-4 h-4" /> },
  { id: 'accounts', label: 'Accounts', icon: <Landmark className="w-4 h-4" /> },
  { id: 'pos', label: 'POS', icon: <ShoppingBag className="w-4 h-4" /> },
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

type OverviewStats = { total: number; alerts: number; verified: number; verificationPct: number; overdue: number; maintenance: number; lowStock: number };
type OverviewProps = {
  finance?: FinanceSummary; inventory?: InventoryDashboard; history?: FinanceSummary[];
  items: InventoryItem[]; expenses: Expense[]; procurements: ProcurementRequest[];
  stats: OverviewStats; role: string; branchLabel: string; onOpenTab: (tab: Tab) => void;
};

function OverviewCard({ label, value, hint, icon, tone = 'blue' }: { label: string; value: string; hint: string; icon: React.ReactNode; tone?: 'blue' | 'emerald' | 'amber' | 'red' }) {
  const tones = { blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30', emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30', amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30', red: 'bg-red-50 text-red-600 dark:bg-red-900/30' };
  return <article className="card p-4 sm:p-5 min-w-0 border-l-3 border-l-blue-500"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-gray-400">{label}</p><p className="text-xl sm:text-2xl font-extrabold text-gray-950 dark:text-white mt-1 truncate">{value}</p><p className="text-[11px] text-gray-400 mt-1 truncate">{hint}</p></div><span className={cn('w-10 h-10 rounded-xl grid place-items-center shrink-0', tones[tone])}>{icon}</span></div></article>;
}

function BlueprintHero({ finance, principal = false, previous }: { finance: FinanceSummary; principal?: boolean; previous?: FinanceSummary }) {
  const positive = finance.operatingSurplus >= 0;
  const change = previous && Math.abs(previous.operatingSurplus) > 0 ? ((finance.operatingSurplus - previous.operatingSurplus) / Math.abs(previous.operatingSurplus)) * 100 : null;
  return <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-navy-950 via-blue-950 to-blue-700 text-white p-5 sm:p-7 shadow-xl">
    <div className="absolute -right-20 -top-24 w-72 h-72 bg-blue-400/20 rounded-full blur-2xl" />
    <div className="relative flex flex-col xl:flex-row xl:items-end justify-between gap-7">
      <div className="min-w-0"><p className="text-[10px] uppercase tracking-[.2em] text-blue-200 font-bold">{finance.month} · {principal ? 'Branch operating result' : 'Organization operating result'}</p><p className="text-sm text-white/60 mt-4">{positive ? 'Operating surplus' : 'Operating deficit'}</p><div className="flex items-center gap-2 mt-1">{positive ? <ArrowUpRight className="w-6 h-6 text-emerald-300" /> : <ArrowDownRight className="w-6 h-6 text-red-300" />}<p className="text-3xl sm:text-5xl font-extrabold tracking-tight">{formatCurrency(Math.abs(finance.operatingSurplus))}</p></div><div className="flex flex-wrap gap-2 mt-3"><span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-200">{finance.operatingMargin.toFixed(1)}% margin</span>{change !== null && <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', change >= 0 ? 'bg-emerald-400/15 text-emerald-200' : 'bg-red-400/15 text-red-200')}>{change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}% vs previous month</span>}</div></div>
      <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2 w-full xl:w-auto"><HeroFigure label="Cash surplus" value={finance.cashSurplus} /><span className="text-white/35 font-bold">−</span><HeroFigure label="Depreciation" value={finance.depreciation} /><span className="text-white/35 font-bold">=</span><HeroFigure label="Final result" value={finance.operatingSurplus} emphasized /></div>
    </div>
    <div className="relative grid grid-cols-2 md:grid-cols-4 gap-2 mt-7 pt-5 border-t border-white/10">{[['Total income', finance.totalRevenue], ['Operating expenses', finance.operatingExpenses], ['Payroll', finance.payroll], ['Outstanding fees', finance.outstandingFees]].map(([label, value]) => <div key={String(label)}><p className="text-[9px] uppercase tracking-wide text-white/45">{label}</p><p className="text-sm font-bold mt-1 truncate">{formatCurrency(Number(value))}</p></div>)}</div>
  </section>;
}

function HeroFigure({ label, value, emphasized }: { label: string; value: number; emphasized?: boolean }) {
  return <div className={cn('rounded-xl border px-3 py-3 min-w-0', emphasized ? 'bg-emerald-400/15 border-emerald-300/20' : 'bg-white/8 border-white/10')}><p className="text-[8px] text-white/50 uppercase truncate">{label}</p><p className={cn('text-xs sm:text-sm font-extrabold mt-1 truncate', emphasized && 'text-emerald-200')}>{formatCurrency(value)}</p></div>;
}

function FinanceTrend({ history = [] }: { history?: FinanceSummary[] }) {
  const values = history.length ? history : [];
  const max = Math.max(1, ...values.flatMap(row => [row.totalRevenue, row.operatingExpenses + row.payroll + row.depreciation]));
  const points = (key: 'income' | 'cost') => values.map((row, index) => {
    const x = values.length === 1 ? 50 : 4 + (index / (values.length - 1)) * 92;
    const amount = key === 'income' ? row.totalRevenue : row.operatingExpenses + row.payroll + row.depreciation;
    return `${x},${92 - (amount / max) * 75}`;
  }).join(' ');
  return <section className="card overflow-hidden"><div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex items-start justify-between gap-3"><div><h2 className="font-bold text-gray-950 dark:text-white">Income vs total operating cost</h2><p className="text-xs text-gray-400 mt-0.5">Actual six-month ledger trend</p></div><div className="flex gap-3 text-[10px] text-gray-500"><span><i className="inline-block w-2 h-2 rounded-sm bg-blue-600 mr-1" />Income</span><span><i className="inline-block w-2 h-2 rounded-sm bg-amber-500 mr-1" />Cost</span></div></div><div className="p-4 sm:p-5">{values.length > 1 ? <><svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-44" role="img" aria-label="Six month income and cost trend"><path d="M4 17H96M4 54H96M4 92H96" stroke="currentColor" className="text-gray-100 dark:text-slate-700" strokeWidth=".5" /><polyline points={points('income')} fill="none" stroke="#2563eb" strokeWidth="2.2" vectorEffect="non-scaling-stroke" /><polyline points={points('cost')} fill="none" stroke="#f59e0b" strokeWidth="2.2" vectorEffect="non-scaling-stroke" /></svg><div className="flex justify-between mt-1 text-[10px] text-gray-400">{values.map(row => <span key={row.month}>{new Date(`${row.month}-02`).toLocaleDateString('en-PK', { month: 'short' })}</span>)}</div></> : <div className="h-44 grid place-items-center text-sm text-gray-400">Trend appears after two months of financial data.</div>}</div></section>;
}

function DecisionQueue({ inventory, expenses, procurements, onOpenTab, embedded = false }: { inventory: InventoryDashboard; expenses: Expense[]; procurements: ProcurementRequest[]; onOpenTab: (tab: Tab) => void; embedded?: boolean }) {
  const rows = [
    { label: 'Expense approvals', detail: 'Submitted for decision', value: expenses.filter(row => row.status === 'submitted').length, tab: 'expenses' as Tab, tone: 'text-violet-600 bg-violet-50 dark:bg-violet-900/30', icon: <ReceiptText className="w-4 h-4" /> },
    { label: 'Procurement approvals', detail: 'Submitted requests', value: procurements.filter(row => row.status === 'submitted').length, tab: 'procurement' as Tab, tone: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30', icon: <ShoppingCart className="w-4 h-4" /> },
    { label: 'Maintenance required', detail: 'Assets affecting operations', value: inventory.maintenanceDue, tab: 'items' as Tab, tone: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30', icon: <Wrench className="w-4 h-4" /> },
    { label: 'Verification overdue', detail: 'Physical checks past due', value: inventory.verificationOverdue, tab: 'items' as Tab, tone: 'text-red-600 bg-red-50 dark:bg-red-900/30', icon: <ClipboardCheck className="w-4 h-4" /> },
  ];
  const body = <div className="divide-y divide-gray-100 dark:divide-slate-700">{rows.map(row => <button key={row.label} onClick={() => onOpenTab(row.tab)} className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-gray-50 dark:hover:bg-slate-800/60"><span className={cn('w-9 h-9 rounded-xl grid place-items-center', row.tone)}>{row.icon}</span><span className="flex-1 min-w-0"><b className="block text-sm text-gray-800 dark:text-slate-100">{row.label}</b><small className="block text-[10px] text-gray-400 mt-0.5">{row.detail}</small></span><strong className={cn('text-sm', row.value ? 'text-gray-950 dark:text-white' : 'text-emerald-600')}>{row.value}</strong><ChevronRight className="w-4 h-4 text-gray-300" /></button>)}</div>;
  if (embedded) return body;
  return <section className="card overflow-hidden"><div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between gap-3"><div><h2 className="font-bold text-gray-950 dark:text-white">Decision queue</h2><p className="text-xs text-gray-400 mt-0.5">Only items that need action</p></div><Badge variant={rows.some(row => row.value) ? 'warning' : 'success'}>{rows.reduce((sum, row) => sum + row.value, 0)} open</Badge></div>{body}</section>;
}

function SourceTruth({ finance, items, expenses, procurements }: { finance: FinanceSummary; items: InventoryItem[]; expenses: Expense[]; procurements: ProcurementRequest[] }) {
  const updated = [finance.dataAsOf, ...items.map(row => row.updatedAt), ...expenses.map(row => row.updatedAt || ''), ...procurements.map(row => row.updatedAt || '')].filter(Boolean).map(value => new Date(value).getTime()).filter(Number.isFinite);
  const latest = updated.length ? new Date(Math.max(...updated)) : null;
  return <section className="card overflow-hidden grid lg:grid-cols-[250px_1fr]"><div className="p-5 bg-linear-to-br from-navy-950 to-blue-900 text-white flex gap-3"><span className="w-10 h-10 rounded-xl bg-emerald-400/15 text-emerald-300 grid place-items-center shrink-0"><ShieldCheck className="w-5 h-5" /></span><div><h2 className="font-bold">Source-of-truth controls</h2><p className="text-xs text-blue-200/70 mt-1">Freshness, formula and completeness are visible.</p></div></div><div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100 dark:divide-slate-700"><div className="p-5"><p className="text-[9px] uppercase tracking-wide text-gray-400">Data freshness</p><p className="text-sm font-bold mt-1 dark:text-white">{latest ? latest.toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' }) : 'No activity yet'}</p><p className="text-[10px] text-gray-400 mt-1">Latest record or finance calculation</p></div><div className="p-5"><p className="text-[9px] uppercase tracking-wide text-gray-400">Calculation definition</p><p className="text-sm font-bold mt-1 dark:text-white">Operating surplus</p><p className="text-[10px] text-gray-400 mt-1">Income − expenses − payroll − depreciation</p></div><div className="p-5"><p className="text-[9px] uppercase tracking-wide text-gray-400">Record coverage</p><p className="text-sm font-bold mt-1 dark:text-white">{items.length + expenses.length + procurements.length} loaded records</p><p className="text-[10px] text-gray-400 mt-1">Current role and branch scope</p></div></div></section>;
}

function GroupBlueprint(props: Required<Pick<OverviewProps, 'finance' | 'inventory'>> & OverviewProps) {
  const { finance, inventory, history, items, expenses, procurements, stats, branchLabel, onOpenTab } = props;
  const maxSurplus = Math.max(1, ...finance.branchPerformance.map(branch => Math.abs(branch.operatingSurplus)));
  return <div className="space-y-5"><div className="grid xl:grid-cols-[1.35fr_.65fr] gap-4"><BlueprintHero finance={finance} principal={branchLabel !== 'All branches'} previous={history?.at(-2)} /><section className="card p-5 flex flex-col"><div className="flex items-center gap-3"><span className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 grid place-items-center"><TrendingUp className="w-5 h-5" /></span><div><p className="text-[10px] uppercase tracking-wide text-gray-400">Group Administrator brief</p><h2 className="font-bold dark:text-white">{finance.operatingSurplus >= 0 ? 'Healthy and improving' : 'Deficit needs intervention'}</h2></div></div><p className="text-sm text-gray-500 dark:text-slate-400 leading-6 mt-5">Every PKR 100 received produced <b className="text-gray-900 dark:text-white">PKR {Math.abs(finance.operatingMargin).toFixed(2)}</b> in operating {finance.operatingSurplus >= 0 ? 'surplus' : 'deficit'} after cash costs and depreciation.</p><button onClick={() => onOpenTab('income')} className="mt-auto pt-5 text-left text-xs font-bold text-blue-600">Review income register →</button></section></div>
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3"><OverviewCard label="Outstanding fees" value={formatCurrency(finance.outstandingFees)} hint={`${finance.feeRecoveryRate.toFixed(1)}% current-month recovery`} icon={<WalletCards className="w-5 h-5" />} tone="amber" /><OverviewCard label="Net book value" value={formatCurrency(inventory.netBookValue)} hint={`${inventory.fixedAssets} fixed-asset records`} icon={<Building2 className="w-5 h-5" />} /><OverviewCard label="Assets verified" value={`${stats.verificationPct}%`} hint={`${stats.verified} of ${stats.total} records current`} icon={<ShieldCheck className="w-5 h-5" />} tone="emerald" /><OverviewCard label="Decisions waiting" value={String(inventory.pendingExpenses + inventory.pendingProcurements)} hint="Expense and procurement approvals" icon={<ClipboardCheck className="w-5 h-5" />} tone="red" /></div>
    <div className="grid xl:grid-cols-[1fr_390px] gap-4"><FinanceTrend history={history} /><DecisionQueue inventory={inventory} expenses={expenses} procurements={procurements} onOpenTab={onOpenTab} /></div>
    <div className="grid xl:grid-cols-[1.3fr_.7fr] gap-4"><section className="card overflow-hidden"><div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between gap-3"><div><h2 className="font-bold dark:text-white">Campus operating performance</h2><p className="text-xs text-gray-400 mt-0.5">Final operating surplus after depreciation</p></div><Badge variant="info">{finance.branchPerformance.length} campuses</Badge></div><div className="divide-y divide-gray-100 dark:divide-slate-700">{finance.branchPerformance.length ? [...finance.branchPerformance].sort((a, b) => b.operatingSurplus - a.operatingSurplus).map((branch, index) => <div key={branch.branchId} className="px-5 py-3.5"><div className="flex items-center gap-3"><span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 grid place-items-center text-xs font-extrabold">{index + 1}</span><div className="flex-1 min-w-0"><div className="flex justify-between gap-3"><p className="text-sm font-semibold truncate dark:text-white">{branch.name}</p><p className={cn('text-sm font-extrabold', branch.operatingSurplus >= 0 ? 'text-emerald-600' : 'text-red-600')}>{formatCurrency(branch.operatingSurplus)}</p></div><div className="h-1.5 rounded-full bg-gray-100 dark:bg-slate-700 mt-2 overflow-hidden"><div className={cn('h-full rounded-full', branch.operatingSurplus >= 0 ? 'bg-blue-500' : 'bg-red-500')} style={{ width: `${Math.max(3, (Math.abs(branch.operatingSurplus) / maxSurplus) * 100)}%` }} /></div><div className="flex justify-between mt-1 text-[9px] text-gray-400"><span>Income {formatCurrency(branch.revenue)}</span><span>{branch.operatingMargin.toFixed(1)}% margin</span></div></div></div></div>) : <p className="p-8 text-sm text-center text-gray-400">Choose “All branches” to compare campuses.</p>}</div></section><section className="card p-5"><div className="flex justify-between gap-3"><div><h2 className="font-bold dark:text-white">Governance assurance</h2><p className="text-xs text-gray-400 mt-0.5">Asset and workflow controls</p></div><Badge variant={stats.verificationPct >= 90 ? 'success' : 'warning'}>{stats.verificationPct >= 90 ? 'Stable' : 'Watch'}</Badge></div><div className="mt-5 space-y-4"><AssuranceBar label="Asset verification" value={stats.verificationPct} /><AssuranceBar label="Fee recovery" value={finance.feeRecoveryRate} warning={finance.feeRecoveryRate < 85} /><AssuranceBar label="Approval clearance" value={(inventory.pendingExpenses + inventory.pendingProcurements) === 0 ? 100 : Math.max(0, 100 - (inventory.pendingExpenses + inventory.pendingProcurements) * 5)} warning /></div>{(stats.overdue > 0 || inventory.maintenanceDue > 0) && <div className="mt-5 rounded-xl bg-amber-50 dark:bg-amber-900/20 p-3 text-xs text-amber-800 dark:text-amber-200"><b>{stats.overdue + inventory.maintenanceDue} watch items:</b> overdue verification and maintenance need closure.</div>}</section></div>
    <SourceTruth finance={finance} items={items} expenses={expenses} procurements={procurements} /><p className="px-1 text-xs text-gray-400">{finance.terminology} Management information; not an audited statutory statement.</p></div>;
}

function AssuranceBar({ label, value, warning }: { label: string; value: number; warning?: boolean }) {
  const bounded = Math.min(100, Math.max(0, value));
  return <div><div className="flex justify-between text-xs"><span className="text-gray-500 dark:text-slate-400">{label}</span><b className="dark:text-white">{bounded.toFixed(0)}%</b></div><div className="h-2 rounded-full bg-gray-100 dark:bg-slate-700 mt-2 overflow-hidden"><div className={cn('h-full rounded-full', warning && bounded < 85 ? 'bg-amber-500' : 'bg-emerald-500')} style={{ width: `${bounded}%` }} /></div></div>;
}

function PrincipalBlueprint(props: Required<Pick<OverviewProps, 'finance' | 'inventory'>> & OverviewProps) {
  const { finance, inventory, history, items, expenses, procurements, stats, branchLabel, onOpenTab } = props;
  const previous = history?.at(-2);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const daysInMonth = new Date(Number(finance.month.slice(0, 4)), Number(finance.month.slice(5, 7)), 0).getDate();
  const elapsed = finance.month === currentMonth ? new Date().getDate() : daysInMonth;
  const forecast = Math.round((finance.operatingSurplus / Math.max(1, elapsed)) * daysInMonth);
  const committedProcurement = procurements.filter(row => ['approved', 'quotation', 'ordered', 'partially_received'].includes(row.status)).reduce((sum, row) => sum + row.estimatedTotal, 0);
  const affected = items.filter(item => inventoryAlertReason(item) === 'Maintenance').slice(0, 4);
  const pending = expenses.filter(row => row.status === 'submitted').length + procurements.filter(row => row.status === 'submitted').length;
  const latestItems = [...items].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return <div className="space-y-5"><div className="card px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div className="flex items-center gap-2"><Badge variant="info">Principal view</Badge><p className="font-bold text-sm dark:text-white">{branchLabel}</p><span className="text-xs text-gray-400">· {finance.month}</span></div><div className="flex items-center gap-2 text-[10px] text-gray-400"><Badge variant="success">Live scope</Badge><span>Updated {new Date(finance.dataAsOf).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}</span></div></div>
    <div className="grid xl:grid-cols-[1.35fr_.65fr] gap-4"><BlueprintHero finance={finance} principal previous={previous} /><section className="card overflow-hidden"><div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between"><div><h2 className="font-bold dark:text-white">Month-end forecast</h2><p className="text-xs text-gray-400 mt-0.5">Directional run-rate projection</p></div><Badge variant={forecast >= 0 ? 'success' : 'danger'}>{elapsed}/{daysInMonth} days</Badge></div><div className="p-5"><p className={cn('text-3xl font-extrabold', forecast >= 0 ? 'text-emerald-600' : 'text-red-600')}>{formatCurrency(forecast)}</p><p className="text-xs text-gray-400 mt-1">Projected operating {forecast >= 0 ? 'surplus' : 'deficit'}</p><div className="h-2 rounded-full bg-gray-100 dark:bg-slate-700 mt-5 overflow-hidden"><div className="h-full w-[86%] bg-linear-to-r from-blue-500 to-emerald-500 rounded-full" /></div><p className="rounded-xl bg-blue-50 dark:bg-blue-900/20 text-[10px] text-blue-800 dark:text-blue-200 p-3 mt-4">Forecast extrapolates current month-to-date performance. It is not a configured budget forecast.</p></div></section></div>
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3"><OverviewCard label="Fee recovery" value={`${finance.feeRecoveryRate.toFixed(1)}%`} hint={`${formatCurrency(finance.outstandingFees)} outstanding`} icon={<WalletCards className="w-5 h-5" />} tone={finance.feeRecoveryRate >= 85 ? 'emerald' : 'amber'} /><OverviewCard label="Budget available" value="Not configured" hint="Budget model required" icon={<Banknote className="w-5 h-5" />} tone="amber" /><OverviewCard label="Committed procurement" value={formatCurrency(committedProcurement)} hint="Approved and in-progress requests" icon={<ShoppingCart className="w-5 h-5" />} /><OverviewCard label="Spaces impacted" value={String(new Set(affected.map(item => item.location || 'Unassigned')).size)} hint={`${affected.length} maintenance records`} icon={<MapPin className="w-5 h-5" />} tone={affected.length ? 'red' : 'emerald'} /></div>
    <div className="grid xl:grid-cols-[1fr_390px] gap-4"><div className="space-y-4"><FinanceTrend history={history} /><section className="card overflow-hidden"><div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between gap-3"><div><h2 className="font-bold dark:text-white">Fee collection risk</h2><p className="text-xs text-gray-400 mt-0.5">Outstanding receivables by due-date age</p></div><button onClick={() => onOpenTab('income')} className="text-xs font-bold text-blue-600">Review income →</button></div><div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100 dark:divide-slate-700">{[["Current · 0–30 days", finance.receivableAgeing.current, 'bg-emerald-500'], ['Attention · 31–60 days', finance.receivableAgeing.days31to60, 'bg-amber-500'], ['High risk · 61+ days', finance.receivableAgeing.over60, 'bg-red-500']].map(([label, raw, tone]) => { const bucket = raw as { amount: number; accounts: number }; return <div key={String(label)} className="p-5"><div className="flex items-center gap-2"><i className={cn('w-2 h-2 rounded-full', tone)} /><p className="text-[10px] text-gray-500">{String(label)}</p></div><p className="text-lg font-extrabold mt-2 dark:text-white">{formatCurrency(bucket.amount)}</p><p className="text-[10px] text-gray-400 mt-1">{bucket.accounts} fee accounts</p></div>; })}</div>{finance.receivableAgeing.over60.accounts > 0 && <div className="px-5 py-3 bg-amber-50 dark:bg-amber-900/20 text-xs text-amber-800 dark:text-amber-200"><b>Recommended:</b> prioritize {finance.receivableAgeing.over60.accounts} accounts older than 60 days.</div>}</section></div><section className="card overflow-hidden flex flex-col"><div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between gap-3"><div><h2 className="font-bold dark:text-white">Your decision queue</h2><p className="text-xs text-gray-400 mt-0.5">Branch-scoped approvals and exceptions</p></div><Badge variant={pending + stats.alerts ? 'warning' : 'success'}>{pending + stats.alerts} open</Badge></div><DecisionQueue inventory={inventory} expenses={expenses} procurements={procurements} onOpenTab={onOpenTab} embedded /></section></div>
    <div className="grid xl:grid-cols-3 gap-4"><section className="card overflow-hidden"><div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700"><h2 className="font-bold dark:text-white">Operational impact by location</h2><p className="text-xs text-gray-400 mt-0.5">Assets currently affecting service delivery</p></div><div className="divide-y divide-gray-100 dark:divide-slate-700">{affected.length ? affected.map(item => <button key={item._id} onClick={() => onOpenTab('items')} className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-gray-50 dark:hover:bg-slate-800"><span className="w-1.5 h-9 rounded-full bg-red-500" /><span className="flex-1 min-w-0"><b className="block text-sm truncate dark:text-white">{item.location || 'Unassigned location'}</b><small className="block text-[10px] text-gray-400 truncate">{item.name} · {item.condition.replaceAll('_', ' ')}</small></span><ChevronRight className="w-4 h-4 text-gray-300" /></button>) : <p className="p-8 text-sm text-center text-emerald-600">No learning spaces affected.</p>}</div></section><section className="card p-5"><div className="flex justify-between"><div><h2 className="font-bold dark:text-white">Budget control</h2><p className="text-xs text-gray-400 mt-0.5">Authorized, committed and available</p></div><Badge variant="warning">Setup needed</Badge></div><div className="mt-6 rounded-2xl border border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/60 dark:bg-amber-900/10 p-5 text-center"><Banknote className="w-7 h-7 text-amber-500 mx-auto" /><p className="font-bold text-sm mt-3 dark:text-white">Monthly budget not configured</p><p className="text-[10px] text-gray-500 mt-1">Committed procurement is {formatCurrency(committedProcurement)}. Available budget cannot be calculated safely without an authorized budget.</p></div></section><section className="card p-5"><div className="flex justify-between"><div><h2 className="font-bold dark:text-white">Peer benchmark</h2><p className="text-xs text-gray-400 mt-0.5">Branch versus group</p></div>{finance.peerBenchmark && <Badge variant="info">Rank #{finance.peerBenchmark.rank}/{finance.peerBenchmark.branchCount}</Badge>}</div>{finance.peerBenchmark ? <div className="mt-6"><div className="flex justify-between items-end"><div><p className="text-[10px] text-gray-400">Branch margin</p><p className="text-3xl font-extrabold dark:text-white">{finance.peerBenchmark.branchMargin.toFixed(1)}%</p></div><div className="text-right"><p className="text-[10px] text-gray-400">Group average</p><p className="text-lg font-bold text-blue-600">{finance.peerBenchmark.groupAverageMargin.toFixed(1)}%</p></div></div><div className="h-2 rounded-full bg-gray-100 dark:bg-slate-700 mt-5"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, Math.max(0, finance.peerBenchmark.branchMargin * 4))}%` }} /></div></div> : <p className="mt-8 text-sm text-gray-400 text-center">Peer benchmark is unavailable for this role.</p>}</section></div>
    <SourceTruth finance={finance} items={latestItems} expenses={expenses} procurements={procurements} /><p className="px-1 text-xs text-gray-400">{finance.terminology} Forecast is directional; budgets remain unavailable until a budget model is configured.</p></div>;
}

function Overview(props: OverviewProps) {
  if (!props.finance || !props.inventory) return <LoadingState />;
  const readyProps = { ...props, finance: props.finance, inventory: props.inventory };
  return props.role === 'branch_principal' ? <PrincipalBlueprint {...readyProps} /> : <GroupBlueprint {...readyProps} />;
}

function LoadingState() {
  return <div className="min-h-72 grid place-items-center"><RefreshCw className="w-7 h-7 text-blue-500 animate-spin" /></div>;
}

function EmptyState({ title }: { title: string }) {
  return <div className="card min-h-56 grid place-items-center text-center p-8"><div><FileText className="w-9 h-9 mx-auto text-gray-300" /><p className="font-semibold text-gray-600 dark:text-slate-300 mt-3">{title}</p><p className="text-xs text-gray-400 mt-1">Use the Add button to create the first record.</p></div></div>;
}

function inventoryAlertReason(item: InventoryItem): string | null {
  if (item.status === 'under_maintenance' || ['poor', 'unserviceable'].includes(item.condition)) return 'Maintenance';
  if (item.type === 'consumable' && item.availableQuantity <= item.reorderLevel) return 'Low stock';
  if (['lost', 'disposed'].includes(item.status)) return item.status === 'lost' ? 'Lost asset' : 'Disposed';
  if (!item.lastVerifiedAt || (item.nextVerificationDue && new Date(item.nextVerificationDue) < INVENTORY_NOW)) return 'Verification overdue';
  return null;
}

function isVerified(item: InventoryItem): boolean {
  return !!item.lastVerifiedAt && (!item.nextVerificationDue || new Date(item.nextVerificationDue) >= INVENTORY_NOW);
}

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const { user, activeBranch } = useAuthStore();
  const isInventoryOnly = user?.role === 'it_admin';
  const visibleTabs = isInventoryOnly ? tabs.filter(item => ['items', 'procurement', 'vendors', 'pos'].includes(item.id)) : tabs;
  const [tab, setTab] = useState<Tab>(isInventoryOnly ? 'items' : 'overview');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [transactionItem, setTransactionItem] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm('overview'));
  const [error, setError] = useState('');
  const [auditOnly, setAuditOnly] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [selectedCampus, setSelectedCampus] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [itemPage, setItemPage] = useState(1);
  const [recordPage, setRecordPage] = useState(1);
  const scopeKey = activeBranch?.id ?? 'all';
  const historyMonths = useMemo(() => Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - (5 - index));
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }), []);

  const financeQuery = useQuery({ queryKey: ['inventory-finance', scopeKey], queryFn: () => inventoryService.finance(), enabled: !isInventoryOnly });
  const financeHistoryQuery = useQuery({ queryKey: ['inventory-finance-history', scopeKey, historyMonths.join(',')], queryFn: () => Promise.all(historyMonths.map(month => inventoryService.finance(month, false))), enabled: !isInventoryOnly && tab === 'overview' });
  const dashboardQuery = useQuery({ queryKey: ['inventory-dashboard', scopeKey], queryFn: inventoryService.dashboard });
  const metadataQuery = useQuery({ queryKey: ['inventory-metadata'], queryFn: inventoryService.metadata });
  const itemsQuery = useQuery({ queryKey: ['inventory-items', scopeKey], queryFn: () => inventoryService.items({ limit: '2000' }) });
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

  const itemStats = useMemo(() => {
    const items = itemsQuery.data ?? [];
    const alerts = items.filter(item => inventoryAlertReason(item));
    const verified = items.filter(isVerified).length;
    return {
      total: items.length,
      alerts: alerts.length,
      verified,
      verificationPct: items.length ? Math.round((verified / items.length) * 100) : 0,
      overdue: items.filter(item => inventoryAlertReason(item) === 'Verification overdue').length,
      maintenance: items.filter(item => inventoryAlertReason(item) === 'Maintenance').length,
      lowStock: items.filter(item => inventoryAlertReason(item) === 'Low stock').length,
    };
  }, [itemsQuery.data]);
  const locationTree = useMemo(() => {
    const tree = new Map<string, Map<string, number>>();
    for (const item of itemsQuery.data ?? []) {
      const campus = branchName(item.branchId) || activeBranch?.name || 'Current campus';
      const location = item.location || 'Unassigned location';
      if (!tree.has(campus)) tree.set(campus, new Map());
      const locations = tree.get(campus)!;
      locations.set(location, (locations.get(location) ?? 0) + 1);
    }
    return [...tree.entries()].map(([campus, locations]) => ({ campus, locations: [...locations.entries()].sort((a, b) => a[0].localeCompare(b[0])) }));
  }, [itemsQuery.data, activeBranch?.name]);
  const filteredItems = useMemo(() => (itemsQuery.data ?? []).filter((item) => {
    const matchesSearch = !search || `${item.name} ${item.assetCode} ${item.category} ${item.serialNo ?? ''} ${item.location ?? ''}`.toLowerCase().includes(search.toLowerCase());
    const campus = branchName(item.branchId) || activeBranch?.name || 'Current campus';
    return matchesSearch && (!selectedCampus || campus === selectedCampus) && (!selectedLocation || item.location === selectedLocation) && (!auditOnly || !!inventoryAlertReason(item));
  }), [itemsQuery.data, search, selectedCampus, selectedLocation, auditOnly, activeBranch?.name]);
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
        title="Finance & Operations"
        subtitle="Income, expenditure, assets, procurement, vendors and operating surplus"
        actions={<button onClick={() => refresh()} className="btn-secondary px-3" title="Refresh"><RefreshCw className="w-4 h-4" /></button>}
      />

      <div className="flex gap-1 overflow-x-auto pb-2 mb-5 scrollbar-none" role="tablist">
        {visibleTabs.map((item) => <button key={item.id} onClick={() => { setTab(item.id); setSearch(''); setError(''); setRecordPage(1); }} className={cn('shrink-0 inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors', tab === item.id ? 'bg-blue-600 text-white shadow-sm' : 'bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:text-gray-900')}>{item.icon}{item.label}</button>)}
      </div>

      {error && !modalOpen && !transactionItem && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">{error}</div>}

      {tab === 'overview' && <Overview finance={financeQuery.data} inventory={dashboardQuery.data} history={financeHistoryQuery.data} items={itemsQuery.data ?? []} expenses={expensesQuery.data ?? []} procurements={procurementQuery.data ?? []} stats={itemStats} role={role} branchLabel={activeBranch?.name || ((itemsQuery.data?.[0] && branchName(itemsQuery.data[0].branchId)) || (role === 'branch_principal' ? 'Your branch' : 'All branches'))} onOpenTab={(nextTab) => { setTab(nextTab); setSearch(''); setError(''); setRecordPage(1); }} />}

      {tab === 'accounts' && <AccountsTab />}
      {tab === 'pos' && <POSTab />}

      {tab !== 'overview' && tab !== 'accounts' && tab !== 'pos' && (
        <div className="space-y-4">
          {tab === 'items' && <InventoryAssurance stats={itemStats} auditOnly={auditOnly} onAuditToggle={() => { setAuditOnly(current => !current); setItemPage(1); }} />}
          {tab === 'expenses' && <ModuleSummary title="Expense control" subtitle="Maker-checker expenditure workflow" icon={<ReceiptText className="w-5 h-5" />} values={[['Total value', formatCurrency((expensesQuery.data ?? []).reduce((sum, item) => sum + item.netPaid, 0))], ['Submitted', String((expensesQuery.data ?? []).filter(item => item.status === 'submitted').length)], ['Approved', String((expensesQuery.data ?? []).filter(item => item.status === 'approved').length)], ['Paid', String((expensesQuery.data ?? []).filter(item => item.status === 'paid').length)]]} />}
          {tab === 'income' && <ModuleSummary title="Income register" subtitle="Non-fee receipts and restricted funding" icon={<CircleDollarSign className="w-5 h-5" />} values={[['Total received', formatCurrency((incomeQuery.data ?? []).reduce((sum, item) => sum + item.amount, 0))], ['Receipts', String((incomeQuery.data ?? []).length)], ['Restricted', String((incomeQuery.data ?? []).filter(item => item.restrictedFund).length)], ['Payment methods', String(new Set((incomeQuery.data ?? []).map(item => item.paymentMethod)).size)]]} />}
          {tab === 'procurement' && <ModuleSummary title="Procurement pipeline" subtitle="Requests from draft through approval" icon={<ShoppingCart className="w-5 h-5" />} values={[['Estimated value', formatCurrency((procurementQuery.data ?? []).reduce((sum, item) => sum + item.estimatedTotal, 0))], ['Draft', String((procurementQuery.data ?? []).filter(item => item.status === 'draft').length)], ['Submitted', String((procurementQuery.data ?? []).filter(item => item.status === 'submitted').length)], ['Approved', String((procurementQuery.data ?? []).filter(item => item.status === 'approved').length)]]} />}
          {tab === 'vendors' && <ModuleSummary title="Vendor register" subtitle="Organization-wide supplier compliance" icon={<Truck className="w-5 h-5" />} values={[['Total vendors', String((vendorsQuery.data ?? []).length)], ['Active', String((vendorsQuery.data ?? []).filter(item => item.status === 'active').length)], ['Tax filers', String((vendorsQuery.data ?? []).filter(item => item.taxStatus === 'filer').length)], ['Restricted', String((vendorsQuery.data ?? []).filter(item => ['suspended', 'blacklisted'].includes(item.status)).length)]]} />}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-lg">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => { setSearch(e.target.value); setItemPage(1); setRecordPage(1); }} className="input pl-10" placeholder={`Search ${tabs.find(t => t.id === tab)?.label.toLowerCase()}…`} />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto">
              {tab === 'items' && <button onClick={() => setLocationOpen(true)} className={cn('btn-secondary shrink-0', (selectedCampus || selectedLocation) && 'border-blue-300 text-blue-700 dark:text-blue-300')}><FolderTree className="w-4 h-4" />Location{selectedLocation ? ` · ${selectedLocation}` : ''}</button>}
              {canCreate && <button onClick={openCreate} className="btn-primary shrink-0"><Plus className="w-4 h-4" />Add {{ items: 'item', expenses: 'expense', income: 'income', procurement: 'request', vendors: 'vendor', overview: 'record' }[tab]}</button>}
            </div>
          </div>

          {tab === 'items' && (selectedCampus || selectedLocation) && <LocationBreadcrumb campus={selectedCampus} location={selectedLocation} onClear={() => { setSelectedCampus(''); setSelectedLocation(''); setItemPage(1); }} />}

          {tab === 'items' && (itemsQuery.isLoading ? <LoadingState /> : filteredItems.length ? <ItemLedger items={filteredItems} page={itemPage} onPageChange={setItemPage} onTransaction={(item) => { setTransactionItem(item); setForm({ ...defaultForm(tab), transactionType: item.type === 'consumable' ? 'issue' : 'verification', quantity: item.type === 'consumable' ? '1' : '0' }); setError(''); }} /> : <EmptyState title={auditOnly ? 'No inventory alerts match these filters' : 'No assets or stock found'} />)}
          {tab === 'expenses' && (expensesQuery.isLoading ? <LoadingState /> : filteredExpenses.length ? <ExpenseLedger items={filteredExpenses} page={recordPage} onPageChange={setRecordPage} canApprove={canApprove} canPay={canPay} onAction={(id, action) => actionMutation.mutate({ kind: 'expense', id, action })} /> : <EmptyState title="No expenses found" />)}
          {tab === 'income' && (incomeQuery.isLoading ? <LoadingState /> : filteredIncome.length ? <IncomeLedger items={filteredIncome} page={recordPage} onPageChange={setRecordPage} /> : <EmptyState title="No income records found" />)}
          {tab === 'procurement' && (procurementQuery.isLoading ? <LoadingState /> : filteredProcurements.length ? <ProcurementLedger items={filteredProcurements} page={recordPage} onPageChange={setRecordPage} canApprove={canApprove} canSubmit={canSubmitProcurement} onAction={(id, action) => actionMutation.mutate({ kind: 'procurement', id, action })} /> : <EmptyState title="No procurement requests found" />)}
          {tab === 'vendors' && (vendorsQuery.isLoading ? <LoadingState /> : filteredVendors.length ? <VendorLedger items={filteredVendors} page={recordPage} onPageChange={setRecordPage} /> : <EmptyState title="No vendors found" />)}
        </div>
      )}

      <LocationTreeDrawer open={locationOpen} tree={locationTree} selectedCampus={selectedCampus} selectedLocation={selectedLocation} onClose={() => setLocationOpen(false)} onSelect={(campus, location) => { setSelectedCampus(campus); setSelectedLocation(location); setItemPage(1); setLocationOpen(false); }} onClear={() => { setSelectedCampus(''); setSelectedLocation(''); setItemPage(1); setLocationOpen(false); }} />

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

interface AssuranceStats {
  total: number;
  alerts: number;
  verified: number;
  verificationPct: number;
  overdue: number;
  maintenance: number;
  lowStock: number;
}

function InventoryAssurance({ stats, auditOnly, onAuditToggle }: { stats: AssuranceStats; auditOnly: boolean; onAuditToggle: () => void }) {
  return (
    <section className="card overflow-hidden">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4 p-4 sm:p-5">
        <div className="flex items-center gap-3 min-w-0 lg:w-72">
          <div className="relative w-14 h-14 rounded-full grid place-items-center shrink-0" style={{ background: `conic-gradient(#059669 ${stats.verificationPct}%, #e2e8f0 0)` }}>
            <div className="absolute inset-1.5 rounded-full bg-white dark:bg-slate-800" />
            <span className="relative text-xs font-extrabold text-gray-900 dark:text-white">{stats.verificationPct}%</span>
          </div>
          <div className="min-w-0"><p className="font-bold text-gray-900 dark:text-white">Inventory assurance</p><p className="text-xs text-gray-400 mt-0.5">{stats.verified} of {stats.total} records currently verified</p></div>
        </div>
        <div className="grid grid-cols-3 gap-2 flex-1">
          <AssuranceValue label="Overdue" value={stats.overdue} tone="text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-300" />
          <AssuranceValue label="Maintenance" value={stats.maintenance} tone="text-red-700 bg-red-50 dark:bg-red-900/20 dark:text-red-300" />
          <AssuranceValue label="Low stock" value={stats.lowStock} tone="text-violet-700 bg-violet-50 dark:bg-violet-900/20 dark:text-violet-300" />
        </div>
        <button onClick={onAuditToggle} className={cn('btn-secondary shrink-0', auditOnly && 'bg-amber-50 border-amber-300 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200')}>
          <AlertCircle className="w-4 h-4" />{auditOnly ? 'Exit audit mode' : `Audit mode · ${stats.alerts}`}
        </button>
      </div>
      {stats.alerts > 0 && !auditOnly && <div className="flex items-center gap-2 px-4 sm:px-5 py-2.5 border-t border-amber-100 bg-amber-50/70 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/15 dark:text-amber-200"><AlertCircle className="w-4 h-4 shrink-0" /><span><b>{stats.alerts} records require attention.</b> Use Audit mode to review only exceptions.</span></div>}
    </section>
  );
}

function AssuranceValue({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <div className={cn('rounded-xl px-3 py-2.5 min-w-0', tone)}><p className="text-[10px] font-semibold opacity-70 truncate">{label}</p><p className="text-lg font-extrabold">{value}</p></div>;
}

function LocationBreadcrumb({ campus, location, onClear }: { campus: string; location: string; onClear: () => void }) {
  return <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400 overflow-x-auto"><MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" /><span>All inventory</span><ChevronRight className="w-3 h-3 shrink-0" />{campus && <><span className="font-semibold text-gray-700 dark:text-slate-200 whitespace-nowrap">{campus}</span>{location && <ChevronRight className="w-3 h-3 shrink-0" />}</>}{location && <span className="font-semibold text-blue-700 dark:text-blue-300 whitespace-nowrap">{location}</span>}<button onClick={onClear} className="ml-2 text-blue-600 hover:underline whitespace-nowrap">Clear</button></div>;
}

const LEDGER_PAGE_SIZE = 50;
function ItemLedger({ items, page, onPageChange, onTransaction }: { items: InventoryItem[]; page: number; onPageChange: (page: number) => void; onTransaction: (item: InventoryItem) => void }) {
  const totalPages = Math.max(1, Math.ceil(items.length / LEDGER_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = items.slice((safePage - 1) * LEDGER_PAGE_SIZE, safePage * LEDGER_PAGE_SIZE);
  const start = (safePage - 1) * LEDGER_PAGE_SIZE + 1;
  const end = Math.min(safePage * LEDGER_PAGE_SIZE, items.length);
  return (
    <section className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between gap-3"><div><h2 className="font-bold text-gray-900 dark:text-white">Asset ledger</h2><p className="text-xs text-gray-400 mt-0.5">{items.length} matching records · room and campus aware</p></div><Badge variant="info">Ledger Pro</Badge></div>
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full min-w-[1050px] text-left">
          <thead className="bg-slate-50 dark:bg-slate-900/50 text-[10px] uppercase tracking-wide text-gray-400 dark:text-slate-500"><tr><th className="px-4 py-3">Asset</th><th className="px-3 py-3">Campus / location</th><th className="px-3 py-3">Available</th><th className="px-3 py-3">Condition</th><th className="px-3 py-3">Book cost</th><th className="px-3 py-3">Verification</th><th className="px-3 py-3">Status</th><th className="px-4 py-3 text-right">Action</th></tr></thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">{visible.map(item => <LedgerRow key={item._id} item={item} onTransaction={onTransaction} />)}</tbody>
        </table>
      </div>
      <div className="md:hidden divide-y divide-gray-100 dark:divide-slate-700">{visible.map(item => <MobileLedgerRow key={item._id} item={item} onTransaction={onTransaction} />)}</div>
      <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between gap-3 text-xs text-gray-400"><span>Showing {start}–{end} of {items.length}</span><div className="flex items-center gap-2"><button className="btn-secondary px-3 py-1.5" disabled={safePage === 1} onClick={() => onPageChange(safePage - 1)}>Previous</button><span className="hidden sm:inline">Page {safePage} of {totalPages}</span><button className="btn-secondary px-3 py-1.5" disabled={safePage === totalPages} onClick={() => onPageChange(safePage + 1)}>Next</button></div></div>
    </section>
  );
}

function LedgerRow({ item, onTransaction }: { item: InventoryItem; onTransaction: (item: InventoryItem) => void }) {
  const alert = inventoryAlertReason(item);
  return <tr className="hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-colors"><td className="px-4 py-3"><div className="flex items-center gap-3 min-w-64"><div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 grid place-items-center shrink-0">{item.type === 'fixed_asset' ? <Building2 className="w-4.5 h-4.5" /> : <Package className="w-4.5 h-4.5" />}</div><div className="min-w-0"><p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{item.name}</p><p className="font-mono text-[10px] text-gray-400 mt-0.5">{item.assetCode}</p></div></div></td><td className="px-3 py-3"><p className="text-xs font-semibold text-gray-700 dark:text-slate-200">{item.location || 'Unassigned'}</p><p className="text-[10px] text-gray-400 mt-0.5">{branchName(item.branchId) || item.department || 'Current campus'}</p></td><td className="px-3 py-3"><p className="text-xs font-bold text-gray-800 dark:text-slate-200">{item.availableQuantity} / {item.quantity}</p><div className="w-16 h-1 bg-gray-100 dark:bg-slate-700 rounded-full mt-1.5 overflow-hidden"><div className={cn('h-full rounded-full', item.availableQuantity < item.quantity ? 'bg-amber-500' : 'bg-emerald-500')} style={{ width: `${item.quantity ? Math.min(100, item.availableQuantity / item.quantity * 100) : 0}%` }} /></div></td><td className="px-3 py-3"><Badge variant={statusVariant(item.condition)} dot>{item.condition}</Badge></td><td className="px-3 py-3 text-xs font-semibold text-gray-700 dark:text-slate-200">{formatCurrency(item.unitCost * item.quantity)}</td><td className="px-3 py-3">{isVerified(item) ? <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400"><ShieldCheck className="w-4 h-4" /><span>{formatDate(item.lastVerifiedAt!)}</span></div> : <Badge variant="amber">{alert === 'Verification overdue' ? 'Overdue' : 'Not verified'}</Badge>}</td><td className="px-3 py-3">{alert ? <Badge variant={alert === 'Maintenance' || alert === 'Lost asset' ? 'danger' : 'amber'}>{alert}</Badge> : <Badge variant={statusVariant(item.status)}>{item.status.replaceAll('_', ' ')}</Badge>}</td><td className="px-4 py-3 text-right"><button onClick={() => onTransaction(item)} className="btn-secondary px-3 py-1.5 text-xs"><RefreshCw className="w-3.5 h-3.5" />Transact</button></td></tr>;
}

function MobileLedgerRow({ item, onTransaction }: { item: InventoryItem; onTransaction: (item: InventoryItem) => void }) {
  const alert = inventoryAlertReason(item);
  return <article className="p-4"><div className="flex gap-3"><div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 grid place-items-center shrink-0">{item.type === 'fixed_asset' ? <Building2 className="w-5 h-5" /> : <Package className="w-5 h-5" />}</div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><h3 className="font-semibold text-sm text-gray-900 dark:text-white truncate">{item.name}</h3><p className="font-mono text-[10px] text-gray-400 mt-0.5">{item.assetCode}</p></div>{alert ? <Badge variant="amber">{alert}</Badge> : <Badge variant={statusVariant(item.status)}>{item.status.replaceAll('_', ' ')}</Badge>}</div><div className="flex items-center gap-1 text-xs text-gray-500 mt-2"><MapPin className="w-3 h-3" /><span className="truncate">{branchName(item.branchId) ? `${branchName(item.branchId)} · ` : ''}{item.location || 'Unassigned'}</span></div><div className="grid grid-cols-3 gap-2 mt-3 text-xs"><div><p className="text-[9px] uppercase text-gray-400">Available</p><b>{item.availableQuantity}/{item.quantity}</b></div><div><p className="text-[9px] uppercase text-gray-400">Condition</p><b className="capitalize">{item.condition}</b></div><div><p className="text-[9px] uppercase text-gray-400">Value</p><b>{formatCurrency(item.unitCost * item.quantity)}</b></div></div><button onClick={() => onTransaction(item)} className="btn-secondary w-full py-2 mt-3 text-xs"><RefreshCw className="w-3.5 h-3.5" />Transaction / verify</button></div></div></article>;
}

interface LocationTreeEntry { campus: string; locations: [string, number][] }
function LocationTreeDrawer({ open, tree, selectedCampus, selectedLocation, onClose, onSelect, onClear }: { open: boolean; tree: LocationTreeEntry[]; selectedCampus: string; selectedLocation: string; onClose: () => void; onSelect: (campus: string, location: string) => void; onClear: () => void }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Filter inventory by location"><button className="absolute inset-0 bg-black/45 backdrop-blur-[1px] w-full" onClick={onClose} aria-label="Close location filter" /><aside className="absolute inset-y-0 left-0 w-[min(90vw,360px)] bg-white dark:bg-slate-900 shadow-2xl flex flex-col"><div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex items-start justify-between"><div><h2 className="font-bold text-gray-900 dark:text-white">Inventory locations</h2><p className="text-xs text-gray-400 mt-0.5">Campus → room or facility</p></div><button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800"><X className="w-4 h-4" /></button></div><div className="p-3 overflow-y-auto flex-1"><button onClick={onClear} className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold', !selectedCampus && 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300')}><FolderTree className="w-4 h-4" />All inventory</button>{tree.map(entry => <div key={entry.campus} className="mt-2"><button onClick={() => onSelect(entry.campus, '')} className={cn('w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-left hover:bg-gray-50 dark:hover:bg-slate-800', selectedCampus === entry.campus && !selectedLocation && 'bg-blue-50 dark:bg-blue-900/30')}><ChevronRight className="w-4 h-4 text-gray-400" /><span className="flex-1 text-sm font-semibold text-gray-800 dark:text-slate-200">{entry.campus}</span><Badge>{entry.locations.reduce((sum, [, count]) => sum + count, 0)}</Badge></button><div className="ml-5 pl-3 border-l border-gray-100 dark:border-slate-700 space-y-0.5">{entry.locations.map(([location, count]) => <button key={location} onClick={() => onSelect(entry.campus, location)} className={cn('w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800', selectedCampus === entry.campus && selectedLocation === location && 'bg-blue-50 text-blue-700 font-semibold dark:bg-blue-900/30 dark:text-blue-300')}><MapPin className="w-3.5 h-3.5 shrink-0" /><span className="flex-1 truncate">{location}</span><span className="text-[10px]">{count}</span></button>)}</div></div>)}</div><div className="p-4 border-t border-gray-100 dark:border-slate-700"><button onClick={onClear} className="btn-secondary w-full">Clear location filter</button></div></aside></div>;
}

function ModuleSummary({ title, subtitle, icon, values }: { title: string; subtitle: string; icon: React.ReactNode; values: [string, string][] }) {
  return <section className="card p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center gap-4"><div className="flex items-center gap-3 lg:w-72 shrink-0"><span className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 grid place-items-center">{icon}</span><div><h2 className="font-bold text-gray-900 dark:text-white">{title}</h2><p className="text-xs text-gray-400 mt-0.5">{subtitle}</p></div></div><div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1">{values.map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 dark:bg-slate-700/40 px-3 py-2.5 min-w-0"><p className="text-[10px] text-gray-400 truncate">{label}</p><p className="text-sm font-extrabold text-gray-900 dark:text-white mt-0.5 truncate">{value}</p></div>)}</div></section>;
}

const RECORD_PAGE_SIZE = 25;
function paged<T>(items: T[], page: number) {
  const pages = Math.max(1, Math.ceil(items.length / RECORD_PAGE_SIZE));
  const safePage = Math.min(page, pages);
  return { visible: items.slice((safePage - 1) * RECORD_PAGE_SIZE, safePage * RECORD_PAGE_SIZE), pages, safePage };
}

function LedgerFooter({ total, page, pages, onPageChange }: { total: number; page: number; pages: number; onPageChange: (page: number) => void }) {
  const start = (page - 1) * RECORD_PAGE_SIZE + 1;
  const end = Math.min(page * RECORD_PAGE_SIZE, total);
  return <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between gap-3 text-xs text-gray-400"><span>Showing {start}–{end} of {total}</span><div className="flex items-center gap-2"><button className="btn-secondary px-3 py-1.5" disabled={page === 1} onClick={() => onPageChange(page - 1)}>Previous</button><span className="hidden sm:inline">Page {page} of {pages}</span><button className="btn-secondary px-3 py-1.5" disabled={page === pages} onClick={() => onPageChange(page + 1)}>Next</button></div></div>;
}

function ExpenseActions({ item, canApprove, canPay, onAction }: { item: Expense; canApprove: boolean; canPay: boolean; onAction: (id: string, action: string) => void }) {
  return <div className="flex gap-1.5 flex-wrap justify-end">{canApprove && item.status === 'submitted' && <><button className="btn-secondary py-1.5 px-2.5 text-xs text-emerald-600" onClick={() => onAction(item._id, 'approve')}><Check className="w-3.5 h-3.5" />Approve</button><button className="btn-secondary py-1.5 px-2.5 text-xs text-red-600" onClick={() => onAction(item._id, 'reject')}><X className="w-3.5 h-3.5" />Reject</button></>}{canPay && item.status === 'approved' && <button className="btn-primary py-1.5 px-2.5 text-xs" onClick={() => onAction(item._id, 'pay')}><Banknote className="w-3.5 h-3.5" />Mark paid</button>}</div>;
}

function ExpenseLedger({ items, page, onPageChange, canApprove, canPay, onAction }: { items: Expense[]; page: number; onPageChange: (page: number) => void; canApprove: boolean; canPay: boolean; onAction: (id: string, action: string) => void }) {
  const view = paged(items, page);
  return <section className="card overflow-hidden"><LedgerHeader title="Expense ledger" count={items.length} subtitle="Voucher, approval and payment status" /><div className="hidden md:block overflow-x-auto"><table className="w-full min-w-[1000px] text-left"><LedgerHead columns={['Voucher / description', 'Campus', 'Category', 'Expense date', 'Net amount', 'Status', 'Action']} /><tbody className="divide-y divide-gray-100 dark:divide-slate-700">{view.visible.map(item => <tr key={item._id} className="hover:bg-blue-50/40 dark:hover:bg-blue-900/10"><td className="px-4 py-3"><p className="font-semibold text-sm text-gray-900 dark:text-white">{item.description}</p><p className="font-mono text-[10px] text-gray-400 mt-0.5">{item.voucherNo}</p></td><td className="px-3 py-3 text-xs text-gray-500">{branchName(item.branchId) || 'Current campus'}</td><td className="px-3 py-3 text-xs text-gray-600 dark:text-slate-300">{item.category}</td><td className="px-3 py-3 text-xs text-gray-500">{formatDate(item.expenseDate)}</td><td className="px-3 py-3 text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(item.netPaid)}</td><td className="px-3 py-3"><Badge variant={statusVariant(item.status)} dot>{item.status}</Badge></td><td className="px-4 py-3"><ExpenseActions item={item} canApprove={canApprove} canPay={canPay} onAction={onAction} /></td></tr>)}</tbody></table></div><div className="md:hidden divide-y divide-gray-100 dark:divide-slate-700">{view.visible.map(item => <article key={item._id} className="p-4"><div className="flex items-start justify-between gap-2"><div><p className="font-semibold text-sm text-gray-900 dark:text-white">{item.description}</p><p className="font-mono text-[10px] text-gray-400 mt-0.5">{item.voucherNo}</p></div><Badge variant={statusVariant(item.status)}>{item.status}</Badge></div><p className="text-xl font-extrabold mt-3">{formatCurrency(item.netPaid)}</p><p className="text-xs text-gray-400 mt-1">{item.category} · {formatDate(item.expenseDate)} · {branchName(item.branchId) || 'Current campus'}</p><div className="mt-3"><ExpenseActions item={item} canApprove={canApprove} canPay={canPay} onAction={onAction} /></div></article>)}</div><LedgerFooter total={items.length} page={view.safePage} pages={view.pages} onPageChange={onPageChange} /></section>;
}

function IncomeLedger({ items, page, onPageChange }: { items: IncomeEntry[]; page: number; onPageChange: (page: number) => void }) {
  const view = paged(items, page);
  return <section className="card overflow-hidden"><LedgerHeader title="Income register" count={items.length} subtitle="Non-fee receipts and funding sources" /><div className="hidden md:block overflow-x-auto"><table className="w-full min-w-[950px] text-left"><LedgerHead columns={['Receipt / description', 'Campus', 'Category', 'Received', 'Payer / method', 'Amount', 'Status']} /><tbody className="divide-y divide-gray-100 dark:divide-slate-700">{view.visible.map(item => <tr key={item._id} className="hover:bg-emerald-50/40 dark:hover:bg-emerald-900/10"><td className="px-4 py-3"><p className="font-semibold text-sm text-gray-900 dark:text-white">{item.description}</p><p className="font-mono text-[10px] text-gray-400 mt-0.5">{item.receiptNo}</p></td><td className="px-3 py-3 text-xs text-gray-500">{branchName(item.branchId) || 'Current campus'}</td><td className="px-3 py-3 text-xs text-gray-600 dark:text-slate-300">{item.category}</td><td className="px-3 py-3 text-xs text-gray-500">{formatDate(item.receivedAt)}</td><td className="px-3 py-3"><p className="text-xs font-semibold text-gray-700 dark:text-slate-200">{item.payerName || 'Institution receipt'}</p><p className="text-[10px] text-gray-400 mt-0.5 capitalize">{item.paymentMethod.replaceAll('_', ' ')}</p></td><td className="px-3 py-3 text-sm font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(item.amount)}</td><td className="px-4 py-3"><div className="flex gap-1.5"><Badge variant="success">{item.status}</Badge>{item.restrictedFund && <Badge variant="purple">Restricted</Badge>}</div></td></tr>)}</tbody></table></div><div className="md:hidden divide-y divide-gray-100 dark:divide-slate-700">{view.visible.map(item => <article key={item._id} className="p-4"><div className="flex justify-between gap-2"><div><p className="font-semibold text-sm text-gray-900 dark:text-white">{item.description}</p><p className="font-mono text-[10px] text-gray-400 mt-0.5">{item.receiptNo}</p></div><Badge variant="success">{item.status}</Badge></div><p className="text-xl font-extrabold text-emerald-700 mt-3">{formatCurrency(item.amount)}</p><p className="text-xs text-gray-400 mt-1">{item.category} · {formatDate(item.receivedAt)} · {branchName(item.branchId) || 'Current campus'}</p><div className="flex gap-1.5 mt-3"><Badge>{item.paymentMethod.replaceAll('_', ' ')}</Badge>{item.restrictedFund && <Badge variant="purple">Restricted fund</Badge>}</div></article>)}</div><LedgerFooter total={items.length} page={view.safePage} pages={view.pages} onPageChange={onPageChange} /></section>;
}

function ProcurementActions({ item, canApprove, canSubmit, onAction }: { item: ProcurementRequest; canApprove: boolean; canSubmit: boolean; onAction: (id: string, action: string) => void }) {
  return <div className="flex gap-1.5 flex-wrap justify-end">{canSubmit && item.status === 'draft' && <button className="btn-secondary py-1.5 px-2.5 text-xs" onClick={() => onAction(item._id, 'submit')}><ArrowUpRight className="w-3.5 h-3.5" />Submit</button>}{canApprove && item.status === 'submitted' && <><button className="btn-secondary py-1.5 px-2.5 text-xs text-emerald-600" onClick={() => onAction(item._id, 'approve')}><Check className="w-3.5 h-3.5" />Approve</button><button className="btn-secondary py-1.5 px-2.5 text-xs text-red-600" onClick={() => onAction(item._id, 'reject')}><X className="w-3.5 h-3.5" />Reject</button></>}</div>;
}

function ProcurementLedger({ items, page, onPageChange, canApprove, canSubmit, onAction }: { items: ProcurementRequest[]; page: number; onPageChange: (page: number) => void; canApprove: boolean; canSubmit: boolean; onAction: (id: string, action: string) => void }) {
  const view = paged(items, page);
  return <section className="card overflow-hidden"><LedgerHeader title="Procurement register" count={items.length} subtitle="Requests, methods and approval workflow" /><div className="hidden md:block overflow-x-auto"><table className="w-full min-w-[1050px] text-left"><LedgerHead columns={['Request', 'Campus / department', 'Method', 'Line items', 'Estimated total', 'Status', 'Action']} /><tbody className="divide-y divide-gray-100 dark:divide-slate-700">{view.visible.map(item => <tr key={item._id} className="hover:bg-violet-50/40 dark:hover:bg-violet-900/10"><td className="px-4 py-3"><p className="font-semibold text-sm text-gray-900 dark:text-white">{item.title}</p><p className="font-mono text-[10px] text-gray-400 mt-0.5">{item.requestNo}</p></td><td className="px-3 py-3"><p className="text-xs text-gray-600 dark:text-slate-300">{branchName(item.branchId) || 'Current campus'}</p><p className="text-[10px] text-gray-400 mt-0.5">{item.department || 'No department'}</p></td><td className="px-3 py-3 text-xs capitalize text-gray-500">{item.procurementMethod.replaceAll('_', ' ')}</td><td className="px-3 py-3 text-xs text-gray-500">{item.items.length} item(s)</td><td className="px-3 py-3 text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(item.estimatedTotal)}</td><td className="px-3 py-3"><Badge variant={statusVariant(item.status)} dot>{item.status.replaceAll('_', ' ')}</Badge></td><td className="px-4 py-3"><ProcurementActions item={item} canApprove={canApprove} canSubmit={canSubmit} onAction={onAction} /></td></tr>)}</tbody></table></div><div className="md:hidden divide-y divide-gray-100 dark:divide-slate-700">{view.visible.map(item => <article key={item._id} className="p-4"><div className="flex justify-between gap-2"><div><p className="font-semibold text-sm text-gray-900 dark:text-white">{item.title}</p><p className="font-mono text-[10px] text-gray-400 mt-0.5">{item.requestNo}</p></div><Badge variant={statusVariant(item.status)}>{item.status.replaceAll('_', ' ')}</Badge></div><p className="text-xl font-extrabold mt-3">{formatCurrency(item.estimatedTotal)}</p><p className="text-xs text-gray-400 mt-1">{item.procurementMethod.replaceAll('_', ' ')} · {item.items.length} item(s) · {branchName(item.branchId) || 'Current campus'}</p><div className="mt-3"><ProcurementActions item={item} canApprove={canApprove} canSubmit={canSubmit} onAction={onAction} /></div></article>)}</div><LedgerFooter total={items.length} page={view.safePage} pages={view.pages} onPageChange={onPageChange} /></section>;
}

function VendorLedger({ items, page, onPageChange }: { items: Vendor[]; page: number; onPageChange: (page: number) => void }) {
  const view = paged(items, page);
  return <section className="card overflow-hidden"><LedgerHeader title="Vendor register" count={items.length} subtitle="Contacts and Pakistani tax compliance" /><div className="hidden md:block overflow-x-auto"><table className="w-full min-w-[850px] text-left"><LedgerHead columns={['Vendor', 'Contact person', 'Contact', 'NTN / STRN', 'Tax status', 'Account status']} /><tbody className="divide-y divide-gray-100 dark:divide-slate-700">{view.visible.map(item => <tr key={item._id} className="hover:bg-amber-50/40 dark:hover:bg-amber-900/10"><td className="px-4 py-3"><div className="flex items-center gap-3"><span className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-900/30 grid place-items-center"><Truck className="w-4 h-4" /></span><p className="font-semibold text-sm text-gray-900 dark:text-white">{item.name}</p></div></td><td className="px-3 py-3 text-xs text-gray-600 dark:text-slate-300">{item.contactPerson || '—'}</td><td className="px-3 py-3"><p className="text-xs text-gray-600 dark:text-slate-300">{item.phone || '—'}</p><p className="text-[10px] text-gray-400 mt-0.5">{item.email || 'No email'}</p></td><td className="px-3 py-3"><p className="font-mono text-xs text-gray-600 dark:text-slate-300">{item.ntn || '—'}</p><p className="font-mono text-[10px] text-gray-400 mt-0.5">{item.strn || 'No STRN'}</p></td><td className="px-3 py-3"><Badge variant={item.taxStatus === 'filer' ? 'success' : item.taxStatus === 'non_filer' ? 'warning' : 'default'}>{item.taxStatus.replaceAll('_', ' ')}</Badge></td><td className="px-4 py-3"><Badge variant={statusVariant(item.status)} dot>{item.status}</Badge></td></tr>)}</tbody></table></div><div className="md:hidden divide-y divide-gray-100 dark:divide-slate-700">{view.visible.map(item => <article key={item._id} className="p-4"><div className="flex items-start justify-between gap-2"><div className="flex items-center gap-3"><span className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 grid place-items-center"><Truck className="w-4 h-4" /></span><div><p className="font-semibold text-sm text-gray-900 dark:text-white">{item.name}</p><p className="text-xs text-gray-400 mt-0.5">{item.contactPerson || 'No contact person'}</p></div></div><Badge variant={statusVariant(item.status)}>{item.status}</Badge></div><div className="grid grid-cols-2 gap-2 mt-3 text-xs"><div><p className="text-[9px] uppercase text-gray-400">Phone</p><b>{item.phone || '—'}</b></div><div><p className="text-[9px] uppercase text-gray-400">NTN</p><b>{item.ntn || '—'}</b></div></div><div className="mt-3"><Badge variant={item.taxStatus === 'filer' ? 'success' : 'warning'}>{item.taxStatus.replaceAll('_', ' ')}</Badge></div></article>)}</div><LedgerFooter total={items.length} page={view.safePage} pages={view.pages} onPageChange={onPageChange} /></section>;
}

function LedgerHeader({ title, subtitle, count }: { title: string; subtitle: string; count: number }) {
  return <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between gap-3"><div><h2 className="font-bold text-gray-900 dark:text-white">{title}</h2><p className="text-xs text-gray-400 mt-0.5">{subtitle}</p></div><Badge variant="info">{count} records</Badge></div>;
}

function LedgerHead({ columns }: { columns: string[] }) {
  return <thead className="bg-slate-50 dark:bg-slate-900/50 text-[10px] uppercase tracking-wide text-gray-400 dark:text-slate-500"><tr>{columns.map((column, index) => <th key={column} className={cn('py-3', index === 0 ? 'px-4' : index === columns.length - 1 ? 'px-4' : 'px-3')}>{column}</th>)}</tr></thead>;
}
