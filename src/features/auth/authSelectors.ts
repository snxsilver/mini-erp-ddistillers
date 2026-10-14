import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../../app/store';
import type { SessionUser } from '../users/userTypes';
import { hasPermission, type Permission } from './authUtils';

/** Derived from the live users list, so role/status changes and deletions apply immediately. */
export const selectCurrentUser = createSelector(
  [(s: RootState) => s.users.users, (s: RootState) => s.auth.userId],
  (users, id): SessionUser | null => {
    const u = id ? users.find((x) => x.id === id) : undefined;
    return u && u.active ? { id: u.id, name: u.name, email: u.email, role: u.role, active: u.active } : null;
  },
);
export const selectAuthError = (s: RootState) => s.auth.error;
export const selectCan = (p: Permission) => (s: RootState) => hasPermission(selectCurrentUser(s)?.role, p);