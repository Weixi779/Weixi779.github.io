// Created by weixi on 2026/10/25.

import { describe, expect, it, vi } from 'vitest';
import { createThemeStore } from '../src/theme/state';
import { createThemeController, type ThemeEnvironment } from '../src/theme/controller';

describe('independent theme state', () => {
  it('isolates instances and holds a stable snapshot until the state changes', () => {
    const first = createThemeStore('system', false);
    const second = createThemeStore('system', true);
    const snapshot = first.getState();
    expect(first.getState()).toBe(snapshot);
    first.setPreference('dark');
    expect(first.getState()).toEqual({ modePreference: 'dark', colorMode: 'dark' });
    expect(second.getState()).toEqual({ modePreference: 'system', colorMode: 'dark' });
    expect(snapshot).toEqual({ modePreference: 'system', colorMode: 'light' });
  });

  it('remembers system changes while overridden and stops notifying unsubscribed consumers', () => {
    const theme = createThemeStore('light', false);
    const updates: unknown[] = [];
    const unsubscribe = theme.subscribe(() => updates.push(theme.getState()));
    theme.setSystemDark(true);
    expect(updates).toEqual([]);
    theme.setPreference('system');
    expect(updates).toEqual([{ modePreference: 'system', colorMode: 'dark' }]);
    theme.setPreference('system');
    expect(updates).toHaveLength(1);
    unsubscribe();
    theme.setPreference('light');
    expect(updates).toHaveLength(1);
  });
});

function memoryEnvironment(stored: string | null = null) {
  let value = stored;
  let dark = false;
  const listeners = new Set<(dark: boolean) => void>();
  const environment: ThemeEnvironment = {
    storage: { read: () => value, write: (next) => { value = next; } },
    system: {
      isDark: () => dark,
      subscribe: (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    },
  };
  return {
    environment,
    read: () => value,
    changeSystem(next: boolean) { dark = next; for (const listener of listeners) listener(next); },
  };
}

describe('injected theme environment', () => {
  it.each([
    ['{"mode":"dark"}', 'dark'],
    ['{"themeId":"cinderCandy","mode":"dark"}', 'dark'],
    [null, 'system'],
    ['{broken', 'system'],
    ['{"mode":"sepia"}', 'system'],
  ] as const)('validates external preference changes on refresh: %s', (stored, expected) => {
    const memory = memoryEnvironment('{"mode":"light"}');
    const theme = createThemeController(memory.environment);
    memory.environment.storage.read = () => stored;
    const write = vi.spyOn(memory.environment.storage, 'write');
    theme.refreshPreference();
    expect(theme.getState().modePreference).toBe(expected);
    if (stored?.includes('themeId')) {
      expect(write).toHaveBeenCalledExactlyOnceWith('{"mode":"dark"}');
    } else {
      expect(write).not.toHaveBeenCalled();
    }
    theme.setPreference('light');
    expect(write).toHaveBeenLastCalledWith('{"mode":"light"}');
    theme.dispose();
  });

  it('retains the session preference if storage becomes inaccessible on restore', () => {
    const memory = memoryEnvironment('{"mode":"dark"}');
    const theme = createThemeController(memory.environment);
    memory.environment.storage.read = () => { throw new Error('blocked'); };
    theme.refreshPreference();
    expect(theme.getState().modePreference).toBe('dark');
    theme.dispose();
  });

  it('migrates a legacy preference and persists user choices without a browser', () => {
    const memory = memoryEnvironment('{"themeId":"wisteriaMatcha","mode":"dark"}');
    const theme = createThemeController(memory.environment);
    expect(theme.getState()).toEqual({ modePreference: 'dark', colorMode: 'dark' });
    expect(memory.read()).toBe('{"mode":"dark"}');
    theme.setPreference('system');
    memory.changeSystem(true);
    expect(theme.getState()).toEqual({ modePreference: 'system', colorMode: 'dark' });
    expect(memory.read()).toBe('{"mode":"system"}');
  });

  it('disconnects external listeners when its owner disposes it', () => {
    const memory = memoryEnvironment();
    const theme = createThemeController(memory.environment);
    theme.dispose();
    memory.changeSystem(true);
    expect(theme.getState().colorMode).toBe('light');
    theme.setPreference('dark');
    expect(memory.read()).toBeNull();
  });

  it('keeps state functional when injected persistence fails', () => {
    const memory = memoryEnvironment();
    memory.environment.storage = {
      read() { throw new Error('blocked'); },
      write() { throw new Error('full'); },
    };
    const theme = createThemeController(memory.environment);
    theme.setPreference('dark');
    expect(theme.getState().colorMode).toBe('dark');
    theme.dispose();
  });
});
