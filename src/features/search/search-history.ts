// Created by weixi on 2026/11/26.

import type { Scope } from './search';

export interface SearchSnapshot {
  query: string;
  scope: Scope;
  selected: number;
  scrollY: number;
  listScroll: number;
}

interface Arrival {
  dismissed?: boolean;
  from: string;
  to: string;
  query: string;
}

function readSession<T>(key: string): T | null {
  try { return JSON.parse(sessionStorage.getItem(key) ?? 'null'); }
  catch { return null; }
}

function writeSession(key: string, value: unknown) {
  try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* Storage is optional. */ }
}

export function recentSearchLinks(): string[] {
  const recent = readSession<unknown>('site-search-recent');
  return Array.isArray(recent) ? recent.filter(link => typeof link === 'string') : [];
}

export function visitResult(href: string, documentHref: string, snapshot: SearchSnapshot) {
  history.replaceState({ ...history.state, siteSearch: snapshot }, '');
  writeSession('site-search-recent', [documentHref, ...recentSearchLinks().filter(link => link !== documentHref)].slice(0, 6));
  const url = new URL(href, location.href);
  const arrival: Arrival = { from: location.href, to: url.href, query: snapshot.query.trim() };
  if (url.pathname === location.pathname && url.search === location.search) {
    history.pushState({ searchArrival: arrival }, '', url);
    if (!url.hash) window.scrollTo({ top: 0, behavior: 'instant' });
    window.dispatchEvent(new PopStateEvent('popstate', { state: history.state }));
  } else {
    writeSession('site-search-next', arrival);
    location.assign(url);
  }
}

export function searchArrival(): Arrival | undefined {
  const current = history.state?.searchArrival as Arrival | undefined;
  if (current?.to === location.href) return current;
  const next = readSession<Arrival>('site-search-next');
  if (!next) return;
  writeSession('site-search-next', null);
  // Referrers omit fragments and can be suppressed by browser privacy settings.
  if (next.to !== location.href || !document.referrer || next.from.split('#')[0] !== document.referrer.split('#')[0]) return;
  history.replaceState({ ...history.state, searchArrival: next }, '');
  return next;
}
