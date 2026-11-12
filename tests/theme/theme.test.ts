// @vitest-environment jsdom
// Created by weixi on 2026/10/25.

import { afterEach, describe, expect, it, vi } from 'vitest';
import runtime from 'virtual:theme-bootstrap';

const storageKey = 'blog-theme-preference';

function openPage(stored: string | null = null, dark = false, blockedStorage = false) {
  const frame = document.createElement('iframe');
  document.body.append(frame);
  const page = frame.contentWindow!;
  const root = frame.contentDocument!.documentElement;
  page.localStorage.clear();
  if (stored !== null) page.localStorage.setItem(storageKey, stored);

  const system = new EventTarget();
  const reducedMotion = { matches: true };
  Object.assign(system, { matches: dark });
  Object.defineProperty(page, 'matchMedia', {
    value: (query: string) => query.includes('color-scheme') ? system : reducedMotion,
  });
  if (blockedStorage) {
    Object.defineProperty(page, 'localStorage', { get() { throw new Error('Storage unavailable'); } });
  }
  const execute = () => new Function('window', 'document', runtime)(page, frame.contentDocument);
  execute();
  return {
    page, root, execute, reducedMotion,
    changeSystem(matches: boolean) {
      Object.assign(system, { matches });
      system.dispatchEvent(new Event('change'));
    },
  };
}

afterEach(() => { document.body.replaceChildren(); });

describe('page theme lifecycle', () => {
  it('applies the system appearance before any picker exists', () => {
    const { root, changeSystem } = openPage(null, true);
    expect(root.dataset.colorMode).toBe('dark');
    expect(root.dataset.colorModePreference).toBe('system');
    changeSystem(false);
    expect(root.dataset.colorMode).toBe('light');
  });

  it.each(['light', 'dark', 'system'])('keeps the old %s preference while retiring the palette id', (mode) => {
    const { page, root } = openPage(JSON.stringify({ themeId: 'cinderCandy', mode }), true);
    expect(root.dataset.colorModePreference).toBe(mode);
    expect(root.dataset.colorMode).toBe(mode === 'light' ? 'light' : 'dark');
    expect(JSON.parse(page.localStorage.getItem(storageKey)!)).toEqual({ mode });
  });

  it.each(['{broken', 'null', '42', '[]', '{"mode":"sepia"}'])('falls back to the system for invalid preference %s', (stored) => {
    const { root } = openPage(stored, true);
    expect(root.dataset.colorMode).toBe('dark');
    expect(root.dataset.colorModePreference).toBe('system');
  });

  it('keeps explicit appearance stable across system changes and follows again when requested', () => {
    const { page, root, changeSystem } = openPage(null, false);
    page.blogTheme.setPreference('dark');
    changeSystem(true);
    changeSystem(false);
    expect(root.dataset.colorMode).toBe('dark');
    expect(JSON.parse(page.localStorage.getItem(storageKey)!)).toEqual({ mode: 'dark' });
    page.blogTheme.setPreference('system');
    expect(root.dataset.colorMode).toBe('light');
    changeSystem(true);
    expect(root.dataset.colorMode).toBe('dark');
  });

  it('works when reading and writing storage are blocked', () => {
    const { page, root } = openPage(null, true, true);
    expect(root.dataset.colorMode).toBe('dark');
    page.blogTheme.setPreference('light');
    expect(root.dataset.colorMode).toBe('light');
  });

  it('publishes the applied state and does not add listeners on repeated initialization', () => {
    const { page, root, execute, changeSystem } = openPage(null, false);
    const updates: unknown[] = [];
    page.addEventListener('blog-theme-change', (event) => updates.push(event.detail));
    execute();
    changeSystem(true);
    expect(updates).toEqual([{ colorMode: 'dark', modePreference: 'system' }]);
    expect(page.blogTheme.getState()).toEqual({ colorMode: root.dataset.colorMode, modePreference: 'system' });
    page.blogTheme.setPreference('system');
    expect(updates).toHaveLength(1);
  });

  it.each([true, false])('preserves listeners only when entering the back/forward cache: %s', (persisted) => {
    const { page, root, changeSystem } = openPage(null, false);
    const event = new Event('pagehide');
    Object.defineProperty(event, 'persisted', { value: persisted });
    page.dispatchEvent(event);
    changeSystem(true);
    expect(root.dataset.colorMode).toBe(persisted ? 'dark' : 'light');
  });

  it('applies the latest preference when view transition callbacks are delayed', () => {
    const { page, root, reducedMotion } = openPage(null, false);
    const callbacks: Array<() => void> = [];
    reducedMotion.matches = false;
    Object.defineProperty(page.document, 'startViewTransition', {
      value: (update: () => void) => {
        callbacks.push(update);
        return { finished: Promise.resolve(), skipTransition: vi.fn() };
      },
    });
    page.blogTheme.setPreference('dark');
    page.blogTheme.setPreference('light');
    for (const update of callbacks.reverse()) update();
    expect(root.dataset.colorMode).toBe('light');
    expect(root.dataset.colorModePreference).toBe('light');
    expect(JSON.parse(page.localStorage.getItem(storageKey)!)).toEqual({ mode: 'light' });
  });

  it('refreshes a cached instance from storage on persisted pageshow, including the applied event', () => {
    const { page, root, reducedMotion } = openPage('{"mode":"light"}');
    const theme = page.blogTheme;
    const updates: unknown[] = [];
    page.addEventListener('blog-theme-change', (event) => updates.push(event.detail));
    reducedMotion.matches = false;
    Object.defineProperty(page.document, 'startViewTransition', {
      value: () => ({ finished: Promise.resolve(), skipTransition: vi.fn() }),
    });
    page.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
    page.localStorage.setItem(storageKey, '{"mode":"dark"}');
    page.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));

    expect(page.blogTheme).toBe(theme);
    expect(theme.getState()).toEqual({ modePreference: 'dark', colorMode: 'dark' });
    expect(root.dataset.colorMode).toBe('dark');
    expect(root.dataset.colorModePreference).toBe('dark');
    expect(updates).toEqual([{ modePreference: 'dark', colorMode: 'dark' }]);
    page.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    expect(updates).toHaveLength(1);
    theme.setPreference('light');
    expect(page.localStorage.getItem(storageKey)).toBe('{"mode":"light"}');
  });

  it('does not refresh storage on an ordinary pageshow', () => {
    const { page } = openPage('{"mode":"light"}');
    page.localStorage.setItem(storageKey, '{"mode":"dark"}');
    page.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: false }));
    expect(page.blogTheme.getState().modePreference).toBe('light');
  });
});
