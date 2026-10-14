import { createAsyncThunk, createSlice, current, type PayloadAction } from '@reduxjs/toolkit';
import type { Movement, MovementInput, Product } from './inventoryTypes';
import {
  mapDummyProduct, newMovementId, recordMovement, resetInventory,
  type MovementContext, type MovementResult,
} from './inventoryUtils';
import { fetchProducts } from '../../services/dummyJsonApi';
import { loadInventory } from '../../services/persistence';
import { hasPermission } from '../auth/authUtils';
import type { AppThunk, RootState } from '../../app/store';
import { selectCurrentUser } from '../auth/authSelectors';

export interface InventoryState {
  products: Product[];
  movements: Movement[]; // newest first
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  persistError: boolean;
}
export const inventoryInitialState: InventoryState = {
  products: [], movements: [], status: 'idle', error: null, persistError: false,
};

/** Uses stored data if valid; fetches from the API only when no valid dataset exists. */
export const initializeInventory = createAsyncThunk<
  { products: Product[]; movements: Movement[] },
  void,
  { state: RootState; rejectValue: string }
>(
  'inventory/initialize',
  async (_, { rejectWithValue }) => {
    const stored = loadInventory();
    if (stored) return stored;
    try {
      const raw = await fetchProducts();
      return { products: raw.map((p) => mapDummyProduct(p)), movements: [] };
    } catch (e) {
      return rejectWithValue(e instanceof Error ? e.message : 'Failed to load catalog.');
    }
  },
  { condition: (_, { getState }) => !['loading', 'ready'].includes(getState().inventory.status) },
);

const inventorySlice = createSlice({
  name: 'inventory',
  initialState: inventoryInitialState,
  reducers: {
    /** Stock change + history entry are committed together, or not at all. */
    movementCommitted: {
      reducer(state, action: PayloadAction<{ input: MovementInput; ctx: MovementContext }>) {
        const result = recordMovement(current(state.products), action.payload.input, action.payload.ctx);
        if (!result.ok) return; // defence in depth: invalid input changes nothing
        state.products = result.products;
        state.movements.unshift(result.movement);
      },
      prepare: (input: MovementInput, ctx: MovementContext) => ({ payload: { input, ctx } }),
    },
    inventoryReset(state) {
      state.products = resetInventory(current(state.products));
      state.movements = [];
    },
    persistenceChanged(state, action: PayloadAction<boolean>) { state.persistError = action.payload; },
  },
  extraReducers: (b) => {
    b.addCase(initializeInventory.pending, (s) => { s.status = 'loading'; s.error = null; });
    b.addCase(initializeInventory.fulfilled, (s, a) => {
      s.products = a.payload.products; s.movements = a.payload.movements; s.status = 'ready';
    });
    b.addCase(initializeInventory.rejected, (s, a) => {
      s.status = 'error'; s.error = a.payload ?? a.error.message ?? 'Failed to load catalog.';
    });
  },
});
export const { movementCommitted, inventoryReset, persistenceChanged } = inventorySlice.actions;
export default inventorySlice.reducer;

export const submitMovement = (input: MovementInput): AppThunk<MovementResult> => (dispatch, getState) => {
  const user = selectCurrentUser(getState());
  if (!user || !hasPermission(user.role, 'movement:create')) {
    return { ok: false, errors: { general: 'You are not authorized to record stock movements.' } };
  }
  const ctx: MovementContext = {
    id: newMovementId(),
    timestamp: new Date().toISOString(),
    user: { id: user.id, name: user.name }, // ID + display-name snapshot, kept even if the user is later deleted
  };
  const result = recordMovement(getState().inventory.products, input, ctx);
  if (result.ok) dispatch(movementCommitted(input, ctx));
  return result;
};

/** Touches inventory only; user accounts and the session are preserved. */
export const resetDemoData = (): AppThunk<boolean> => (dispatch, getState) => {
  if (!hasPermission(selectCurrentUser(getState())?.role, 'inventory:reset')) return false;
  dispatch(inventoryReset());
  return true;
};