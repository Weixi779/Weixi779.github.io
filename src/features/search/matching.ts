// Created by weixi on 2026/11/26.

import { normalizeArchiveSearch } from '../archive/archive';

export function searchQuery(input: string) {
  const phrase = normalizeArchiveSearch(input).replace(/\s+/gu, ' ');
  return { phrase, words: phrase ? [...new Set(phrase.split(' '))] : [] };
}

// Return offsets in the original writing, including full-width punctuation and ligatures.
export function matchRanges(text: string, query: string): [number, number][] {
  const { phrase, words } = searchQuery(query);
  if (!phrase) return [];
  const normalized = text.normalize('NFKC').toLowerCase().replace(/\s+/gu, ' ');
  const matches: [number, number][] = [];
  for (const needle of new Set([phrase, ...words])) {
    for (let i = normalized.indexOf(needle); i >= 0; i = normalized.indexOf(needle, i + needle.length)) {
      matches.push([i, i + needle.length]);
    }
  }
  const ranges: [number, number][] = [];
  for (const match of matches.sort((a, b) => a[0] - b[0])) {
    const previous = ranges.at(-1);
    if (previous && match[0] < previous[1]) previous[1] = Math.max(previous[1], match[1]);
    else ranges.push(match);
  }
  if (!ranges.length || (normalized.length === text.length && normalized === text.toLowerCase())) return ranges;

  // Only map offsets when normalization actually changes the original text.
  const offsets: [number, number][] = [];
  let space = false;
  for (const { segment, index } of new Intl.Segmenter().segment(text)) {
    for (const unit of segment.normalize('NFKC').toLowerCase().split('')) {
      const whitespace = /\s/u.test(unit);
      if (whitespace && space) offsets[offsets.length - 1][1] = index + segment.length;
      else offsets.push([index, index + segment.length]);
      space = whitespace;
    }
  }
  const original: [number, number][] = [];
  for (const [from, to] of ranges) {
    const start = offsets[from][0];
    const end = offsets[to - 1][1];
    const previous = original.at(-1);
    if (previous && start < previous[1]) previous[1] = end;
    else original.push([start, end]);
  }
  return original;
}
