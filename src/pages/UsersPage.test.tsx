import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { describe, expect, it } from 'vitest';
import { MANAGER, OWNER, makeStore } from '../test/helpers';
import UsersPage from './UsersPage';

describe('UsersPage', () => {
  it('owner sees the list but no modification controls', () => {
    render(<Provider store={makeStore(OWNER)}><UsersPage /></Provider>);
    expect(screen.getByText('admin@demo.local')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
  it('manager sees management controls', () => {
    render(<Provider store={makeStore(MANAGER)}><UsersPage /></Provider>);
    expect(screen.getByRole('button', { name: 'Add user' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit Admin Gudang' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete Manager' })).toBeDisabled(); // self
  });
});