import { useMemo, useState } from 'react';
import { useAppSelector } from '../app/hooks';
import { selectSortedMovements } from '../features/inventory/inventorySelectors';
import { EMPTY_FILTERS, filterMovements, type MovementFilters } from '../features/inventory/inventoryUtils';
import { StateMessage, TypeBadge, btnSecondary, inputCls } from '../components/ui/common';
import { formatDateTime } from '../utils/formatters';

export default function MovementsPage() {
  const movements = useAppSelector(selectSortedMovements);
  const [f, setF] = useState<MovementFilters>(EMPTY_FILTERS);
  const rows = useMemo(() => filterMovements(movements, f), [movements, f]);
  const set = <K extends keyof MovementFilters>(k: K, v: MovementFilters[K]) => setF((p) => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1">
          <label htmlFor="mq" className="mb-1 block text-sm font-medium">Product</label>
          <input id="mq" className={inputCls} placeholder="SKU or name" value={f.query} onChange={(e) => set('query', e.target.value)} />
        </div>
        <div>
          <label htmlFor="mt" className="mb-1 block text-sm font-medium">Type</label>
          <select id="mt" className={inputCls} value={f.type} onChange={(e) => set('type', e.target.value as MovementFilters['type'])}>
            <option value="ALL">All</option><option value="IN">IN</option><option value="OUT">OUT</option>
          </select>
        </div>
        <div>
          <label htmlFor="mf" className="mb-1 block text-sm font-medium">From</label>
          <input id="mf" type="date" className={inputCls} value={f.from} max={f.to || undefined} onChange={(e) => set('from', e.target.value)} />
        </div>
        <div>
          <label htmlFor="mto" className="mb-1 block text-sm font-medium">To</label>
          <input id="mto" type="date" className={inputCls} value={f.to} min={f.from || undefined} onChange={(e) => set('to', e.target.value)} />
        </div>
        <button className={btnSecondary} onClick={() => setF(EMPTY_FILTERS)}>Clear filters</button>
      </div>

      {rows.length === 0 ? (
        <StateMessage title={movements.length === 0 ? 'No movements recorded yet' : 'No movements match these filters'} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600"><tr>
              {['Timestamp', 'SKU', 'Product', 'Type', 'Qty', 'Stock', 'User', 'Description'].map((h) => <th key={h} scope="col" className="px-3 py-2 font-medium">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((m) => (
                <tr key={m.id}>
                  <td className="whitespace-nowrap px-3 py-2">{formatDateTime(m.timestamp)}</td>
                  <td className="px-3 py-2 font-mono text-xs">{m.sku}</td>
                  <td className="px-3 py-2">{m.productName}</td>
                  <td className="px-3 py-2"><TypeBadge type={m.type} /></td>
                  <td className="px-3 py-2">{m.quantity}</td>
                  <td className="whitespace-nowrap px-3 py-2">{m.stockBefore} → {m.stockAfter}</td>
                  <td className="px-3 py-2">{m.userName}</td>
                  <td className="px-3 py-2">{m.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}