// Created by weixi on 2026/10/25.

import { createThemeStore, isColorModePreference } from './state';
import type { ColorModePreference, ThemeController } from './types';

export interface ThemeEnvironment {
  storage: {
    read(): string | null;
    write(value: string): void;
  };
  system: {
    isDark(): boolean;
    subscribe(listener: (dark: boolean) => void): () => void;
  };
}

export function createThemeController({ storage, system }: ThemeEnvironment): ThemeController {
  function save(mode: ColorModePreference) {
    try { storage.write(JSON.stringify({ mode })); } catch {
      // Storage failure must not prevent an appearance change in this session.
    }
  }

  function readPreference(fallback: ColorModePreference): ColorModePreference {
    let raw: string | null;
    try { raw = storage.read(); } catch {
      // A temporarily inaccessible store must not discard the session choice.
      return fallback;
    }
    try {
      const stored: unknown = JSON.parse(raw ?? 'null');
      if (stored && typeof stored === 'object' && 'mode' in stored && isColorModePreference(stored.mode)) {
        if ('themeId' in stored) save(stored.mode);
        return stored.mode;
      }
    } catch {
      // Missing or invalid preferences use the same default on load and restore.
    }
    return 'system';
  }

  const preference = readPreference('system');
  const store = createThemeStore(preference, system.isDark());
  let previousPreference = preference;
  const stopSaving = store.subscribe(() => {
    const next = store.getState().modePreference;
    if (next === previousPreference) return;
    previousPreference = next;
    save(next);
  });
  const stopSystem = system.subscribe(store.setSystemDark);

  return {
    getState: store.getState,
    setPreference: store.setPreference,
    refreshPreference() {
      const next = readPreference(store.getState().modePreference);
      // Reading an external choice is not a user edit; do not write it back.
      previousPreference = next;
      store.setPreference(next);
    },
    subscribe: store.subscribe,
    dispose() {
      stopSaving();
      stopSystem();
    },
  };
}
