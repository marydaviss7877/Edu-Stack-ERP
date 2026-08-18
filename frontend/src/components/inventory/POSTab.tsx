import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { posService } from '../../services/posService';
import type { SellableProduct } from '../../services/posService';
import { inventoryService } from '../../services/inventoryService';
import type { InventoryItem } from '../../services/inventoryService';
import Modal from '../ui/Modal';
import Badge from '../ui/Badge';
import { cn, formatCurrency, formatDate } from '../../lib/utils';

type SubTab = 'checkout' | 'sales' | 'products';

function pill(active: boolean) {
  return cn('px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors', active ? 'bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 shadow-sm' : 'text-gray-500 dark:text-slate-400');
}

const PAYMENT_METHODS = ['cash', 'bank_transfer', 'jazzcash', 'easypaisa', 'cheque', 'other'];

interface CartLine { itemId: string; name: string; unitPrice: number; qty: number; maxQty: number }

export default function POSTab() {
  const [sub, setSub] = useState<SubTab>('checkout');
  const qc = useQueryClient();

  const { data: products = [] } = useQuery({ queryKey: ['pos-products'], queryFn: posService.products });
  const { data: sales = [] } = useQuery({ queryKey: ['pos-sales'], queryFn: () => posService.sales(), enabled: sub === 'sales' });
  const { data: summary } = useQuery({ queryKey: ['pos-summary'], queryFn: () => posService.summary() });

  const [cart, setCart] = useState<CartLine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [customerName, setCustomerName] = useState('');
  const [search, setSearch] = useState('');
  const [receiptSale, setReceiptSale] = useState<{ saleNo: string; total: number } | null>(null);

  const checkout = useMutation({
    mutationFn: () => posService.checkout({
      items: cart.map((c) => ({ itemId: c.itemId, qty: c.qty })),
      paymentMethod, customerName: customerName.trim() || undefined,
    }),
    onSuccess: (data) => {
      setCart([]); setCustomerName('');
      setReceiptSale({ saleNo: data.sale.saleNo, total: data.sale.total });
      qc.invalidateQueries({ queryKey: ['pos-products'] });
      qc.invalidateQueries({ queryKey: ['pos-sales'] });
      qc.invalidateQueries({ queryKey: ['pos-summary'] });
      qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0] ?? '').startsWith('inventory') });
    },
  });

  const voidMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => posService.voidSale(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pos-sales'] });
      qc.invalidateQueries({ queryKey: ['pos-products'] });
      qc.invalidateQueries({ queryKey: ['pos-summary'] });
    },
  });

  const filteredProducts = useMemo(
    () => products.filter((p) => !search || `${p.name} ${p.category}`.toLowerCase().includes(search.toLowerCase())),
    [products, search]
  );

  const total = cart.reduce((s, l) => s + l.unitPrice * l.qty, 0);

  function addToCart(p: SellableProduct) {
    setCart((c) => {
      const existing = c.find((l) => l.itemId === p._id);
      if (existing) {
        if (existing.qty >= existing.maxQty) return c;
        return c.map((l) => (l.itemId === p._id ? { ...l, qty: l.qty + 1 } : l));
      }
      if (p.availableQuantity <= 0) return c;
      return [...c, { itemId: p._id, name: p.name, unitPrice: p.salePrice, qty: 1, maxQty: p.availableQuantity }];
    });
  }

  function changeQty(itemId: string, delta: number) {
    setCart((c) => c
      .map((l) => (l.itemId === itemId ? { ...l, qty: Math.min(l.maxQty, Math.max(0, l.qty + delta)) } : l))
      .filter((l) => l.qty > 0));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 bg-gray-100 dark:bg-slate-700 p-1 rounded-lg w-fit">
          <button onClick={() => setSub('checkout')} className={pill(sub === 'checkout')}>Checkout</button>
          <button onClick={() => setSub('sales')} className={pill(sub === 'sales')}>Sales Log</button>
          <button onClick={() => setSub('products')} className={pill(sub === 'products')}>Products</button>
        </div>
        {summary && (
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-500 dark:text-slate-400">Today: <b className="text-gray-900 dark:text-white">{formatCurrency(summary.totalRevenue)}</b></span>
            <Badge variant="info">{summary.saleCount} sales</Badge>
          </div>
        )}
      </div>

      {sub === 'checkout' && (
        <div className="grid lg:grid-cols-[1fr_360px] gap-4">
          <div className="space-y-3">
            <input className="input" placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredProducts.map((p) => (
                <button
                  key={p._id}
                  onClick={() => addToCart(p)}
                  disabled={p.availableQuantity <= 0}
                  className="card p-3 text-left hover:border-blue-300 dark:hover:border-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 truncate">{p.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{p.category}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm font-bold text-blue-600">{formatCurrency(p.salePrice)}</span>
                    <span className="text-[10px] text-gray-400">{p.availableQuantity} {p.unit}</span>
                  </div>
                </button>
              ))}
              {filteredProducts.length === 0 && (
                <div className="col-span-full text-center py-10 text-sm text-gray-400 dark:text-slate-500">
                  No sellable products yet. Mark items as sellable in the Products tab.
                </div>
              )}
            </div>
          </div>

          <div className="card p-4 flex flex-col h-fit sticky top-4">
            <h3 className="font-bold text-gray-900 dark:text-white mb-3">Cart</h3>
            <div className="flex-1 space-y-2 min-h-16">
              {cart.map((l) => (
                <div key={l.itemId} className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-800 dark:text-slate-200 truncate">{l.name}</p>
                    <p className="text-xs text-gray-400">{formatCurrency(l.unitPrice)} × {l.qty}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => changeQty(l.itemId, -1)} className="w-6 h-6 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-500">−</button>
                    <span className="text-sm w-5 text-center">{l.qty}</span>
                    <button onClick={() => changeQty(l.itemId, 1)} disabled={l.qty >= l.maxQty} className="w-6 h-6 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-500 disabled:opacity-30">+</button>
                  </div>
                </div>
              ))}
              {cart.length === 0 && <p className="text-sm text-gray-400 text-center py-6">Cart is empty</p>}
            </div>

            <div className="border-t border-gray-100 dark:border-slate-700 mt-3 pt-3 space-y-3">
              <div>
                <label className="label">Payment Method</label>
                <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Customer (optional)</label>
                <input className="input" placeholder="e.g. Student name / roll no" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              </div>
              <div className="flex items-center justify-between font-bold text-lg">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
              <button
                onClick={() => checkout.mutate()}
                disabled={cart.length === 0 || checkout.isPending}
                className="btn-primary w-full"
              >
                {checkout.isPending ? 'Processing…' : 'Complete Sale'}
              </button>
            </div>
          </div>
        </div>
      )}

      {sub === 'sales' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700">
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Sale No.</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Items</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Method</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Total</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {sales.map((s) => (
                <tr key={s._id}>
                  <td className="px-4 py-2.5">
                    <p className="font-mono text-xs text-gray-600 dark:text-slate-300">{s.saleNo}</p>
                    <p className="text-[10px] text-gray-400">{formatDate(s.soldAt)}</p>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-slate-400">{s.items.map((i) => `${i.name} ×${i.qty}`).join(', ')}</td>
                  <td className="px-4 py-2.5 text-xs capitalize text-gray-600 dark:text-slate-300">{s.paymentMethod.replace('_', ' ')}</td>
                  <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{formatCurrency(s.total)}</td>
                  <td className="px-4 py-2.5"><Badge variant={s.status === 'completed' ? 'success' : 'danger'}>{s.status}</Badge></td>
                  <td className="px-4 py-2.5 text-right">
                    {s.status === 'completed' && (
                      <button
                        onClick={() => { const reason = prompt('Reason for voiding this sale?'); if (reason) voidMutation.mutate({ id: s._id, reason }); }}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Void
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {sales.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 dark:text-slate-500">No sales recorded yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {sub === 'products' && <ProductManager />}

      <Modal open={!!receiptSale} onClose={() => setReceiptSale(null)} title="Sale Complete" size="sm">
        {receiptSale && (
          <div className="text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center mx-auto">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <p className="font-mono text-sm text-gray-500">{receiptSale.saleNo}</p>
            <p className="text-2xl font-extrabold text-gray-900 dark:text-white">{formatCurrency(receiptSale.total)}</p>
            <button onClick={() => setReceiptSale(null)} className="btn-primary w-full">Done</button>
          </div>
        )}
      </Modal>
    </div>
  );
}

function ProductManager() {
  const qc = useQueryClient();
  const { data: items = [] } = useQuery({ queryKey: ['inventory-items', 'all'], queryFn: () => inventoryService.items({ limit: '2000' }) });
  const consumables = items.filter((i) => i.type === 'consumable');

  const updateItem = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InventoryItem> }) => inventoryService.updateItem(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0] ?? '').startsWith('inventory') });
      qc.invalidateQueries({ queryKey: ['pos-products'] });
    },
  });

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700">
        <h3 className="font-bold text-sm text-gray-900 dark:text-white">Mark items sellable for POS</h3>
        <p className="text-xs text-gray-400 mt-0.5">Toggle any consumable stock item and set its retail price to make it appear at checkout.</p>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-slate-700">
        {consumables.map((item) => (
          <div key={item._id} className="flex items-center gap-3 px-4 py-2.5">
            <label className="flex items-center gap-2 flex-1 min-w-0">
              <input
                type="checkbox"
                checked={!!item.isSellable}
                onChange={(e) => updateItem.mutate({ id: item._id, data: { isSellable: e.target.checked } })}
              />
              <span className="text-sm text-gray-800 dark:text-slate-200 truncate">{item.name}</span>
              <span className="text-xs text-gray-400 shrink-0">({item.availableQuantity} in stock)</span>
            </label>
            <input
              type="number"
              min={0}
              className="input w-28 shrink-0"
              placeholder="Sale price"
              defaultValue={item.salePrice || ''}
              onBlur={(e) => updateItem.mutate({ id: item._id, data: { salePrice: Number(e.target.value) || 0 } })}
            />
          </div>
        ))}
        {consumables.length === 0 && <div className="px-4 py-8 text-center text-sm text-gray-400 dark:text-slate-500">No consumable stock items yet. Add some in the Assets &amp; Stock tab.</div>}
      </div>
    </div>
  );
}
