// Created by weixi on 2026/11/18.

import { z } from 'astro/zod';

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
const text = z.string().trim().min(1);
const definition = z.object({
  slug,
  title: text,
  intro: text,
  cover: text.optional(),
  prominence: z.enum(['large', 'medium', 'small']).default('medium'),
  articles: z.array(slug),
}).strict();
const catalogSchema = z.array(definition);

export interface ColumnArticle {
  slug: string;
  href: string;
  title: string;
  publishedAt: string;
  summary: string;
  recommended: boolean;
  cover?: string;
}

export type Column = Omit<z.infer<typeof definition>, 'articles'> & { articles: ColumnArticle[] };
export type ColumnProminence = Column['prominence'];

export function resolveColumnCatalog(config: unknown, publishedArticles: readonly ColumnArticle[]): Column[] {
  const definitions = catalogSchema.parse(config);
  const published = new Map(publishedArticles.map(article => [article.slug, article]));
  const columnSlugs = new Set<string>();

  return definitions.map(({ articles: articleSlugs, ...column }) => {
    if (columnSlugs.has(column.slug)) throw new Error(`columns.json：专栏 slug 重复：${column.slug}`);
    columnSlugs.add(column.slug);

    const members = new Set<string>();
    const articles = articleSlugs.map(slug => {
      if (members.has(slug)) throw new Error(`columns.json：${column.slug} 重复收录文章：${slug}`);
      members.add(slug);
      const article = published.get(slug);
      if (!article) throw new Error(`columns.json：${column.slug} 引用了不存在或未发布的中文文章：${slug}`);
      return article;
    });

    articles.sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));

    return { ...column, cover: column.cover ?? articles.find(article => article.cover)?.cover, articles };
  });
}
