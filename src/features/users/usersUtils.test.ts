import { describe, expect, it } from 'vitest';
import { SEED_USERS, applyUserOperation, authenticate, type UserOperation } from './usersUtils';
import type { UserAccount } from './userTypes';

const users = (): UserAccount[] => SEED_USERS.map((u) => ({ ...u }));
const create = (actorId: string, over = {}): UserOperation => ({
  kind: 'create', actorId, id: 'u-new',
  input: { name: 'New', email: 'new@demo.local', role: 'admin_gudang', password: 'secret1', ...over },
});

describe('authenticate', () => {
  it('accepts valid credentials, case-insensitive email', () => {
    expect(authenticate(users(), 'ADMIN@Demo.Local ', 'admin123')?.id).toBe('u-admin');
  });
  it('rejects wrong password', () => expect(authenticate(users(), 'admin@demo.local', 'x')).toBeNull());
  it('rejects inactive accounts', () => {
    const u = users().map((x) => (x.id === 'u-admin' ? { ...x, active: false } : x));
    expect(authenticate(u, 'admin@demo.local', 'admin123')).toBeNull();
  });
  it('rejects deleted accounts', () => {
    const u = users().filter((x) => x.id !== 'u-admin');
    expect(authenticate(u, 'admin@demo.local', 'admin123')).toBeNull();
  });
});

describe('authorization inside user operations', () => {
  const ops: [string, (a: string) => UserOperation][] = [
    ['create', (a) => create(a)],
    ['update', (a) => ({ kind: 'update', actorId: a, targetId: 'u-owner', patch: { name: 'X' } })],
    ['delete', (a) => ({ kind: 'delete', actorId: a, targetId: 'u-owner' })],
    ['resetPassword', (a) => ({ kind: 'resetPassword', actorId: a, targetId: 'u-owner', password: 'abcdef' })],
  ];
  it.each(ops)('%s is rejected for admin_gudang and owner', (_n, build) => {
    expect(applyUserOperation(users(), build('u-admin')).ok).toBe(false);
    expect(applyUserOperation(users(), build('u-owner')).ok).toBe(false);
  });
  it('rejects unknown and inactive actors', () => {
    expect(applyUserOperation(users(), create('ghost')).ok).toBe(false);
    const u = users().map((x) => (x.id === 'u-manager' ? { ...x, active: false } : x));
    expect(applyUserOperation(u, create('u-manager')).ok).toBe(false);
  });
  it('manager is allowed', () => expect(applyUserOperation(users(), create('u-manager')).ok).toBe(true));
});

describe('create / update rules', () => {
  it('normalises email and does not mutate input', () => {
    const before = users();
    const r = applyUserOperation(before, create('u-manager', { email: '  New@Demo.LOCAL ' }));
    expect(r.ok && r.users.find((u) => u.id === 'u-new')?.email).toBe('new@demo.local');
    expect(before).toHaveLength(3);
  });
  it('rejects case-insensitive duplicate emails on create and update', () => {
    const c = applyUserOperation(users(), create('u-manager', { email: 'ADMIN@demo.local' }));
    expect(!c.ok && c.errors.email).toMatch(/already/);
    const u = applyUserOperation(users(), { kind: 'update', actorId: 'u-manager', targetId: 'u-owner', patch: { email: 'Admin@Demo.Local' } });
    expect(u.ok).toBe(false);
  });
  it('allows keeping own email on update', () => {
    const r = applyUserOperation(users(), { kind: 'update', actorId: 'u-manager', targetId: 'u-owner', patch: { email: 'OWNER@demo.local', name: 'Boss' } });
    expect(r.ok).toBe(true);
  });
  it.each([
    ['blank name', { name: ' ' }], ['bad email', { email: 'nope' }],
    ['bad role', { role: 'root' }], ['short password', { password: '123' }],
  ])('rejects %s', (_n, over) => expect(applyUserOperation(users(), create('u-manager', over)).ok).toBe(false));
  it('changes role and status', () => {
    const r = applyUserOperation(users(), { kind: 'update', actorId: 'u-manager', targetId: 'u-owner', patch: { role: 'admin_gudang', active: false } });
    expect(r.ok && r.users.find((u) => u.id === 'u-owner')).toMatchObject({ role: 'admin_gudang', active: false });
  });
  it('rejects an invalid role value', () => {
    expect(applyUserOperation(users(), { kind: 'update', actorId: 'u-manager', targetId: 'u-owner', patch: { role: 'root' } }).ok).toBe(false);
  });
});

describe('manager safety rules', () => {
  it('manager cannot demote, deactivate or delete themselves', () => {
    for (const op of [
      { kind: 'update', actorId: 'u-manager', targetId: 'u-manager', patch: { role: 'owner' } },
      { kind: 'update', actorId: 'u-manager', targetId: 'u-manager', patch: { active: false } },
      { kind: 'delete', actorId: 'u-manager', targetId: 'u-manager' },
    ] as UserOperation[]) {
      expect(applyUserOperation(users(), op).ok).toBe(false);
    }
  });
  it('still blocks self-demotion when another manager exists', () => {
    const u = [...users(), { id: 'u-m2', name: 'M2', email: 'm2@demo.local', role: 'manager' as const, active: true, demoPassword: 'm2m2m2' }];
    expect(applyUserOperation(u, { kind: 'update', actorId: 'u-manager', targetId: 'u-manager', patch: { role: 'owner' } }).ok).toBe(false);
  });
  it('can demote another manager; an active manager always remains', () => {
    const u = [...users(), { id: 'u-m2', name: 'M2', email: 'm2@demo.local', role: 'manager' as const, active: true, demoPassword: 'm2m2m2' }];
    const r = applyUserOperation(u, { kind: 'update', actorId: 'u-manager', targetId: 'u-m2', patch: { role: 'owner' } });
    expect(r.ok && r.users.some((x) => x.role === 'manager' && x.active)).toBe(true);
  });
  it('password reset lets the new password in and the old one out', () => {
    const r = applyUserOperation(users(), { kind: 'resetPassword', actorId: 'u-manager', targetId: 'u-admin', password: 'newpass1' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(authenticate(r.users, 'admin@demo.local', 'newpass1')).not.toBeNull();
      expect(authenticate(r.users, 'admin@demo.local', 'admin123')).toBeNull();
    }
  });
  it('rejects a short reset password', () => {
    expect(applyUserOperation(users(), { kind: 'resetPassword', actorId: 'u-manager', targetId: 'u-admin', password: '1' }).ok).toBe(false);
  });
});