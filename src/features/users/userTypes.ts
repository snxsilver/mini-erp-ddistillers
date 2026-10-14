export type Role = 'admin_gudang' | 'manager' | 'owner';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  /** Demo-only plaintext password. NOT secure; see README. */
  demoPassword: string;
}

export type SessionUser = Omit<UserAccount, 'demoPassword'>;