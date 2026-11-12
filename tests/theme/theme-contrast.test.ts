// Created by weixi on 2026/10/25.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/styles/theme.css', 'utf8');
const textPairs = [
  ['text-primary', 'background-primary'],
  ['text-secondary', 'background-primary'],
  ['text-secondary', 'background-secondary'],
  ['text-primary', 'surface-primary'],
  ['text-secondary', 'surface-elevated'],
  ['accent-primary', 'background-primary'],
  ['accent-primary', 'background-secondary'],
  ['accent-primary', 'accent-secondary'],
  ['text-on-accent', 'accent-primary'],
] as const;

function luminance(hex: string) {
  const [red, green, blue] = [1, 3, 5].map((index) => {
    const value = Number.parseInt(hex.slice(index, index + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

describe.each([
  ['light', /:root \{([^}]+)\}/u],
  ['dark', /:root\[data-color-mode='dark'\] \{([^}]+)\}/u],
] as const)('%s theme text contrast', (_, selector) => {
  const declarations = css.match(selector)![1];
  const colors = Object.fromEntries(
    Array.from(declarations.matchAll(/--color-([\w-]+): (#[\da-f]{6});/gu), (match) => [match[1], match[2]]),
  );
  it.each(textPairs)('%s stays readable on %s', (foreground, background) => {
    const values = [luminance(colors[foreground]), luminance(colors[background])];
    const ratio = (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});
