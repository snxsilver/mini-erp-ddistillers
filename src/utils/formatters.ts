const idr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('id-ID');
const dt = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

export const formatIdr = (v: number): string => idr.format(v);
export const formatNumber = (v: number): string => num.format(v);
export const formatDateTime = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : dt.format(d);
};