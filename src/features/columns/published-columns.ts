// Created by weixi on 2026/11/18.

import { getPostExcerpt, getPostPath, getPublishedPosts, type PostEntry } from '../../lib/content/posts';
import { resolveColumnCatalog } from './catalog';
import config from './columns.json';

export async function getPublishedColumns(publishedPosts?: readonly PostEntry[]) {
  if (Array.isArray(config) && config.length === 0) return [];
  const posts = publishedPosts ?? await getPublishedPosts();
  return resolveColumnCatalog(config, posts.map(post => ({
    slug: post.data.slug,
    href: getPostPath(post),
    title: post.data.title,
    publishedAt: post.data.publishedAt,
    summary: post.data.summary || getPostExcerpt(post, 180),
    recommended: post.data.recommended,
    cover: post.data.hero,
  })));
}
