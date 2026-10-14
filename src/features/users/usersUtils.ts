import { ROLES, hasPermission } from '../auth/authUtils';
import type { Role, UserAccount } from './userTypes';

export const SEED_USERS: readonly UserAccount[] = [
  { id: 'u-manager', name: 'Manager', email: 'manager@demo.local', role: 'manager', active: true, demoPassword: 'manager123' },
  { id: 'u-admin', name: 'Admin Gudang', email: 'admin@demo.local', role: 'admin_gudang', active: true, demoPassword: 'admin123' },
  { id: 'u-owner', name: 'Owner', email: 'owner@demo.local', role: 'owner', active: true, demoPassword: 'owner123' },
];

export const MIN_PASSWORD_LENGTH = 6;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const normalizeEmail = (e: string): string => e.trim().toLowerCase();
export const isValidEmail = (e: string): boolean => EMAIL_RE.test(e);
export const isRole = (v: unknown): v is Role => typeof v === 'string' && (ROLES as readonly string[]).includes(v);

export function newUserId(): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `u-${Date.now().toString(36)}-${rand}`;
}

/** Inactive and deleted (absent) accounts never authenticate. Email match is case-insensitive. */
export function authenticate(users: readonly UserAccount[], email: string, password: string): UserAccount | null {
  const e = normalizeEmail(email);
  const u = users.find((x) => normalizeEmail(x.email) === e);
  return u && u.active && u.demoPassword === password ? u : null;
}

export type UserField = 'name' | 'email' | 'role' | 'password' | 'general';
export type UserErrors = Partial<Record<UserField, string>>;
export type UserResult = { ok: true; users: UserAccount[] } | { ok: false; errors: UserErrors };

export interface NewUserInput { name: string; email: string; role: unknown; password: string }
export interface UserPatch { name?: string; email?: string; role?: unknown; active?: boolean }

export type UserOperation =
  | { kind: 'create'; actorId: string; id: string; input: NewUserInput }
  | { kind: 'update'; actorId: string; targetId: string; patch: UserPatch }
  | { kind: 'delete'; actorId: string; targetId: string }
  | { kind: 'resetPassword'; actorId: string; targetId: string; password: string };

const fail = (errors: UserErrors): UserResult => ({ ok: false, errors });

function checkEmail(raw: string, users: readonly UserAccount[], selfId?: string): { email: string; error?: string } {
  const email = normalizeEmail(raw);
  if (!email) return { email, error: 'Email is required.' };
  if (!isValidEmail(email)) return { email, error: 'Enter a valid email address.' };
  if (users.some((u) => u.id !== selfId && normalizeEmail(u.email) === email)) {
    return { email, error: 'This email is already in use.' };
  }
  return { email };
}

const passwordError = (p: string): string | undefined =>
  typeof p === 'string' && p.length >= MIN_PASSWORD_LENGTH ? undefined : `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;

/** Applied to every resulting user list. */
function managementGuard(next: readonly UserAccount[], actorId: string): UserErrors | null {
  const self = next.find((u) => u.id === actorId);
  if (!self || !self.active || !hasPermission(self.role, 'users:manage')) {
    return { general: 'You cannot remove your own management access (change role, deactivate or delete yourself).' };
  }
  if (!next.some((u) => u.role === 'manager' && u.active)) {
    return { general: 'At least one active Manager account must remain.' };
  }
  return null;
}

/**
 * Pure and authorization-aware: the actor is looked up in `users` itself (never trusted from the caller),
 * must be active and hold `users:manage`. Never mutates; failures return errors only.
 */
export function applyUserOperation(users: readonly UserAccount[], op: UserOperation): UserResult {
  const actor = users.find((u) => u.id === op.actorId);
  if (!actor || !actor.active || !hasPermission(actor.role, 'users:manage')) {
    return fail({ general: 'You are not authorized to manage users.' });
  }

  switch (op.kind) {
    case 'create': {
      const errors: UserErrors = {};
      const name = op.input.name.trim();
      if (!name) errors.name = 'Name is required.';
      const { email, error } = checkEmail(op.input.email, users);
      if (error) errors.email = error;
      if (!isRole(op.input.role)) errors.role = 'Select a valid role.';
      const pe = passwordError(op.input.password);
      if (pe) errors.password = pe;
      if (users.some((u) => u.id === op.id)) errors.general = 'Duplicate user id.';
      if (Object.keys(errors).length > 0 || !isRole(op.input.role)) return fail(errors);
      return {
        ok: true,
        users: [...users, { id: op.id, name, email, role: op.input.role, active: true, demoPassword: op.input.password }],
      };
    }

    case 'update': {
      const target = users.find((u) => u.id === op.targetId);
      if (!target) return fail({ general: 'User not found.' });
      const p = op.patch;
      const errors: UserErrors = {};
      let { name, email, role, active } = target;

      if (p.name !== undefined) { name = p.name.trim(); if (!name) errors.name = 'Name is required.'; }
      if (p.email !== undefined) {
        const r = checkEmail(p.email, users, target.id);
        email = r.email; if (r.error) errors.email = r.error;
      }
      if (p.role !== undefined) { if (isRole(p.role)) role = p.role; else errors.role = 'Select a valid role.'; }
      if (p.active !== undefined) { if (typeof p.active === 'boolean') active = p.active; else errors.general = 'Invalid status.'; }
      if (Object.keys(errors).length > 0) return fail(errors);

      const next = users.map((u) => (u.id === target.id ? { ...u, name, email, role, active } : u));
      const g = managementGuard(next, actor.id);
      return g ? fail(g) : { ok: true, users: next };
    }

    case 'delete': {
      if (!users.some((u) => u.id === op.targetId)) return fail({ general: 'User not found.' });
      const next = users.filter((u) => u.id !== op.targetId); // movements are separate and untouched
      const g = managementGuard(next, actor.id);
      return g ? fail(g) : { ok: true, users: next };
    }

    case 'resetPassword': {
      const pe = passwordError(op.password);
      if (pe) return fail({ password: pe });
      if (!users.some((u) => u.id === op.targetId)) return fail({ general: 'User not found.' });
      return { ok: true, users: users.map((u) => (u.id === op.targetId ? { ...u, demoPassword: op.password } : u)) };
    }
  }
}