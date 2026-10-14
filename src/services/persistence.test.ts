import { describe, expect, it } from 'vitest';
import { makeProduct, memoryStorage } from '../test/helpers';
import { STORAGE_KEYS, loadInventory, saveInventory } from './persistence';
import type { Movement } from '../features/inventory/inventoryTypes';
import { loadUsers, saveUsers } from './persistence';
import { SEED_USERS } from '../features/users/usersUtils';

const mov: Movement = {
  id: 'M1', timestamp: '2026-01-01T00:00:00.000Z', productId: 1, sku: 'SKU-0001', productName: 'Test', type: 'IN',
  quantity: 5, stockBefore: 10, stockAfter: 15, userId: 'u', userName: 'U', description: 'x',
};

describe('persistence', () => {
  it('restores valid saved data', () => {
    const s = memoryStorage();
    const products = [makeProduct({ currentStock: 15 })];
    expect(saveInventory(products, [mov], s)).toBe(true);
    expect(loadInventory(s)).toEqual({ products, movements: [mov] });
  });
  it('returns null when nothing is stored (triggers initialisation)', () => {
    expect(loadInventory(memoryStorage())).toBeNull();
  });
  it('handles malformed JSON safely', () => {
    const s = memoryStorage();
    s.setItem(STORAGE_KEYS.products, '{not json');
    expect(loadInventory(s)).toBeNull();
  });
  it('rejects structurally invalid data', () => {
    const s = memoryStorage();
    s.setItem(STORAGE_KEYS.products, JSON.stringify([{ id: 1, name: 'x' }]));
    expect(loadInventory(s)).toBeNull();
  });
  it('rejects stock that does not reconcile with history', () => {
    const s = memoryStorage();
    saveInventory([makeProduct({ currentStock: 99 })], [mov], s);
    expect(loadInventory(s)).toBeNull();
  });
  it('reports failure when storage throws', () => {
    const bad = { setItem() { throw new Error('quota'); } } as unknown as Storage;
    expect(saveInventory([makeProduct()], [], bad)).toBe(false);
  });
});

describe('users persistence', () => {
  it('round-trips valid users', () => {
    const s = memoryStorage();
    expect(saveUsers([...SEED_USERS], s)).toBe(true);
    expect(loadUsers(s)).toEqual(SEED_USERS);
  });
  it('returns null when missing, malformed, or invalid', () => {
    expect(loadUsers(memoryStorage())).toBeNull();
    const s = memoryStorage();
    s.setItem(STORAGE_KEYS.users, '{oops');
    expect(loadUsers(s)).toBeNull();
    s.setItem(STORAGE_KEYS.users, JSON.stringify([{ id: 'x' }]));
    expect(loadUsers(s)).toBeNull();
  });
  it('rejects case-insensitive duplicate emails', () => {
    const s = memoryStorage();
    saveUsers([...SEED_USERS, { ...SEED_USERS[1], id: 'dup', email: 'ADMIN@demo.local' }], s);
    expect(loadUsers(s)).toBeNull();
  });
  it('rejects data with no active manager', () => {
    const s = memoryStorage();
    saveUsers(SEED_USERS.map((u) => (u.role === 'manager' ? { ...u, active: false } : u)), s);
    expect(loadUsers(s)).toBeNull();
  });
  it('rejects unknown roles', () => {
    const s = memoryStorage();
    s.setItem(STORAGE_KEYS.users, JSON.stringify([{ ...SEED_USERS[0], role: 'admin' }]));
    expect(loadUsers(s)).toBeNull();
  });
});