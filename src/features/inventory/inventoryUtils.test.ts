import { describe, expect, it } from 'vitest';
import { makeProduct } from '../../test/helpers';
import { formatIdr } from '../../utils/formatters';
import type { Movement, MovementInput } from './inventoryTypes';
import {
  EMPTY_FILTERS, expectedStock, filterMovements, generateSku, inventoryValue, mapDummyProduct,
  parseQuantity, recordMovement, resetInventory, sortNewestFirst, type MovementContext,
} from './inventoryUtils';

const ctx = (n = 1): MovementContext => ({ id: `M${n}`, timestamp: `2026-01-0${n}T10:00:00.000Z`, user: { id: 'u', name: 'U' } });
const input = (o: Partial<MovementInput> = {}): MovementInput => ({ productId: 1, type: 'IN', quantity: 5, description: 'PO-1', ...o });

describe('SKU', () => {
  it('is deterministic', () => expect(generateSku(7)).toBe(generateSku(7)));
  it('is unique per id', () => {
    const skus = Array.from({ length: 100 }, (_, i) => generateSku(i + 1));
    expect(new Set(skus).size).toBe(100);
  });
  it('has the right format', () => {
    expect(generateSku(1)).toBe('SKU-0001');
    expect(generateSku(100)).toBe('SKU-0100');
  });
  it('rejects invalid ids', () => expect(() => generateSku(0)).toThrow());
});

describe('mapDummyProduct', () => {
  it('converts USD to IDR with the given rate and sets deterministic stock', () => {
    const p = mapDummyProduct({ id: 3, title: 'X', category: 'c', price: 2.5 }, 16000);
    expect(p.priceIdr).toBe(40000);
    expect(p.currentStock).toBe(p.openingStock);
    expect(Number.isInteger(p.openingStock) && p.openingStock >= 0).toBe(true);
    expect(mapDummyProduct({ id: 3, title: 'X', category: 'c', price: 2.5 }).openingStock).toBe(p.openingStock);
  });
});

describe('parseQuantity', () => {
  it('accepts positive integers', () => {
    expect(parseQuantity(5)).toEqual({ ok: true, value: 5 });
    expect(parseQuantity(' 12 ')).toEqual({ ok: true, value: 12 });
  });
  it.each([0, '0', -3, '-3', 1.5, '1.5', '', '   ', 'abc', '1e3', null, undefined, NaN, Infinity, {}, '5 apples'])(
    'rejects %p', (v) => expect(parseQuantity(v).ok).toBe(false));
});

describe('stock boundaries', () => {
  const products = [makeProduct({ currentStock: 10, openingStock: 10 })];
  it('stock-in increases stock', () => {
    const r = recordMovement(products, input({ type: 'IN', quantity: 5 }), ctx());
    expect(r.ok && r.products[0].currentStock).toBe(15);
  });
  it('stock-out decreases stock', () => {
    const r = recordMovement(products, input({ type: 'OUT', quantity: 4 }), ctx());
    expect(r.ok && r.products[0].currentStock).toBe(6);
  });
  it('stock-out equal to available succeeds and reaches zero', () => {
    const r = recordMovement(products, input({ type: 'OUT', quantity: 10 }), ctx());
    expect(r.ok && r.products[0].currentStock).toBe(0);
  });
  it('stock-out exceeding available fails', () => {
    const r = recordMovement(products, input({ type: 'OUT', quantity: 11 }), ctx());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.quantity).toMatch(/Insufficient/);
  });
  it('stock-out from zero fails', () => {
    const r = recordMovement([makeProduct({ currentStock: 0 })], input({ type: 'OUT', quantity: 1 }), ctx());
    expect(r.ok).toBe(false);
  });
});

describe('state consistency', () => {
  it('success returns new stock and a movement with correct before/after, user and description', () => {
    const products = [makeProduct()];
    const r = recordMovement(products, input({ type: 'OUT', quantity: 3, description: '  SO-9  ' }), ctx());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.movement).toMatchObject({ stockBefore: 10, stockAfter: 7, quantity: 3, type: 'OUT', userId: 'u', userName: 'U', description: 'SO-9', sku: 'SKU-0001' });
      expect(r.products[0].currentStock).toBe(7);
    }
    expect(products[0].currentStock).toBe(10); // input not mutated
  });
  it.each([
    ['zero qty', { quantity: 0 }], ['decimal', { quantity: 1.5 }], ['missing product', { productId: null }],
    ['blank description', { description: '   ' }], ['unknown product', { productId: 999 }],
  ])('invalid (%s) yields errors and no state', (_n, o) => {
    const r = recordMovement([makeProduct()], input(o as Partial<MovementInput>), ctx());
    expect(r.ok).toBe(false);
    expect('products' in r).toBe(false);
  });
  it('multiple sequential transactions preserve the invariant', () => {
    let products = [makeProduct({ currentStock: 8, openingStock: 8 })];
    const history: Movement[] = [];
    const steps: [MovementInput['type'], number][] = [['IN', 10], ['OUT', 5], ['OUT', 13], ['IN', 1], ['OUT', 99], ['OUT', 1]];
    steps.forEach(([type, q], i) => {
      const r = recordMovement(products, input({ type, quantity: q }), ctx(i + 1));
      if (r.ok) { products = r.products; history.push(r.movement); }
      expect(products[0].currentStock).toBe(expectedStock(8, history));
      expect(products[0].currentStock).toBeGreaterThanOrEqual(0);
    });
    expect(history).toHaveLength(5); // the OUT 99 was rejected
    expect(products[0].currentStock).toBe(0); // 8+10-5-13+1-1
  });
});

describe('valuation', () => {
  it('sums stock × price', () => {
    expect(inventoryValue([makeProduct({ currentStock: 2, priceIdr: 1000 }), makeProduct({ id: 2, currentStock: 3, priceIdr: 500 })])).toBe(3500);
  });
  it('is zero for empty inventory and for zero-stock products', () => {
    expect(inventoryValue([])).toBe(0);
    expect(inventoryValue([makeProduct({ currentStock: 0, priceIdr: 99999 })])).toBe(0);
  });
  it('formats IDR in id-ID locale', () => {
    expect(formatIdr(1500000).replace(/\s/g, ' ')).toBe('Rp 1.500.000');
  });
});

describe('reset and filters', () => {
  it('resetInventory restores opening stock', () => {
    expect(resetInventory([makeProduct({ currentStock: 1, openingStock: 9 })])[0].currentStock).toBe(9);
  });
  const mk = (id: string, sku: string, type: 'IN' | 'OUT', ts: string): Movement => ({
    id, timestamp: ts, productId: 1, sku, productName: 'Widget', type, quantity: 1, stockBefore: 1, stockAfter: 2,
    userId: 'u', userName: 'U', description: 'd',
  });
  const data = [mk('a', 'SKU-0001', 'IN', '2026-03-01T12:00:00'), mk('b', 'SKU-0002', 'OUT', '2026-03-05T12:00:00'), mk('c', 'SKU-0001', 'OUT', '2026-03-10T12:00:00')];
  it('combines filters', () => {
    const r = filterMovements(data, { ...EMPTY_FILTERS, query: 'sku-0001', type: 'OUT', from: '2026-03-02', to: '2026-03-31' });
    expect(r.map((m) => m.id)).toEqual(['c']);
  });
  it('end date is inclusive', () => {
    expect(filterMovements(data, { ...EMPTY_FILTERS, to: '2026-03-05' }).map((m) => m.id)).toEqual(['a', 'b']);
  });
  it('sorts newest first', () => expect(sortNewestFirst(data).map((m) => m.id)).toEqual(['c', 'b', 'a']));
});