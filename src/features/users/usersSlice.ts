import { createSlice, current, type PayloadAction } from '@reduxjs/toolkit';
import type { AppThunk } from '../../app/store';
import { selectCurrentUser } from '../auth/authSelectors';
// import {
//   SEED_USERS, applyUserOperation, newUserId,
//   type NewUserInput, type UserOperation, type UserPatch, type UserResult,
// } from './usersUtils';
import { SEED_USERS, applyUserOperation, newUserId, type NewUserInput, type UserOperation, type UserPatch, type UserResult } from './usersUtils';
import type { UserAccount } from './userTypes';

export interface UsersState { users: UserAccount[] }
export const usersInitialState: UsersState = { users: [...SEED_USERS] };

const usersSlice = createSlice({
  name: 'users',
  initialState: usersInitialState,
  reducers: {
    /** Re-runs the pure, authorization-aware logic: an unauthorized or invalid payload is a no-op. */
    operationApplied(state, action: PayloadAction<UserOperation>) {
      const r = applyUserOperation(current(state.users), action.payload);
      if (r.ok) state.users = r.users;
    },
  },
});
export const { operationApplied } = usersSlice.actions;
export default usersSlice.reducer;

/** The actor is always the signed-in user from state; UI code cannot supply one. */
function run(build: (actorId: string) => UserOperation): AppThunk<UserResult> {
  return (dispatch, getState) => {
    const actor = selectCurrentUser(getState());
    if (!actor) return { ok: false, errors: { general: 'You must be signed in.' } };
    const op = build(actor.id);
    const result = applyUserOperation(getState().users.users, op);
    if (result.ok) dispatch(operationApplied(op));
    return result;
  };
}

export const createUser = (input: NewUserInput) =>
  run((actorId) => ({ kind: 'create', actorId, id: newUserId(), input }));
export const updateUser = (targetId: string, patch: UserPatch) =>
  run((actorId) => ({ kind: 'update', actorId, targetId, patch }));
export const deleteUser = (targetId: string) => run((actorId) => ({ kind: 'delete', actorId, targetId }));
export const resetUserPassword = (targetId: string, password: string) =>
  run((actorId) => ({ kind: 'resetPassword', actorId, targetId, password }));