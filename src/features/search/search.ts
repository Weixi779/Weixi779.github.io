// Created by weixi on 2026/11/26.

import { normalizeArchiveSearch as fold } from '../archive/archive';

import { passageFragment } from './passages';
import { matchRanges, searchQuery } from './matching';

export type Scope = 'all' | 'article' | 'column';

export interface SearchEntry {
  kind: Exclude<Scope, 'all'>;
  href: string;
  title: string;
  summary: string;
  detail: string;
  terms: string[];
  passages?: { text: string; kind?: 'heading' | 'code' }[];
}

export function prepareSearch(entries: SearchEntry[]) {
  return entries.map(entry => {
    const column = entry.kind === 'column';
    const fields = [
      { text: entry.title, weight: 90 },
      { text: entry.summary, weight: column ? 80 : 65 },
      ...entry.terms.map(text => ({ text, weight: column ? 75 : 60 })),
      ...(entry.passages ?? []).map((p, at) => ({ text: p.text, weight: p.kind === 'code' ? 25 : 40, at })),
    ].map((field: { text: string; weight: number; at?: number }) => ({
      ...field, folded: fold(field.text).replace(/\s+/gu, ' '),
    }));
    return { entry, fields };
  });
}

export interface SearchHit {
  entry: SearchEntry;
  href: string;
  snippet: string;
  section?: string;
}

export function excerpt(text: string, query: string) {
  const found = matchRanges(text, query)[0];
  const offset = Math.max(0, (found?.[0] ?? 0) - 18);
  const end = Math.max(offset + 86, (found?.[1] ?? 0) + 20);
  return (offset ? '…' : '') + text.slice(offset, end) + (end < text.length ? '…' : '');
}

export function findResults(index: ReturnType<typeof prepareSearch>, input: string, scope: Scope, recent: string[]): SearchHit[] {
  const { phrase, words } = searchQuery(input);
  const candidates = index.filter(({ entry }) => scope === 'all' || entry.kind === scope);
  if (!words.length) {
    const opened = recent.flatMap(href => candidates.filter(({ entry }) => entry.href === href));
    const suggestions = opened.length ? opened : candidates.filter(({ entry }) => entry.kind === (scope === 'column' ? 'column' : 'article')).slice(0, 5);
    return suggestions.map(({ entry }) => ({ entry, href: entry.href, snippet: excerpt(entry.summary, '') }));
  }

  const hits = [];
  for (const { entry, fields } of candidates) {
    const seen = new Set<string>();
    const metadata = new Set<string>();
    const matches = fields.flatMap(field => {
      const matched = words.filter(word => field.folded.includes(word));
      if (!matched.length) return [];
      for (const word of matched) {
        seen.add(word);
        if (field.at === undefined) metadata.add(word);
      }
      // Within equal coverage, prefer a continuous phrase, then the more prominent field.
      const rank = (field.folded.includes(phrase) ? 100 : 0) + field.weight
        + (field === fields[0] && field.folded === phrase ? 10 : 0);
      return [{ field, matched, rank }];
    });
    if (seen.size !== words.length) continue;
    matches.sort((a, b) => b.matched.length - a.matched.length || b.rank - a.rank);
    const strongest = matches[0];
    // If metadata alone cannot answer the query, open the passage supplying the missing word.
    const best = (matches.find(m => m.matched.some(word => !metadata.has(word))) ?? strongest).field;
    const at = best.at;
    const passage = at === undefined ? undefined : entry.passages?.[at];
    const href = passage ? entry.href + passageFragment(passage.text, passage.kind) : entry.href;
    const section = at === undefined ? undefined : entry.passages?.slice(0, at + 1).findLast(p => p.kind === 'heading')?.text;
    const snippet = excerpt(best === fields[0] ? entry.summary : best.text, phrase);
    hits.push({ entry, href, snippet, section, coverage: strongest.matched.length, rank: strongest.rank });
  }
  return hits.sort((a, b) => b.coverage - a.coverage || b.rank - a.rank);
}
