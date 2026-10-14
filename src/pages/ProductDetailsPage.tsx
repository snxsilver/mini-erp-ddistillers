import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAppSelector } from '../app/hooks';
import { selectCan } from '../features/auth/authSelectors';
import { selectProductById, selectSortedMovements } from '../features/inventory/inventorySelectors';
import { expectedStock, sumByType } from '../features/inventory/inventoryUtils';
import { StateMessage, StockBadge, TypeBadge, btnPrimary, btnSecondary } from '../components/ui/common';
import { formatDateTime, formatIdr } from '../utils/formatters';

export default function ProductDetailsPage() {
  const { id } = useParams();
  const pid = Number(id);
  const product = useAppSelector((s) => selectProductById(s, pid));
  const all = useAppSelector(selectSortedMovements);
  const canMove = useAppSelector(selectCan('movement:create'));
  const history = useMemo(() => all.filter((m) => m.productId === pid), [all, pid]);

  if (!product) {
    return <StateMessage title="Product not found" action={<Link to="/products" className={btnSecondary}>Back to catalog</Link>}>
      No product matches this ID.
    </StateMessage>;
  }
  const totalIn = sumByType(history, 'IN');
  const totalOut = sumByType(history, 'OUT');
  const expected = expectedStock(product.openingStock, history);
  const reconciled = expected === product.currentStock;

  const facts: [string, string | number][] = [
    ['Category', product.category], ['Unit', product.unit], ['Reference price', formatIdr(product.priceIdr)],
    ['Opening stock', product.openingStock], ['Current stock', product.currentStock],
    ['Total stock-in', totalIn], ['Total stock-out', totalOut], ['Reconciled expected stock', expected],
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start gap-4 rounded-lg border border-slate-200 bg-white p-4">
        {product.image && <img src={product.image} alt={product.name} loading="lazy" className="h-24 w-24 rounded border border-slate-200 object-cover" />}
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold">{product.name}</h2>
          <p className="font-mono text-sm text-slate-500">{product.sku}</p>
          <div className="mt-2 flex items-center gap-2"><StockBadge stock={product.currentStock} />
            <span className={`text-xs ${reconciled ? 'text-green-700' : 'text-red-700'}`}>{reconciled ? 'Reconciled' : 'Mismatch with history'}</span>
          </div>
        </div>
        {canMove && <Link to={`/movements/new?product=${product.id}`} className={btnPrimary}>Record stock movement</Link>}
      </div>

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {facts.map(([k, v]) => (
          <div key={k} className="rounded-lg border border-slate-200 bg-white p-3">
            <dt className="text-xs text-slate-500">{k}</dt><dd className="font-medium capitalize">{v}</dd>
          </div>
        ))}
      </dl>

      <section>
        <h2 className="mb-2 font-medium">Movement history</h2>
        {history.length === 0 ? <StateMessage title="No movements for this product" /> : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600"><tr>
                {['Time', 'Type', 'Qty', 'Stock', 'User', 'Description'].map((h) => <th key={h} scope="col" className="px-3 py-2 font-medium">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((m) => (
                  <tr key={m.id}>
                    <td className="whitespace-nowrap px-3 py-2">{formatDateTime(m.timestamp)}</td>
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
      </section>
    </div>
  );
}