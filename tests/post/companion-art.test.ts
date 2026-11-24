// Created by weixi on 2026/11/24.
// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe.each(['dragon', 'gemini'])('%s reading companion artwork', character => {
  const source = readFileSync(`src/features/post/illustrations/little-${character}.svg`, 'utf8');
  const sheet = new DOMParser().parseFromString(source, 'image/svg+xml');

  it('exposes two square poses to pages that select a frame by background position', () => {
    expect(sheet.documentElement.getAttribute('viewBox')).toBe('0 0 900 450');
    expect(sheet.getElementById('raised')?.querySelector('path')).toBeTruthy();
    expect(sheet.getElementById('rest')?.getAttribute('transform')).toBe('translate(450)');
  });

  it('lets the article reuse the complete resting pose without the sheet offset', () => {
    const portrait = sheet.getElementById('reading-portrait');
    expect(portrait?.parentElement).toBe(sheet.getElementById('rest'));
    expect(portrait?.hasAttribute('transform')).toBe(false);
    expect(portrait?.querySelector('path')).toBeTruthy();
  });
});
