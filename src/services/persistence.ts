import type { Movement, Product } from '../features/inventory/inventoryTypes';
import { expectedStock } from '../features/inventory/inventoryUtils';
import { ROLES } from '../features/auth/authUtils';
import type { UserAccount } from '../features/users/userTypes';
import { isValidEmail, normalizeEmail } from '../features/users/usersUtils';


export const STORAGE_KEYS = {
  products: 'mini-erp:products:v1',
  movements: 'mini-erp:movements:v1',
  session: 'mini-erp:session:v1',
  users: 'mini-erp:users:v1'
} as const;

function getStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

type Read = { status: 'missing' } | { status: 'invalid' } | { status: 'ok'; value: unknown };

function read(key: string, storage: Storage | null): Read {
  if (!storage) return { status: 'missing' };
  try {
    const raw = storage.getItem(key);
    if (raw === null) return { status: 'missing' };
    return { status: 'ok', value: JSON.parse(raw) as unknown };
  } catch {
    return { status: 'invalid' }; // malformed JSON or access error
  }
}

function write(key: string, value: unknown, storage: Storage | null): boolean {
  if (!storage) return false;
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false; // quota exceeded, private mode, etc.
  }
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isNonNegInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;
const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

export function isProduct(v: unknown): v is Product {
  return (
    isObj(v) && Number.isInteger(v.id) && (v.id as number) > 0 &&
    isStr(v.sku) && isStr(v.name) && isStr(v.category) && isStr(v.unit) &&
    isNonNegInt(v.priceIdr) && isNonNegInt(v.currentStock) && isNonNegInt(v.openingStock) &&
    (v.image === undefined || typeof v.image === 'string')
  );
}

export function isMovement(v: unknown): v is Movement {
  return (
    isObj(v) && isStr(v.id) && isStr(v.timestamp) && !Number.isNaN(Date.parse(v.timestamp as string)) &&
    Number.isInteger(v.productId) && isStr(v.sku) && isStr(v.productName) &&
    (v.type === 'IN' || v.type === 'OUT') &&
    isNonNegInt(v.quantity) && (v.quantity as number) > 0 &&
    isNonNegInt(v.stockBefore) && isNonNegInt(v.stockAfter) &&
    (v.type === 'IN' ? v.stockAfter === (v.stockBefore as number) + (v.quantity as number)
                     : v.stockAfter === (v.stockBefore as number) - (v.quantity as number)) &&
    isStr(v.userId) && isStr(v.userName) && typeof v.description === 'string'
  );
}

/**
 * Returns null when data is missing, malformed, structurally invalid, or when stock does not
 * reconcile with history (treated as corruption). Caller then re-initialises from the API.
 */
export function loadInventory(storage: Storage | null = getStorage()): { products: Product[]; movements: Movement[] } | null {
  const p = read(STORAGE_KEYS.products, storage);
  if (p.status !== 'ok') return null;
  const products = p.value;
  if (!Array.isArray(products) || products.length === 0 || !products.every(isProduct)) return null;
  if (new Set(products.map((x) => x.id)).size !== products.length) return null;
  if (new Set(products.map((x) => x.sku)).size !== products.length) return null;

  const m = read(STORAGE_KEYS.movements, storage);
  if (m.status === 'invalid') return null;
  const movements = m.status === 'missing' ? [] : m.value;
  if (!Array.isArray(movements) || !movements.every(isMovement)) return null;

  const consistent = products.every(
    (prod) => prod.currentStock === expectedStock(prod.openingStock, movements.filter((x) => x.productId === prod.id)),
  );
  return consistent ? { products, movements } : null;
}

/** Returns false if persistence failed, so the UI can warn instead of claiming durability. */
export function saveInventory(products: Product[], movements: Movement[], storage: Storage | null = getStorage()): boolean {
  const a = write(STORAGE_KEYS.products, products, storage);
  const b = write(STORAGE_KEYS.movements, movements, storage);
  return a && b;
}

export function clearInventory(storage: Storage | null = getStorage()): void {
  try {
    storage?.removeItem(STORAGE_KEYS.products);
    storage?.removeItem(STORAGE_KEYS.movements);
  } catch { /* ignore */ }
}

/** Only the user id is stored. Role/name are re-derived from the demo account list. */
export function loadSession(storage: Storage | null = getStorage()): string | null {
  const r = read(STORAGE_KEYS.session, storage);
  return r.status === 'ok' && typeof r.value === 'string' ? r.value : null;
}
export const saveSession = (id: string, storage: Storage | null = getStorage()): boolean =>
  write(STORAGE_KEYS.session, id, storage);
export function clearSession(storage: Storage | null = getStorage()): void {
  try { storage?.removeItem(STORAGE_KEYS.session); } catch { /* ignore */ }
}

export function isUserAccount(v: unknown): v is UserAccount {
  return (
    isObj(v) && isStr(v.id) && isStr(v.name) && typeof v.email === 'string' && isValidEmail(v.email) &&
    typeof v.role === 'string' && (ROLES as readonly string[]).includes(v.role) &&
    typeof v.active === 'boolean' && isStr(v.demoPassword)
  );
}

/** null → caller falls back to seed accounts (also when corrupted or no active Manager exists). */
export function loadUsers(storage: Storage | null = getStorage()): UserAccount[] | null {
  const r = read(STORAGE_KEYS.users, storage);
  if (r.status !== 'ok' || !Array.isArray(r.value) || r.value.length === 0 || !r.value.every(isUserAccount)) return null;
  const users = r.value;
  if (new Set(users.map((u) => u.id)).size !== users.length) return null;
  if (new Set(users.map((u) => normalizeEmail(u.email))).size !== users.length) return null;
  if (!users.some((u) => u.role === 'manager' && u.active)) return null;
  return users;
}
export const saveUsers = (users: UserAccount[], storage: Storage | null = getStorage()): boolean =>
  write(STORAGE_KEYS.users, users, storage);