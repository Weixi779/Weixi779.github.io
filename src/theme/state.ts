// Created by weixi on 2026/10/25.

import type { ColorModePreference, ThemeState } from './types';

export function isColorModePreference(value: unknown): value is ColorModePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function createThemeStore(initialPreference: ColorModePreference, initialSystemDark: boolean) {
  let preference = initialPreference;
  let systemDark = initialSystemDark;
  const listeners = new Set<() => void>();

  function resolveState(): Readonly<ThemeState> {
    return Object.freeze({
      modePreference: preference,
      colorMode: preference === 'system' ? (systemDark ? 'dark' : 'light') : preference,
    });
  }

  let state = resolveState();

  function update() {
    const next = resolveState();
    if (next.modePreference === state.modePreference && next.colorMode === state.colorMode) return;
    state = next;
    for (const listener of listeners) listener();
  }

  return {
    getState: () => state,
    setPreference(mode: ColorModePreference) {
      if (!isColorModePreference(mode)) return;
      preference = mode;
      update();
    },
    setSystemDark(dark: boolean) {
      systemDark = dark;
      update();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}
