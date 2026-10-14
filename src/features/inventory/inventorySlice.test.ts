import { describe, expect, it } from 'vitest';
import { ADMIN, OWNER, makeProduct, makeStore, MANAGER } from '../../test/helpers';
import { resetDemoData, submitMovement } from './inventorySlice';
import { selectDashboardMetrics } from './inventorySelectors';
import { expectedStock, findInvariantViolations } from './inventoryUtils';

const valid = { productId: 1, type: 'OUT' as const, quantity: '4', description: 'SO-1' };

describe('inventory store', () => {
  it('commits stock and history together for admin', () => {
    const store = makeStore(ADMIN);
    expect(store.dispatch(submitMovement(valid)).ok).toBe(true);
    const { products, movements } = store.getState().inventory;
    expect(products[0].currentStock).toBe(6);
    expect(movements).toHaveLength(1);
    expect(movements[0]).toMatchObject({ stockBefore: 10, stockAfter: 6, userId: ADMIN.id, userName: ADMIN.name });
    expect(products[0].currentStock).toBe(expectedStock(10, movements));
  });
  it('leaves state untouched on invalid transaction', () => {
    const store = makeStore(ADMIN);
    const before = store.getState().inventory;
    expect(store.dispatch(submitMovement({ ...valid, quantity: '11' })).ok).toBe(false);
    expect(store.dispatch(submitMovement({ ...valid, quantity: '1.5' })).ok).toBe(false);
    expect(store.getState().inventory).toBe(before);
  });
  it('owner cannot record movements', () => {
    const store = makeStore(OWNER);
    const r = store.dispatch(submitMovement({ ...valid, type: 'IN' }));
    expect(r.ok).toBe(false);
    expect(store.getState().inventory.movements).toHaveLength(0);
    expect(store.getState().inventory.products[0].currentStock).toBe(10);
  });
  it('unauthenticated user cannot record movements', () => {
    expect(makeStore(null).dispatch(submitMovement(valid)).ok).toBe(false);
  });
  it('dashboard metrics update after a movement', () => {
    const store = makeStore(ADMIN, [
      makeProduct({
        currentStock: 10,
        openingStock: 10,
        priceIdr: 1000,
      }),
    ]);

    store.dispatch(submitMovement({ ...valid, quantity: '6' }));

    expect(selectDashboardMetrics(store.getState())).toMatchObject({
      totalUnits: 4,
      lowStockCount: 1,
      inventoryValue: 4000,
    });
  });

  it('manager can reset demo data and restore initial metrics', () => {
    const store = makeStore(MANAGER, [
      makeProduct({
        currentStock: 10,
        openingStock: 10,
        priceIdr: 1000,
      }),
    ]);

    const initial = selectDashboardMetrics(store.getState());

    store.dispatch(submitMovement({ ...valid, quantity: '6' }));

    expect(store.dispatch(resetDemoData())).toBe(true);
    expect(selectDashboardMetrics(store.getState())).toEqual(initial);
    expect(store.getState().inventory.movements).toEqual([]);
    expect(
      findInvariantViolations(store.getState().inventory.products, []),
    ).toEqual([]);
  });


  it('owner cannot reset demo data', () => {
    const store = makeStore(OWNER, [makeProduct({ currentStock: 3, openingStock: 10 })]);
    expect(store.dispatch(resetDemoData())).toBe(false);
    expect(store.getState().inventory.products[0].currentStock).toBe(3);
  });
  it('low stock is strictly below 5', () => {
    const store = makeStore(ADMIN, [makeProduct({ id: 1, currentStock: 5, openingStock: 5 }), makeProduct({ id: 2, sku: 'SKU-0002', currentStock: 4, openingStock: 4 })]);
    expect(selectDashboardMetrics(store.getState()).lowStockCount).toBe(1);
  });
});