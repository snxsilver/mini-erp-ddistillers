import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { isLowStock } from '../../features/inventory/inventoryUtils';

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-16 text-slate-500">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> {label}
    </div>
  );
}

export function StateMessage({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
      <h2 className="font-medium text-slate-800">{title}</h2>
      {children && <p className="mt-1 text-sm text-slate-500">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function StockBadge({ stock }: { stock: number }) {
  const [text, cls] =
    stock === 0 ? ['Out of stock', 'bg-red-100 text-red-700']
    : isLowStock(stock) ? ['Low stock', 'bg-amber-100 text-amber-800']
    : ['In stock', 'bg-green-100 text-green-700'];
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{text}</span>;
}

export function TypeBadge({ type }: { type: 'IN' | 'OUT' }) {
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${type === 'IN' ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700'}`}>
      {type}
    </span>
  );
}

export const btnPrimary =
  'inline-flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500';
export const btnSecondary =
  'inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500';
export const inputCls =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';