import { render, screen, cleanup } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, afterEach } from 'vitest';
import { ADMIN, MANAGER, OWNER, makeStore } from '../test/helpers';
import type { SessionUser } from '../features/users/userTypes';
import { ProtectedRoute } from './ProtectedRoute';

afterEach(() => {
  cleanup();
});

function renderAt(user: SessionUser | null, path: string) {
  render(
    <Provider store={makeStore(user)}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<div>LOGIN PAGE</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<div>DASHBOARD</div>} />
            <Route element={<ProtectedRoute permission="movement:create" />}>
              <Route path="/movements/new" element={<div>MOVEMENT FORM</div>} />
            </Route>
            <Route element={<ProtectedRoute permission="users:view" />}>
              <Route path="/users" element={<div>USERS PAGE</div>} />
            </Route>
          </Route>
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

describe('route protection', () => {
  it.each(['/dashboard', '/movements/new', '/users'])('redirects unauthenticated users from %s', (p) => {
    renderAt(null, p);
    expect(screen.getByText('LOGIN PAGE')).toBeInTheDocument();
  });
  it('owner: denied stock form, allowed users list', () => {
    renderAt(OWNER, '/movements/new');
    expect(screen.getByRole('alert')).toHaveTextContent(/access denied/i);
  });
  it('owner can open /users', () => {
    renderAt(OWNER, '/users');
    expect(screen.getByText('USERS PAGE')).toBeInTheDocument();
  });
  it('admin_gudang: allowed stock form, denied /users', () => {
    renderAt(ADMIN, '/movements/new');
    expect(screen.getByText('MOVEMENT FORM')).toBeInTheDocument();
  });
  it('admin_gudang is denied /users', () => {
    renderAt(ADMIN, '/users');
    expect(screen.getByRole('alert')).toHaveTextContent(/access denied/i);
    expect(screen.queryByText('USERS PAGE')).not.toBeInTheDocument();
  });
  it('manager can open everything', () => {
    renderAt(MANAGER, '/users');
    expect(screen.getByText('USERS PAGE')).toBeInTheDocument();
  });
});