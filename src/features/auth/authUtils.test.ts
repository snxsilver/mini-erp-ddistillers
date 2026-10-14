import { describe, expect, it } from 'vitest';
import { hasPermission, type Permission } from './authUtils';
import type { Role } from '../users/userTypes';

describe('role-permission matrix', () => {
  const cases: [Role, Permission, boolean][] = [
    ['admin_gudang', 'movement:create', true], ['admin_gudang', 'inventory:reset', false],
    ['admin_gudang', 'users:view', false], ['admin_gudang', 'users:manage', false],
    ['manager', 'movement:create', true], ['manager', 'inventory:reset', true],
    ['manager', 'users:view', true], ['manager', 'users:manage', true],
    ['owner', 'movement:create', false], ['owner', 'inventory:reset', false],
    ['owner', 'users:view', true], ['owner', 'users:manage', false],
  ];
  it.each(cases)('%s / %s → %s', (role, perm, expected) => expect(hasPermission(role, perm)).toBe(expected));
  it('denies when there is no role', () => {
    expect(hasPermission(undefined, 'users:view')).toBe(false);
    expect(hasPermission(null, 'movement:create')).toBe(false);
  });
});