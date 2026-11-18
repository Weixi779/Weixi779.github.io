// Created by weixi on 2026/11/18.

import { expect, it } from 'vitest';
import type { Column, ColumnProminence } from '../../src/features/columns/catalog';
import { arrangeColumnRows } from '../../src/features/columns/catalog-layout';

function tier(prominence: ColumnProminence, size: number): Column[] {
  return Array.from({ length: size }, (_, i) => ({
    slug: `${prominence}-${i}`, title: '专栏', intro: '简介', prominence, articles: [],
  }));
}

it.each([
  [0, 0, 0, []],
  [2, 3, 0, [2, 3]],
  [1, 2, 3, [1, 2, 3]],
  [2, 3, 5, [2, 3, 3, 2]],
  [3, 6, 11, [1, 2, 3, 3, 3, 3, 3, 2]],
  [4, 8, 18, [2, 2, 3, 3, 2, 3, 3, 3, 3, 3, 3]],
] as const)('lays out %i large / %i medium / %i small in stable editorial order', (l, m, s, lengths) => {
  const large = tier('large', l), medium = tier('medium', m), small = tier('small', s);
  const rows = arrangeColumnRows([...small, ...medium, ...large]);
  expect(rows.map(row => row.columns.length)).toEqual(lengths);
  expect(rows.flatMap(row => row.columns)).toEqual([...large, ...medium, ...small]);
});

it('keeps a lone medium at half width and splits the last four into pairs', () => {
  expect(arrangeColumnRows(tier('medium', 1))[0].tracks).toBe(2);
  expect(arrangeColumnRows(tier('medium', 7)).map(row => row.tracks)).toEqual([3, 2, 2]);
});

it('keeps all sixty columns in their assigned tier when the collection grows', () => {
  const columns = [...tier('large', 10), ...tier('medium', 20), ...tier('small', 30)];
  const rows = arrangeColumnRows(columns);
  expect(rows.flatMap(row => row.columns)).toEqual(columns);
  expect(rows.every(row => row.columns.every(column => column.prominence === row.prominence))).toBe(true);
});
