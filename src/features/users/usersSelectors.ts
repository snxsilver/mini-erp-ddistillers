import type { RootState } from '../../app/store';
export const selectUsers = (s: RootState) => s.users.users;