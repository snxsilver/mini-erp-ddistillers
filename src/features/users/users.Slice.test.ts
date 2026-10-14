import { describe, expect, it } from 'vitest';
import { ADMIN, MANAGER, OWNER, makeStore } from '../../test/helpers';
import { loginSucceeded } from '../auth/authSlice';
import { selectCan, selectCurrentUser } from '../auth/authSelectors';
import { resetDemoData, submitMovement } from '../inventory/inventorySlice';
import { createUser, deleteUser, operationApplied, resetUserPassword, updateUser } from './usersSlice';

describe('users store: unauthorized operations', () => {
  it('owner thunks fail and leave state untouched', () => {
    const store = makeStore(OWNER);
    const before = store.getState().users;
    expect(store.dispatch(createUser({ name: 'X', email: 'x@demo.local', role: 'owner', password: 'abcdef' })).ok).toBe(false);
    expect(store.dispatch(updateUser('u-admin', { role: 'manager' })).ok).toBe(false);
    expect(store.dispatch(deleteUser('u-admin')).ok).toBe(false);
    expect(store.dispatch(resetUserPassword('u-admin', 'abcdef')).ok).toBe(false);
    expect(store.getState().users).toBe(before);
  });
  it('admin_gudang cannot manage users', () => {
    const store = makeStore(ADMIN);
    const before = store.getState().users;
    expect(store.dispatch(deleteUser('u-owner')).ok).toBe(false);
    expect(store.getState().users).toBe(before);
  });
  it('a forged direct dispatch is a no-op in the reducer', () => {
    const store = makeStore(OWNER);
    const before = store.getState().users;
    store.dispatch(operationApplied({ kind: 'delete', actorId: 'u-owner', targetId: 'u-admin' }));
    store.dispatch(operationApplied({ kind: 'update', actorId: 'u-admin', targetId: 'u-owner', patch: { role: 'manager' } }));
    expect(store.getState().users).toBe(before);
  });
  it('signed-out callers cannot manage users', () => {
    expect(makeStore(null).dispatch(deleteUser('u-admin')).ok).toBe(false);
  });
});

describe('users store: manager operations', () => {
  it('manager creates, edits and deletes users', () => {
    const store = makeStore(MANAGER);
    expect(store.dispatch(createUser({ name: 'Temp', email: 'temp@demo.local', role: 'owner', password: 'abcdef' })).ok).toBe(true);
    const id = store.getState().users.users.find((u) => u.email === 'temp@demo.local')!.id;
    expect(store.dispatch(updateUser(id, { name: 'Temp 2' })).ok).toBe(true);
    expect(store.dispatch(deleteUser(id)).ok).toBe(true);
    expect(store.getState().users.users.some((u) => u.id === id)).toBe(false);
  });
  it('role change updates effective permissions immediately', () => {
    const store = makeStore(OWNER);
    expect(selectCan('movement:create')(store.getState())).toBe(false);
    store.dispatch(operationApplied({ kind: 'update', actorId: 'u-manager', targetId: 'u-owner', patch: { role: 'admin_gudang' } }));
    expect(selectCan('movement:create')(store.getState())).toBe(true);
    expect(selectCan('users:view')(store.getState())).toBe(false);
    expect(store.dispatch(submitMovement({ productId: 1, type: 'IN', quantity: '1', description: 'x' })).ok).toBe(true);
  });
  it('deactivating or deleting the signed-in user ends their effective session', () => {
    const a = makeStore(ADMIN);
    a.dispatch(operationApplied({ kind: 'update', actorId: 'u-manager', targetId: 'u-admin', patch: { active: false } }));
    expect(selectCurrentUser(a.getState())).toBeNull();
    const b = makeStore(ADMIN);
    b.dispatch(operationApplied({ kind: 'delete', actorId: 'u-manager', targetId: 'u-admin' }));
    expect(selectCurrentUser(b.getState())).toBeNull();
  });
});

describe('history preservation and reset', () => {
  it('deleting a user keeps movements with the actor id and name snapshot', () => {
    const store = makeStore(ADMIN);
    expect(store.dispatch(submitMovement({ productId: 1, type: 'OUT', quantity: '2', description: 'SO-1' })).ok).toBe(true);
    store.dispatch(loginSucceeded('u-manager'));
    expect(store.dispatch(deleteUser('u-admin')).ok).toBe(true);
    const { movements, products } = store.getState().inventory;
    expect(movements).toHaveLength(1);
    expect(movements[0]).toMatchObject({ userId: 'u-admin', userName: 'Admin Gudang' });
    expect(products[0].currentStock).toBe(8);
  });
  it('renaming a user does not rewrite historical snapshots', () => {
    const store = makeStore(ADMIN);
    store.dispatch(submitMovement({ productId: 1, type: 'IN', quantity: '1', description: 'x' }));
    store.dispatch(operationApplied({ kind: 'update', actorId: 'u-manager', targetId: 'u-admin', patch: { name: 'Renamed' } }));
    expect(store.getState().inventory.movements[0].userName).toBe('Admin Gudang');
  });
  it('manager reset preserves accounts and session; admin_gudang and owner cannot reset', () => {
    const store = makeStore(MANAGER);
    store.dispatch(submitMovement({ productId: 1, type: 'OUT', quantity: '3', description: 'x' }));
    const { users, auth } = store.getState();
    expect(store.dispatch(resetDemoData())).toBe(true);
    expect(store.getState().inventory.movements).toEqual([]);
    expect(store.getState().inventory.products[0].currentStock).toBe(10);
    expect(store.getState().users).toBe(users);
    expect(store.getState().auth).toBe(auth);

    for (const u of [ADMIN, OWNER]) {
      const s = makeStore(u);
      s.dispatch(operationApplied({ kind: 'update', actorId: 'u-manager', targetId: u.id, patch: {} })); // no-op
      expect(s.dispatch(resetDemoData())).toBe(u.role === 'manager');
    }
  });
});