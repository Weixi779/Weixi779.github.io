// Created by weixi on 2026/10/14.

import { describe, expect, it } from 'vitest';
import { filterArchivePosts, normalizeArchiveSearch } from '../src/utils/archive';
import { posts } from './fixtures/archive';

describe('normalizeArchiveSearch', () => {
  it.each([
    ['  ＷＩＣｏｍｐｒｅｓｓ　', 'wicompress'],
    ['React', 'react'],
    ['  网络图片 调研  ', '网络图片 调研'],
    ['　 \t\n', ''],
  ])('normalizes %j to %j', (input, expected) => {
    expect(normalizeArchiveSearch(input)).toBe(expected);
  });
});

describe('filterArchivePosts', () => {
  it.each([
    {
      name: 'shows every post with no filters, in publication order',
      query: '', category: '',
      expected: ['image-compression', 'react-archive', 'image-cache', 'why-create'],
    },
    {
      name: 'treats whitespace as an empty query',
      query: '　 \t', category: '',
      expected: ['image-compression', 'react-archive', 'image-cache', 'why-create'],
    },
    {
      name: 'filters by category alone',
      query: '', category: 'iOS', expected: ['image-compression', 'image-cache'],
    },
    {
      name: 'matches full-width input and ignores case and surrounding whitespace',
      query: '  ＷＩＣＯＭＰＲＥＳＳ　', category: '', expected: ['image-compression'],
    },
    {
      name: 'searches indexed content beyond the title',
      query: '内存', category: '', expected: ['image-compression', 'image-cache'],
    },
    {
      name: 'searches the publication year',
      query: '2026', category: '', expected: ['image-compression', 'react-archive'],
    },
    {
      name: 'requires both category and query to match',
      query: '缓存', category: 'iOS', expected: ['image-cache'],
    },
    {
      name: 'does not show query matches from another category',
      query: '图片', category: 'Web', expected: [],
    },
    {
      name: 'returns no posts for an unmatched query',
      query: 'Unity', category: '', expected: [],
    },
  ])('$name', ({ query, category, expected }) => {
    expect(filterArchivePosts(posts, { query, category }).map((post) => post.slug)).toEqual(expected);
  });

  it('handles an empty archive', () => {
    expect(filterArchivePosts([], { query: '', category: '' })).toEqual([]);
  });
});
