import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import type { FinanceSummary, InventoryDashboard } from '../../services/inventoryService';

interface Props {
  finance?: FinanceSummary;
  inventory?: InventoryDashboard;
  href: string;
  scopeLabel: string;
}

export default function FinanceSnapshot({ finance, inventory, href, scopeLabel }: Props) {
  if (!finance || !inventory) {
    return <div className="card h-44 mb-6 animate-pulse bg-slate-100 dark:bg-slate-800" />;
  }

  const positive = finance.operatingSurplus >= 0;
  const metrics = [
    ['Total income', finance.totalRevenue],
    ['Paid expenses', finance.operatingExpenses],
    ['Payroll', finance.payroll],
    ['Asset book value', inventory.netBookValue],
  ] as const;

  return (
    <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-navy-950 via-blue-950 to-blue-700 text-white p-5 sm:p-6 mb-6 shadow-xl">
      <div className="absolute -right-16 -top-20 w-56 h-56 rounded-full bg-blue-400/20 blur-2xl" />
      <div className="relative grid lg:grid-cols-[1.05fr_1.65fr] gap-5 lg:items-end">
        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] uppercase tracking-[0.16em] font-semibold text-blue-200">{scopeLabel} · {finance.month}</p>
            <Link to={href} className="text-xs font-semibold text-blue-100 hover:text-white">Open finance →</Link>
          </div>
          <p className="text-sm text-white/60 mt-4">{positive ? 'Operating surplus' : 'Operating deficit'}</p>
          <div className="flex items-center gap-2 mt-1">
            {positive ? <ArrowUpRight className="w-6 h-6 text-emerald-300" /> : <ArrowDownRight className="w-6 h-6 text-red-300" />}
            <p className="text-3xl sm:text-4xl font-extrabold tracking-tight">{formatCurrency(Math.abs(finance.operatingSurplus))}</p>
          </div>
          <p className="text-xs text-blue-100 mt-2">{finance.operatingMargin.toFixed(1)}% margin after paid expenses, payroll and depreciation</p>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {metrics.map(([label, value]) => (
            <div key={label} className="min-w-0 rounded-2xl border border-white/10 bg-white/10 px-3 py-3 backdrop-blur-sm">
              <p className="text-[10px] uppercase tracking-wide text-white/55 truncate">{label}</p>
              <p className="text-sm sm:text-base font-bold mt-1 truncate">{formatCurrency(value)}</p>
            </div>
          ))}
        </div>
      </div>
      {(inventory.pendingExpenses + inventory.pendingProcurements > 0 || inventory.lowStock > 0) && (
        <div className="relative flex flex-wrap gap-x-5 gap-y-1 mt-4 pt-3 border-t border-white/10 text-xs text-blue-100">
          <span>{inventory.pendingExpenses + inventory.pendingProcurements} approvals waiting</span>
          <span>{inventory.lowStock} low-stock items</span>
          <span>{inventory.verificationOverdue} asset verifications overdue</span>
        </div>
      )}
    </section>
  );
}
