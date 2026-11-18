// Created by weixi on 2026/10/25.
import { expect, it, vi } from 'vitest';
vi.mock('astro:content', () => ({ getCollection: vi.fn() }));
import { getPostExcerpt, type PostEntry } from '../../src/lib/content/posts';
import { countPostWords, countWordsInPosts } from '../../src/lib/content/post-word-count';
const body = `import {
  Chart
} from './Chart';

export const settings = { label: '不计入' };

<div className="note">

正文 **内容** {settings.label}

</div>

<Chart title="不计入" client:load />`;
it('excludes MDX modules, attributes and expressions from excerpts while keeping prose children', () => {
  expect(getPostExcerpt({ body, filePath: 'post.mdx' } as PostEntry)).toBe('正文 内容');
});
it('counts only authored MDX prose, without evaluating expressions', async () => {
  expect(await countPostWords(body, 'mdx')).toBe(4);
});

it('totals the selected Markdown and MDX entries using their own formats', async () => {
  expect(await countWordsInPosts([
    { body: 'import Chart', filePath: 'first.md' },
    { body, filePath: 'second.mdx' },
  ])).toBe(6);
  expect(await countWordsInPosts([])).toBe(0);
});

it('preserves ordinary Markdown text that resembles JavaScript', async () => {
  expect(getPostExcerpt({ body: 'import Chart', filePath: 'post.md' } as PostEntry)).toBe('import Chart');
  expect(await countPostWords('import Chart')).toBe(2);
});
