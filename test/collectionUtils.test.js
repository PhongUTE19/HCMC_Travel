import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePagination,
  paginateItems,
  filterItems,
  sortItems,
  getNextSortDirection,
  getNestedValue,
} from '../client/src/utils/collectionUtils.js';

describe('Collection Utilities Suite', () => {
  describe('calculatePagination', () => {
    it('calculates correct metrics for standard pagination', () => {
      const res = calculatePagination({ total: 45, page: 2, limit: 10 });
      assert.strictEqual(res.page, 2);
      assert.strictEqual(res.limit, 10);
      assert.strictEqual(res.offset, 10);
      assert.strictEqual(res.total, 45);
      assert.strictEqual(res.totalPages, 5);
      assert.strictEqual(res.fromIndex, 11);
      assert.strictEqual(res.toIndex, 20);
      assert.strictEqual(res.hasPrev, true);
      assert.strictEqual(res.hasNext, true);
    });

    it('handles zero total items gracefully', () => {
      const res = calculatePagination({ total: 0, page: 1, limit: 10 });
      assert.strictEqual(res.page, 1);
      assert.strictEqual(res.total, 0);
      assert.strictEqual(res.totalPages, 1);
      assert.strictEqual(res.fromIndex, 0);
      assert.strictEqual(res.toIndex, 0);
      assert.strictEqual(res.hasPrev, false);
      assert.strictEqual(res.hasNext, false);
    });
  });

  describe('paginateItems', () => {
    const sample = ['a', 'b', 'c', 'd', 'e'];
    it('slices items for the requested page and limit', () => {
      assert.deepStrictEqual(paginateItems(sample, 1, 2), ['a', 'b']);
      assert.deepStrictEqual(paginateItems(sample, 2, 2), ['c', 'd']);
      assert.deepStrictEqual(paginateItems(sample, 3, 2), ['e']);
    });
  });

  describe('filterItems', () => {
    const items = [
      { id: 1, name: 'Handbook', category: 'Rules' },
      { id: 2, name: 'Fees', category: 'Finance' },
    ];
    it('filters across specified search fields', () => {
      const res = filterItems(items, 'rules', ['category']);
      assert.strictEqual(res.length, 1);
      assert.strictEqual(res[0].id, 1);
    });
  });

  describe('sortItems', () => {
    const items = [
      { id: 1, name: 'Gamma', count: 10 },
      { id: 2, name: 'Alpha', count: 30 },
      { id: 3, name: 'Beta', count: 20 },
    ];

    it('sorts strings ascending and descending', () => {
      const asc = sortItems(items, 'name', 'asc');
      assert.deepStrictEqual(asc.map((x) => x.name), ['Alpha', 'Beta', 'Gamma']);

      const desc = sortItems(items, 'name', 'desc');
      assert.deepStrictEqual(desc.map((x) => x.name), ['Gamma', 'Beta', 'Alpha']);
    });

    it('sorts numbers ascending and descending', () => {
      const asc = sortItems(items, 'count', 'asc');
      assert.deepStrictEqual(asc.map((x) => x.count), [10, 20, 30]);

      const desc = sortItems(items, 'count', 'desc');
      assert.deepStrictEqual(desc.map((x) => x.count), [30, 20, 10]);
    });
  });

  describe('getNextSortDirection', () => {
    it('cycles from none to asc to desc to null', () => {
      assert.strictEqual(getNextSortDirection(null), 'asc');
      assert.strictEqual(getNextSortDirection('asc'), 'desc');
      assert.strictEqual(getNextSortDirection('desc'), null);
    });
  });

  describe('getNestedValue', () => {
    it('resolves nested property paths', () => {
      const obj = { meta: { score: 95 } };
      assert.strictEqual(getNestedValue(obj, 'meta.score'), 95);
      assert.strictEqual(getNestedValue(obj, 'meta.unknown'), undefined);
    });
  });
});
