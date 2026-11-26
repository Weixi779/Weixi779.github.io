// Created by weixi on 2026/11/26.

import { readFile, writeFile } from 'node:fs/promises';
import { renderedPassages } from '../../src/features/search/rendered-passages.mjs';

export function siteSearchIndex() {
  return {
    name: 'site-search-index',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        const file = new URL('search-index.json', dir);
        const entries = JSON.parse(await readFile(file, 'utf8'));
        for (const entry of entries.filter(entry => entry.kind === 'article')) {
          const page = new URL(entry.href.slice(1) + 'index.html', dir);
          entry.passages = renderedPassages(await readFile(page, 'utf8'));
        }
        await writeFile(file, JSON.stringify(entries));
      },
    },
  };
}
