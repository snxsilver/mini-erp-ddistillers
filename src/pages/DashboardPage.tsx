import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { selectCan } from '../features/auth/authSelectors';
import { selectDashboardMetrics, selectLowStockProducts, selectRecentMovements } from '../features/inventory/inventorySelectors';
import { resetDemoData } from '../features/inventory/inventorySlice';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { StateMessage, StockBadge, TypeBadge, btnSecondary } from '../components/ui/common';
import { useToast } from '../components/ui/Toast';
import { formatDateTime, formatIdr, formatNumber } from '../utils/formatters';

export default function DashboardPage() {
  const dispatch = useAppDispatch();
  const toast = useToast();
  const m = useAppSelector(selectDashboardMetrics);
  const low = useAppSelector(selectLowStockProducts);
  const recent = useAppSelector(selectRecentMovements);
  const canReset = useAppSelector(selectCan('inventory:reset'));
  const [confirming, setConfirming] = useState(false);

  const cards = [
    ['Total SKUs', formatNumber(m.totalSkus)],
    ['Units in stock', formatNumber(m.totalUnits)],
    ['Low-stock products', formatNumber(m.lowStockCount)],
    ['Inventory value', formatIdr(m.inventoryValue)],
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <Link to="/products" className={btnSecondary}>View catalog</Link>
          <Link to="/movements" className={btnSecondary}>Movement history</Link>
        </div>
        {canReset && <button className={btnSecondary} onClick={() => setConfirming(true)}>Reset demo data</button>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-sm text-slate-500">{label}</div>
            <div className="mt-1 text-2xl font-semibold">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 font-medium">Low-stock products (&lt; 5)</h2>
          {low.length === 0 ? <StateMessage title="No low-stock products" /> : (
            <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto text-sm">
              {low.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 py-2">
                  <Link to={`/products/${p.id}`} className="min-w-0 truncate text-indigo-700 hover:underline">{p.sku} — {p.name}</Link>
                  <span className="flex shrink-0 items-center gap-2">{p.currentStock} {p.unit} <StockBadge stock={p.currentStock} /></span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 font-medium">Recent movements</h2>
          {recent.length === 0 ? <StateMessage title="No movements yet" /> : (
            <ul className="divide-y divide-slate-100 text-sm">
              {recent.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <div className="truncate">{r.sku} — {r.productName}</div>
                    <div className="text-xs text-slate-500">{formatDateTime(r.timestamp)} · {r.userName}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2"><TypeBadge type={r.type} /> {r.stockBefore} → {r.stockAfter}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {confirming && (
        <ConfirmDialog title="Reset demo data?" confirmLabel="Reset"
          message="This restores all stock to opening quantities and permanently clears movement history. Your login session is kept."
          onCancel={() => setConfirming(false)}
          onConfirm={() => { setConfirming(false); toast(dispatch(resetDemoData()) ? 'Demo data reset.' : 'Not authorized.', dispatch(resetDemoData) ? 'success' : 'error'); }} />
      )}
    </div>
  );
}