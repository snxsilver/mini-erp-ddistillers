import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { selectProducts } from '../features/inventory/inventorySelectors';
import { submitMovement } from '../features/inventory/inventorySlice';
import type { MovementType } from '../features/inventory/inventoryTypes';
import type { MovementErrors } from '../features/inventory/inventoryUtils';
import { btnPrimary, inputCls } from '../components/ui/common';
import { useToast } from '../components/ui/Toast';

export default function NewMovementPage() {
  const dispatch = useAppDispatch();
  const toast = useToast();
  const products = useAppSelector(selectProducts);
  const [params] = useSearchParams();
  const [type, setType] = useState<MovementType>(params.get('type') === 'OUT' ? 'OUT' : 'IN');
  const [productId, setProductId] = useState(params.get('product') ?? '');
  const [quantity, setQuantity] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<MovementErrors>({});

  const selected = products.find((p) => String(p.id) === productId);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const result = dispatch(submitMovement({
      productId: productId ? Number(productId) : null, type, quantity, description,
    }));
    if (!result.ok) { setErrors(result.errors); return; }
    setErrors({});
    setQuantity(''); setDescription(''); // keep product selected; empty fields also block accidental re-submits
    toast(`${type === 'IN' ? 'Stock in' : 'Stock out'} recorded: ${result.movement.sku} ${result.movement.stockBefore} → ${result.movement.stockAfter}`);
  };

  const err = (k: keyof MovementErrors) => errors[k] && <p id={`${k}-err`} role="alert" className="mt-1 text-xs text-red-600">{errors[k]}</p>;

  return (
    <form onSubmit={submit} noValidate className="max-w-xl space-y-4 rounded-lg border border-slate-200 bg-white p-5">
      {errors.general && <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-700">{errors.general}</p>}

      <fieldset>
        <legend className="mb-1 text-sm font-medium">Movement type</legend>
        <div className="flex gap-4 text-sm">
          {(['IN', 'OUT'] as const).map((t) => (
            <label key={t} className="flex items-center gap-2">
              <input type="radio" name="type" checked={type === t} onChange={() => setType(t)} /> {t === 'IN' ? 'Stock In' : 'Stock Out'}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="product" className="mb-1 block text-sm font-medium">Product</label>
        <select id="product" className={inputCls} value={productId} onChange={(e) => setProductId(e.target.value)} aria-invalid={!!errors.product} aria-describedby="product-err">
          <option value="">Select a product…</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}
        </select>
        {err('product')}
        {selected && <p className="mt-1 text-sm text-slate-600">Current stock: <strong>{selected.currentStock}</strong> {selected.unit}</p>}
      </div>

      <div>
        <label htmlFor="qty" className="mb-1 block text-sm font-medium">Quantity</label>
        <input id="qty" inputMode="numeric" className={inputCls} value={quantity} onChange={(e) => setQuantity(e.target.value)} aria-invalid={!!errors.quantity} aria-describedby="quantity-err" />
        {err('quantity')}
      </div>

      <div>
        <label htmlFor="desc" className="mb-1 block text-sm font-medium">Description / reference</label>
        <input id="desc" className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} aria-invalid={!!errors.description} aria-describedby="description-err" />
        {err('description')}
      </div>

      <button type="submit" className={btnPrimary}>Record movement</button>
    </form>
  );
}