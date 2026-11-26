// Created by weixi on 2026/11/26.

import { JSDOM } from 'jsdom';
import { articlePassages } from './passages.ts';

/**
 * @param {string} html
 * @param {'page' | 'body'} [source]
 * @returns {{text: string, kind?: 'heading' | 'code'}[]}
 */
export function renderedPassages(html, source = 'page') {
  const fragment = JSDOM.fragment(html);
  const root = source === 'body' ? fragment : fragment.querySelector('article.prose--article');
  if (!root) throw new Error('Missing article body while building search index');
  return articlePassages(root).map(({ text, kind }) => ({ text, kind }));
}
