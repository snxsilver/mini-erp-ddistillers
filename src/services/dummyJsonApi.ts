import type { DummyJsonProduct } from '../features/inventory/inventoryUtils';

export const PRODUCTS_URL = 'https://dummyjson.com/products?limit=100';

function isRaw(v: unknown): v is DummyJsonProduct {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    Number.isInteger(o.id) && (o.id as number) > 0 &&
    typeof o.title === 'string' && typeof o.category === 'string' &&
    typeof o.price === 'number' && Number.isFinite(o.price) && o.price >= 0
  );
}

export async function fetchProducts(signal?: AbortSignal): Promise<DummyJsonProduct[]> {
  let res: Response;
  try {
    res = await fetch(PRODUCTS_URL, { signal });
  } catch {
    throw new Error('Network error: could not reach the product service.');
  }
  if (!res.ok) throw new Error(`Failed to load catalog (HTTP ${res.status}).`);
  const data: unknown = await res.json().catch(() => null);
  const list = (data as { products?: unknown } | null)?.products;
  if (!Array.isArray(list)) throw new Error('Unexpected response format from product service.');
  const valid = list.filter(isRaw);
  const unique = [...new Map(valid.map((p) => [p.id, p])).values()];
  if (unique.length === 0) throw new Error('The product service returned no usable products.');
  return unique;
}