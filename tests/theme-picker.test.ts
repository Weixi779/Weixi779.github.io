// @vitest-environment jsdom
// Created by weixi on 2026/10/25.

import { readFileSync } from 'node:fs';
import { transpileModule, ScriptTarget, ModuleKind } from 'typescript';
import { expect, it } from 'vitest';
import { createThemeController } from '../src/theme/controller';

it('resyncs restored radio state before opening and lets the user select that mode again', () => {
  let stored = '{"mode":"dark"}';
  const theme = createThemeController({
    storage: { read: () => stored, write: (value) => { stored = value; } },
    system: { isDark: () => false, subscribe: () => () => {} },
  });
  window.blogTheme = theme;
  document.body.innerHTML = `
    <div data-theme-picker>
      <button data-theme-toggle type="button">主题</button>
      <section data-theme-panel hidden>
        <input data-theme-mode-input type="radio" name="mode" value="system">
        <input data-theme-mode-input type="radio" name="mode" value="light">
        <input data-theme-mode-input type="radio" name="mode" value="dark">
      </section>
    </div>`;

  // Execute the component's actual client script; jsdom does not render Astro.
  const component = readFileSync('src/components/ThemePicker.astro', 'utf8');
  const script = component.match(/<script>([\s\S]*?)<\/script>/u)![1];
  const { outputText } = transpileModule(script, {
    compilerOptions: { target: ScriptTarget.ES2022, module: ModuleKind.ESNext },
  });
  new Function(outputText)();

  const light = document.querySelector<HTMLInputElement>('input[value="light"]')!;
  const dark = document.querySelector<HTMLInputElement>('input[value="dark"]')!;
  expect(dark.checked).toBe(true);

  // Model the browser restoring an older form value after script initialization.
  light.checked = true;
  document.querySelector<HTMLButtonElement>('[data-theme-toggle]')!.click();

  expect(dark.checked).toBe(true);
  expect(light.checked).toBe(false);
  expect(document.activeElement).toBe(dark);
  light.click();
  expect(theme.getState().modePreference).toBe('light');
  expect(stored).toBe('{"mode":"light"}');

  theme.dispose();
});
