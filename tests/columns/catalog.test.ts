// Created by weixi on 2026/11/18.

import { describe, expect, it } from 'vitest';
import { resolveColumnCatalog, type ColumnArticle } from '../../src/features/columns/catalog';

const article = (slug: string, publishedAt: string, cover?: string): ColumnArticle => ({
  slug, href: `/posts/${slug}/`, title: slug, publishedAt, summary: '', recommended: false, cover,
});
const published = [
  article('recent', '2026-11-18 16:00:00', '/images/recent.webp'),
  article('early', '2021-12-26 18:58:00'),
  article('middle', '2026-11-18 08:00:00'),
];
const choice = { slug: 'design', title: '设计', intro: '阅读顺序', articles: ['early', 'recent'] };

describe('editorial columns', () => {
  it('supports an empty catalog as well as a column awaiting its first article', () => {
    expect(resolveColumnCatalog([], published)).toEqual([]);
    expect(resolveColumnCatalog([{ ...choice, articles: [] }], published)[0]).toMatchObject({
      articles: [], prominence: 'medium', cover: undefined,
    });
  });

  it('resolves published articles and allows another column to include the same article', () => {
    const [first, second] = resolveColumnCatalog([
      choice,
      { ...choice, slug: 'another', prominence: 'large', cover: '/images/custom.webp', articles: ['recent'] },
    ], published);
    expect(first.articles).toEqual([published[1], published[0]]);
    expect(first.cover).toBe('/images/recent.webp');
    expect(second).toMatchObject({ articles: [published[0]], prominence: 'large', cover: '/images/custom.webp' });
  });

  it('orders membership by the full publication timestamp, oldest first', () => {
    const [column] = resolveColumnCatalog([{ ...choice, articles: ['middle', 'early', 'recent'] }], published);
    expect(column.articles.map(article => article.slug)).toEqual(['early', 'middle', 'recent']);
  });

  it('keeps the configured order when two posts have the same timestamp', () => {
    const sameDate = published.map(article => ({ ...article, publishedAt: '2026-11-18 12:00:00' }));
    const [column] = resolveColumnCatalog([choice], sameDate);
    expect(column.articles.map(article => article.slug)).toEqual(choice.articles);
  });

  it.each([
    [[choice, choice], /专栏 slug 重复：design/],
    [[{ ...choice, articles: ['early', 'early'] }], /design 重复收录文章：early/],
    [[{ ...choice, articles: ['draft'] }], /design 引用了不存在或未发布的中文文章：draft/],
  ] as const)('reports conflicting identities or unresolvable references', (config, message) => {
    expect(() => resolveColumnCatalog(config, published)).toThrow(message);
  });

  it.each([{ slug: '../posts' }, { prominence: 'lareg' }, { title: '  ' }, { artcles: [] }])(
    'rejects malformed author configuration %j', override => {
      expect(() => resolveColumnCatalog([{ ...choice, ...override }], published)).toThrow();
    },
  );
});
