import type { Role } from '../users/userTypes';

export const ROLES: readonly Role[] = ['admin_gudang', 'manager', 'owner'];

export type Permission = 'movement:create' | 'inventory:reset' | 'users:view' | 'users:manage';

/** The ONLY place where roles are mapped to permissions. */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  admin_gudang: ['movement:create'],
  manager: ['movement:create', 'inventory:reset', 'users:view', 'users:manage'],
  owner: ['users:view'],
};

export const hasPermission = (role: Role | null | undefined, p: Permission): boolean =>
  role != null && ROLE_PERMISSIONS[role].includes(p);

const LABELS: Record<Role, string> = { admin_gudang: 'Admin Gudang', manager: 'Manager', owner: 'Owner' };
export const roleLabel = (r: Role): string => LABELS[r];