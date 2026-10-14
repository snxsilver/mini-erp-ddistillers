import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../../app/store';
import { inventoryValue, isLowStock, sortNewestFirst, totalUnits } from './inventoryUtils';

export const selectProducts = (s: RootState) => s.inventory.products;
export const selectMovements = (s: RootState) => s.inventory.movements;
export const selectInventoryStatus = (s: RootState) => s.inventory.status;
export const selectInventoryError = (s: RootState) => s.inventory.error;
export const selectPersistError = (s: RootState) => s.inventory.persistError;

export const selectProductById = (s: RootState, id: number) => s.inventory.products.find((p) => p.id === id);

export const selectCategories = createSelector([selectProducts], (p) =>
  [...new Set(p.map((x) => x.category))].sort());

export const selectLowStockProducts = createSelector([selectProducts], (p) =>
  p.filter((x) => isLowStock(x.currentStock)).sort((a, b) => a.currentStock - b.currentStock));

export const selectSortedMovements = createSelector([selectMovements], sortNewestFirst);
export const selectRecentMovements = createSelector([selectSortedMovements], (m) => m.slice(0, 5));

export const selectDashboardMetrics = createSelector(
  [selectProducts, selectLowStockProducts],
  (products, low) => ({
    totalSkus: products.length,
    totalUnits: totalUnits(products),
    lowStockCount: low.length,
    inventoryValue: inventoryValue(products),
  }),
);