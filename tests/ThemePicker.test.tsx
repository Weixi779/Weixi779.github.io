// @vitest-environment jsdom
// Created by weixi on 2026/10/25.

import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import ThemePicker from '../src/components/ThemePicker';
import { createThemeController } from '../src/theme/controller';

afterEach(() => { cleanup(); window.blogTheme.dispose(); });

it('resyncs restored radio state before opening and lets the user select that mode again', () => {
  let stored = '{"mode":"dark"}';
  window.blogTheme = createThemeController({
    storage: { read: () => stored, write: (value) => { stored = value; } },
    system: { isDark: () => false, subscribe: () => () => {} },
  });
  render(<ThemePicker />, { reactStrictMode: true });
  const dark = screen.getByRole('radio', { name: '深色', hidden: true });
  const light = screen.getByRole('radio', { name: '浅色', hidden: true }) as HTMLInputElement;
  expect(dark).toBeChecked();

  // Model a browser restoring a form value older than the shared controller's preference.
  light.checked = true;
  fireEvent.click(screen.getByRole('button', { name: '打开主题设置' }));
  expect(dark).toBeChecked();
  expect(light).not.toBeChecked();
  expect(dark).toHaveFocus();
  fireEvent.click(light);
  expect(window.blogTheme.getState().modePreference).toBe('light');
  expect(stored).toBe('{"mode":"light"}');

  stored = '{"mode":"system"}';
  act(() => window.blogTheme.refreshPreference());
  expect(screen.getByRole('radio', { name: '跟随系统' })).toBeChecked();
});
