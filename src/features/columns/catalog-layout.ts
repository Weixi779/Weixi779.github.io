// Created by weixi on 2026/11/18.

import type { Column, ColumnProminence } from './catalog';

export const DIRECTORY_THRESHOLD = 10;

interface ColumnRow {
  prominence: ColumnProminence;
  tracks: number;
  columns: Column[];
}

function rowCapacity(tier: ColumnProminence, remaining: number): number {
  if (tier === 'large') return remaining % 2 === 1 ? 1 : 2;
  // Four medium columns form two pairs. A single medium keeps its half-page size.
  if (tier === 'medium' && (remaining <= 2 || remaining === 4)) return 2;
  return 3;
}

export function arrangeColumnRows(columns: readonly Column[]): ColumnRow[] {
  const rows: ColumnRow[] = [];
  for (const prominence of ['large', 'medium', 'small'] as const) {
    const group = columns.filter(column => column.prominence === prominence);
    for (let start = 0; start < group.length;) {
      const tracks = rowCapacity(prominence, group.length - start);
      rows.push({ prominence, tracks, columns: group.slice(start, start + tracks) });
      start += tracks;
    }
  }
  return rows;
}
