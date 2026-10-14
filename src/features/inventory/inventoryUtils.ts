import type { Movement, MovementInput, MovementType, Product } from './inventoryTypes';

export const LOW_STOCK_THRESHOLD = 5;
/** Demo assumption, NOT a live market rate. */
export const USD_TO_IDR_RATE = 16000;
export const DEFAULT_UNIT = 'pcs';

export interface DummyJsonProduct {
  id: number;
  title: string;
  category: string;
  price: number;
  thumbnail?: string;
}

// ---------- Catalog mapping ----------
export function generateSku(id: number): string {
  if (!Number.isInteger(id) || id <= 0) throw new RangeError('Product id must be a positive integer');
  return `SKU-${String(id).padStart(4, '0')}`;
}

/** Simulated, deterministic opening stock in 0..30 (some products start low on purpose). */
export function simulatedOpeningStock(id: number): number {
  return (id * 17 + 5) % 31;
}

export function usdToIdr(usd: number, rate: number = USD_TO_IDR_RATE): number {
  return Math.max(0, Math.round(usd * rate));
}

export function mapDummyProduct(raw: DummyJsonProduct, rate: number = USD_TO_IDR_RATE): Product {
  const opening = simulatedOpeningStock(raw.id);
  return {
    id: raw.id,
    sku: generateSku(raw.id),
    name: raw.title,
    category: raw.category,
    unit: DEFAULT_UNIT,
    priceIdr: usdToIdr(raw.price, rate),
    currentStock: opening,
    openingStock: opening,
    image: raw.thumbnail,
  };
}

// ---------- Validation ----------
export type ParsedQuantity = { ok: true; value: number } | { ok: false; error: string };

export function parseQuantity(input: unknown): ParsedQuantity {
  if (input === null || input === undefined) return { ok: false, error: 'Quantity is required.' };
  let n: number;
  if (typeof input === 'string') {
    const t = input.trim();
    if (t === '') return { ok: false, error: 'Quantity is required.' };
    if (!/^-?\d+(\.\d+)?$/.test(t)) return { ok: false, error: 'Quantity must be a number.' };
    n = Number(t);
  } else if (typeof input === 'number') {
    n = input;
  } else {
    return { ok: false, error: 'Quantity must be a number.' };
  }
  if (!Number.isFinite(n)) return { ok: false, error: 'Quantity must be a number.' };
  if (!Number.isInteger(n)) return { ok: false, error: 'Quantity must be a whole number.' };
  if (n <= 0) return { ok: false, error: 'Quantity must be greater than zero.' };
  if (!Number.isSafeInteger(n)) return { ok: false, error: 'Quantity is too large.' };
  return { ok: true, value: n };
}

// ---------- Transactions ----------
export type MovementField = 'product' | 'type' | 'quantity' | 'description' | 'general';
export type MovementErrors = Partial<Record<MovementField, string>>;

export interface MovementContext {
  id: string;
  timestamp: string;
  user: { id: string; name: string };
}

export type MovementResult =
  | { ok: true; products: Product[]; movement: Movement }
  | { ok: false; errors: MovementErrors };

/**
 * Pure: never mutates its arguments. On any failure returns errors only,
 * so callers cannot accidentally change stock or history.
 */
export function recordMovement(
  products: readonly Product[],
  input: MovementInput,
  ctx: MovementContext,
): MovementResult {
  const errors: MovementErrors = {};
  const product =
    input.productId === null || input.productId === undefined
      ? undefined
      : products.find((p) => p.id === input.productId);

  if (!product) errors.product = input.productId == null ? 'Select a product.' : 'Product not found.';
  if (input.type !== 'IN' && input.type !== 'OUT') errors.type = 'Select a movement type.';

  const qty = parseQuantity(input.quantity);
  if (!qty.ok) errors.quantity = qty.error;

  const description = typeof input.description === 'string' ? input.description.trim() : '';
  if (!description) errors.description = 'Description or reference is required.';

  if (product && qty.ok && input.type === 'OUT' && qty.value > product.currentStock) {
    errors.quantity = `Insufficient stock. Available: ${product.currentStock}.`;
  }
  if (product && qty.ok && input.type === 'IN' && !Number.isSafeInteger(product.currentStock + qty.value)) {
    errors.quantity = 'Resulting stock is too large.';
  }

  if (Object.keys(errors).length > 0 || !product || !qty.ok) return { ok: false, errors };

  const stockBefore = product.currentStock;
  const stockAfter = input.type === 'IN' ? stockBefore + qty.value : stockBefore - qty.value;

  const movement: Movement = {
    id: ctx.id,
    timestamp: ctx.timestamp,
    productId: product.id,
    sku: product.sku,
    productName: product.name,
    type: input.type,
    quantity: qty.value,
    stockBefore,
    stockAfter,
    userId: ctx.user.id,
    userName: ctx.user.name,
    description,
  };
  return {
    ok: true,
    movement,
    products: products.map((p) => (p.id === product.id ? { ...p, currentStock: stockAfter } : p)),
  };
}

export function newMovementId(): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `MOV-${Date.now().toString(36)}-${rand}`;
}

// ---------- Calculations ----------
export function expectedStock(openingStock: number, movements: readonly Movement[]): number {
  return movements.reduce(
    (acc, m) => (m.type === 'IN' ? acc + m.quantity : m.type === 'OUT' ? acc - m.quantity : acc),
    openingStock,
  );
}

export function sumByType(movements: readonly Movement[], type: MovementType): number {
  return movements.filter((m) => m.type === type).reduce((a, m) => a + m.quantity, 0);
}

export const isLowStock = (stock: number): boolean => stock < LOW_STOCK_THRESHOLD;
export const totalUnits = (products: readonly Product[]): number =>
  products.reduce((a, p) => a + p.currentStock, 0);
export const inventoryValue = (products: readonly Product[]): number =>
  products.reduce((a, p) => a + p.currentStock * p.priceIdr, 0);

/** Returns ids of products whose stock does not reconcile with their history. */
export function findInvariantViolations(products: readonly Product[], movements: readonly Movement[]): number[] {
  return products
    .filter(
      (p) =>
        p.currentStock !==
        expectedStock(p.openingStock, movements.filter((m) => m.productId === p.id)),
    )
    .map((p) => p.id);
}

/** Restores the original demo state from stored opening stock. */
export function resetInventory(products: readonly Product[]): Product[] {
  return products.map((p) => ({ ...p, currentStock: p.openingStock }));
}

// ---------- History filtering ----------
export interface MovementFilters {
  query: string;
  type: 'ALL' | MovementType;
  from: string; // YYYY-MM-DD (local)
  to: string;
}
export const EMPTY_FILTERS: MovementFilters = { query: '', type: 'ALL', from: '', to: '' };

export function sortNewestFirst(movements: readonly Movement[]): Movement[] {
  return [...movements].sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
}

export function filterMovements(movements: readonly Movement[], f: MovementFilters): Movement[] {
  const q = f.query.trim().toLowerCase();
  const from = f.from ? new Date(`${f.from}T00:00:00`).getTime() : null;
  const to = f.to ? new Date(`${f.to}T23:59:59.999`).getTime() : null;
  return movements.filter((m) => {
    if (f.type !== 'ALL' && m.type !== f.type) return false;
    if (q && !m.sku.toLowerCase().includes(q) && !m.productName.toLowerCase().includes(q)) return false;
    const t = Date.parse(m.timestamp);
    if (from !== null && t < from) return false;
    if (to !== null && t > to) return false;
    return true;
  });
}