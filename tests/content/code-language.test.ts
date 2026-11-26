// @vitest-environment jsdom
// Created by weixi on 2026/11/25.
import { createShikiHighlighter } from '@astrojs/markdown-remark/shiki';
import { expect, it } from 'vitest';
import { codeLanguage } from '../../scripts/build/code-language.mjs';

const highlighter = createShikiHighlighter({ langAlias: { objectivec: 'objective-c' } });
it.each([
  ['swift', 'Swift'], ['ts', 'TypeScript'], ['py', 'Python'], ['go', 'Go'],
  ['objectivec', 'Objective-C'], ['objc', 'Objective-C'], ['cs', 'C#'],
])('labels %s with the original language artwork and keeps the copied text intact', async (tag, label) => {
  const source = 'first line\n\n    last line';
  const html = await (await highlighter).codeToHtml(source, tag, { transformers: [codeLanguage] });
  const fragment = new DOMParser().parseFromString(html, 'text/html');
  expect(fragment.querySelector('.code-language')?.textContent).toBe(label);
  expect(fragment.querySelector('.code-language img')?.getAttribute('src')).toMatch(/^data:image\/svg\+xml;base64,/);
  expect(fragment.querySelector('pre code')?.textContent).toBe(source);
});

it('uses a generic mark for a block without a language logo', async () => {
  const html = await (await highlighter).codeToHtml('plain text', 'text', { transformers: [codeLanguage] });
  const label = new DOMParser().parseFromString(html, 'text/html').querySelector('.code-language')!;
  expect(label.textContent).toBe('‹/›Text');
  expect(label.querySelector('img')).toBeNull();
});
