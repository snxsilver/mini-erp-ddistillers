import { useState, type FormEvent, type ReactNode } from 'react';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { selectCan, selectCurrentUser } from '../features/auth/authSelectors';
import { ROLES, roleLabel } from '../features/auth/authUtils';
import type { Role, UserAccount } from '../features/users/userTypes';
import { createUser, deleteUser, resetUserPassword, updateUser } from '../features/users/usersSlice';
import { selectUsers } from '../features/users/usersSelectors';
import type { UserErrors, UserResult } from '../features/users/usersUtils';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { btnPrimary, btnSecondary, inputCls } from '../components/ui/common';
import { useToast } from '../components/ui/Toast';

type DialogState =
  | { kind: 'create' }
  | { kind: 'edit'; user: UserAccount }
  | { kind: 'password'; user: UserAccount }
  | { kind: 'delete'; user: UserAccount }
  | null;

const firstError = (e: UserErrors) => e.general ?? Object.values(e)[0] ?? 'Operation failed.';

function Modal({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
      <div role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-md rounded-lg bg-white p-5 shadow-lg">
        <h2 className="mb-3 font-semibold text-slate-900">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">{label}</label>
      {children}
      {error && <p role="alert" className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function UserFormDialog({ user, isSelf, onClose }: { user?: UserAccount; isSelf: boolean; onClose: () => void }) {
  const dispatch = useAppDispatch();
  const toast = useToast();
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [role, setRole] = useState<Role>(user?.role ?? 'admin_gudang');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<UserErrors>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const r = user
      ? dispatch(updateUser(user.id, { name, email, role }))
      : dispatch(createUser({ name, email, role, password }));
    if (!r.ok) { setErrors(r.errors); return; }
    toast(user ? 'User updated.' : 'User created.');
    onClose();
  };

  return (
    <Modal title={user ? 'Edit user' : 'Add user'}>
      <form onSubmit={submit} noValidate className="space-y-3">
        {errors.general && <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-700">{errors.general}</p>}
        <Field id="u-name" label="Name" error={errors.name}>
          <input id="u-name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field id="u-email" label="Email" error={errors.email}>
          <input id="u-email" type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field id="u-role" label="Role" error={errors.role}>
          <select id="u-role" className={inputCls} value={role} disabled={isSelf} onChange={(e) => setRole(e.target.value as Role)}>
            {ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
          </select>
          {isSelf && <p className="mt-1 text-xs text-slate-500">You cannot change your own role.</p>}
        </Field>
        {!user && (
          <Field id="u-pass" label="Demo password" error={errors.password}>
            <input id="u-pass" type="password" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          </Field>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className={btnSecondary} onClick={onClose}>Cancel</button>
          <button type="submit" className={btnPrimary}>{user ? 'Save' : 'Create'}</button>
        </div>
      </form>
    </Modal>
  );
}

function PasswordDialog({ user, onClose }: { user: UserAccount; onClose: () => void }) {
  const dispatch = useAppDispatch();
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<UserErrors>({});
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const r = dispatch(resetUserPassword(user.id, password));
    if (!r.ok) { setErrors(r.errors); return; }
    toast(`Demo password reset for ${user.name}.`);
    onClose();
  };
  return (
    <Modal title={`Reset password — ${user.name}`}>
      <form onSubmit={submit} noValidate className="space-y-3">
        {errors.general && <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-700">{errors.general}</p>}
        <Field id="np" label="New demo password" error={errors.password}>
          <input id="np" type="password" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </Field>
        <div className="flex justify-end gap-2">
          <button type="button" className={btnSecondary} onClick={onClose}>Cancel</button>
          <button type="submit" className={btnPrimary}>Reset password</button>
        </div>
      </form>
    </Modal>
  );
}

export default function UsersPage() {
  const dispatch = useAppDispatch();
  const toast = useToast();
  const users = useAppSelector(selectUsers);
  const me = useAppSelector(selectCurrentUser);
  const canManage = useAppSelector(selectCan('users:manage'));
  const [dialog, setDialog] = useState<DialogState>(null);
  const close = () => setDialog(null);

  const report = (r: UserResult, okMsg: string) =>
    r.ok ? toast(okMsg) : toast(firstError(r.errors), 'error');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {canManage
          ? <button className={btnPrimary} onClick={() => setDialog({ kind: 'create' })}>Add user</button>
          : <p className="text-sm text-slate-500">Read-only view.</p>}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              {['Name', 'Email', 'Role', 'Status'].map((h) => <th key={h} scope="col" className="px-3 py-2 font-medium">{h}</th>)}
              {canManage && <th scope="col" className="px-3 py-2 font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => {
              const self = u.id === me?.id;
              return (
                <tr key={u.id}>
                  <td className="px-3 py-2">{u.name}{self && <span className="ml-2 text-xs text-slate-400">(you)</span>}</td>
                  <td className="px-3 py-2">{u.email}</td>
                  <td className="px-3 py-2">{roleLabel(u.role)}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                      {u.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  {canManage && (
                    <td className="space-x-2 whitespace-nowrap px-3 py-2">
                      <button className={`${btnSecondary} !px-2 !py-1`} aria-label={`Edit ${u.name}`} onClick={() => setDialog({ kind: 'edit', user: u })}>Edit</button>
                      <button className={`${btnSecondary} !px-2 !py-1`} aria-label={`${u.active ? 'Deactivate' : 'Activate'} ${u.name}`} disabled={self}
                        title={self ? 'You cannot deactivate yourself' : undefined}
                        onClick={() => report(dispatch(updateUser(u.id, { active: !u.active })), `${u.name} ${u.active ? 'deactivated' : 'activated'}.`)}>
                        {u.active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button className={`${btnSecondary} !px-2 !py-1`} aria-label={`Reset password for ${u.name}`} onClick={() => setDialog({ kind: 'password', user: u })}>Reset password</button>
                      <button className={`${btnSecondary} !px-2 !py-1`} aria-label={`Delete ${u.name}`} disabled={self}
                        title={self ? 'You cannot delete yourself' : undefined}
                        onClick={() => setDialog({ kind: 'delete', user: u })}>Delete</button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {canManage && dialog?.kind === 'create' && <UserFormDialog isSelf={false} onClose={close} />}
      {canManage && dialog?.kind === 'edit' && <UserFormDialog user={dialog.user} isSelf={dialog.user.id === me?.id} onClose={close} />}
      {canManage && dialog?.kind === 'password' && <PasswordDialog user={dialog.user} onClose={close} />}
      {canManage && dialog?.kind === 'delete' && (
        <ConfirmDialog title="Delete user?" confirmLabel="Delete"
          message={`Delete ${dialog.user.name}? Their past stock movements are kept with the original name and ID.`}
          onCancel={close}
          onConfirm={() => {
            const target = dialog.user;
            close();
            report(dispatch(deleteUser(target.id)), `${target.name} deleted. Movement history was kept.`);
          }} />
      )}
    </div>
  );
}