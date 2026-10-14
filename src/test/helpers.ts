import { createAppStore } from '../app/store';
import { inventoryInitialState } from '../features/inventory/inventorySlice';
import type { Product } from '../features/inventory/inventoryTypes';
import type { SessionUser, UserAccount } from '../features/users/userTypes';
import { SEED_USERS } from '../features/users/usersUtils';

export const MANAGER: SessionUser = { id: 'u-manager', name: 'Manager', email: 'manager@demo.local', role: 'manager', active: true };
export const ADMIN: SessionUser = { id: 'u-admin', name: 'Admin Gudang', email: 'admin@demo.local', role: 'admin_gudang', active: true };
export const OWNER: SessionUser = { id: 'u-owner', name: 'Owner', email: 'owner@demo.local', role: 'owner', active: true };

export const makeProduct = (over: Partial<Product> = {}): Product => ({
  id: 1, sku: 'SKU-0001', name: 'Test', category: 'misc', unit: 'pcs',
  priceIdr: 10000, currentStock: 10, openingStock: 10, ...over,
});

export function makeStore(user: SessionUser | null, products: Product[] = [makeProduct()], users: UserAccount[] = [...SEED_USERS]) {
  return createAppStore({
    auth: { userId: user?.id ?? null, error: null },
    users: { users },
    inventory: { ...inventoryInitialState, products, status: 'ready' },
  });
}

export function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() { return m.size; },
    clear: () => m.clear(),
    getItem: (k: string) => m.get(k) ?? null,
    key: (i: number) => [...m.keys()][i] ?? null,
    removeItem: (k: string) => { m.delete(k); },
    setItem: (k: string, v: string) => { m.set(k, v); },
  } as unknown as Storage;
}