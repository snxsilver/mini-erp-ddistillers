import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '../app/hooks';
import { selectCan } from '../features/auth/authSelectors';
import { selectCategories, selectProducts } from '../features/inventory/inventorySelectors';
import type { Product } from '../features/inventory/inventoryTypes';
import { isLowStock } from '../features/inventory/inventoryUtils';
import { StateMessage, StockBadge, btnSecondary, inputCls } from '../components/ui/common';
import { formatIdr } from '../utils/formatters';

type SortKey = 'sku' | 'name' | 'category' | 'priceIdr' | 'currentStock';

export default function ProductsPage() {
  const products = useAppSelector(selectProducts);
  const categories = useAppSelector(selectCategories);
  const canMove = useAppSelector(selectCan('movement:create'));
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'sku', dir: 1 });

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products
      .filter((p) => (!q || p.sku.toLowerCase().includes(q) || p.name.toLowerCase().includes(q))
        && (!category || p.category === category) && (!lowOnly || isLowStock(p.currentStock)))
      .sort((a: Product, b: Product) => {
        const av = a[sort.key], bv = b[sort.key];
        return (typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv))) * sort.dir;
      });
  }, [products, query, category, lowOnly, sort]);

  const th = (key: SortKey, label: string) => (
    <th scope="col" className="px-3 py-2 text-left" aria-sort={sort.key === key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button className="font-medium hover:text-indigo-700"
        onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : 1 }))}>
        {label}{sort.key === key ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}
      </button>
    </th>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1">
          <label htmlFor="q" className="mb-1 block text-sm font-medium">Search</label>
          <input id="q" className={inputCls} placeholder="SKU or product name" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div>
          <label htmlFor="cat" className="mb-1 block text-sm font-medium">Category</label>
          <select id="cat" className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} /> Low stock only
        </label>
      </div>

      {rows.length === 0 ? (
        <StateMessage title="No products found">Try changing your search or filters.</StateMessage>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                {th('sku', 'SKU')}{th('name', 'Product')}{th('category', 'Category')}
                <th scope="col" className="px-3 py-2 text-left font-medium">Unit</th>
                {th('priceIdr', 'Ref. price')}{th('currentStock', 'Stock')}
                <th scope="col" className="px-3 py-2 text-left font-medium">Status</th>
                <th scope="col" className="px-3 py-2 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((p) => (
                <tr key={p.id} className={isLowStock(p.currentStock) ? 'bg-amber-50/50' : ''}>
                  <td className="px-3 py-2 font-mono text-xs">{p.sku}</td>
                  <td className="px-3 py-2">{p.name}</td>
                  <td className="px-3 py-2 capitalize">{p.category}</td>
                  <td className="px-3 py-2">{p.unit}</td>
                  <td className="whitespace-nowrap px-3 py-2">{formatIdr(p.priceIdr)}</td>
                  <td className="px-3 py-2 font-medium">{p.currentStock}</td>
                  <td className="px-3 py-2"><StockBadge stock={p.currentStock} /></td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <Link to={`/products/${p.id}`} className="text-indigo-700 hover:underline">Details</Link>
                    {canMove && <Link to={`/movements/new?product=${p.id}`} className={`${btnSecondary} ml-2 !px-2 !py-1`}>Move stock</Link>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}