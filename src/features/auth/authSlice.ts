import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AppThunk } from '../../app/store';
import { authenticate } from '../users/usersUtils';

export interface AuthState { userId: string | null; error: string | null }

const authSlice = createSlice({
  name: 'auth',
  initialState: { userId: null, error: null } as AuthState,
  reducers: {
    loginSucceeded(s, a: PayloadAction<string>) { s.userId = a.payload; s.error = null; },
    loginFailed(s, a: PayloadAction<string>) { s.error = a.payload; },
    loggedOut(s) { s.userId = null; s.error = null; },
  },
});
export const { loginSucceeded, loginFailed, loggedOut } = authSlice.actions;
export default authSlice.reducer;

export const login = (email: string, password: string): AppThunk<boolean> => (dispatch, getState) => {
  const user = authenticate(getState().users.users, email, password);
  if (!user) { dispatch(loginFailed('Invalid credentials, or the account is inactive.')); return false; }
  dispatch(loginSucceeded(user.id));
  return true;
};