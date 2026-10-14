import { combineReducers, configureStore, type ThunkAction, type UnknownAction } from '@reduxjs/toolkit';
import authReducer, { loggedOut } from '../features/auth/authSlice';
import { selectCurrentUser } from '../features/auth/authSelectors';
import inventoryReducer, { persistenceChanged } from '../features/inventory/inventorySlice';
import usersReducer from '../features/users/usersSlice';
import { SEED_USERS } from '../features/users/usersUtils';
import { clearSession, loadSession, loadUsers, saveInventory, saveSession, saveUsers } from '../services/persistence';

const rootReducer = combineReducers({ auth: authReducer, users: usersReducer, inventory: inventoryReducer });

export function createAppStore(preloadedState?: Partial<ReturnType<typeof rootReducer>>) {
  return configureStore({ reducer: rootReducer, preloadedState });
}

export type AppStore = ReturnType<typeof createAppStore>;
export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = AppStore['dispatch'];
export type AppThunk<R = void> = ThunkAction<R, RootState, unknown, UnknownAction>;

/** Restores accounts (or seeds) and a session only if it points to an existing, active user. */
export function loadInitialState() {
  const users = loadUsers() ?? [...SEED_USERS];
  const id = loadSession();
  const userId = id && users.some((u) => u.id === id && u.active) ? id : null;
  return { users: { users }, auth: { userId, error: null } };
}

export const store = createAppStore(loadInitialState());

/** Single place where state is synchronised to localStorage. */
export function attachPersistence(s: AppStore): () => void {
  let prev = s.getState();
  let inventoryFailed = false;
  let usersFailed = false;
  const syncFlag = () => {
    const failed = inventoryFailed || usersFailed;
    if (s.getState().inventory.persistError !== failed) s.dispatch(persistenceChanged(failed));
  };

  return s.subscribe(() => {
    const cur = s.getState();
    const before = prev;
    prev = cur;

    const uid = selectCurrentUser(cur)?.id ?? null;
    const buid = selectCurrentUser(before)?.id ?? null;
    if (uid !== buid) {
      if (uid) saveSession(uid);
      else clearSession();
    }

    const inv = cur.inventory;
    if (inv.status === 'ready' && (inv.products !== before.inventory.products || inv.movements !== before.inventory.movements)) {
      inventoryFailed = !saveInventory(inv.products, inv.movements);
      syncFlag();
    }
    if (cur.users.users !== before.users.users) {
      usersFailed = !saveUsers(cur.users.users);
      syncFlag();
    }

    // Session user was deleted/deactivated: sign out (done last so the work above isn't skipped).
    if (cur.auth.userId && !selectCurrentUser(cur)) s.dispatch(loggedOut());
  });
}