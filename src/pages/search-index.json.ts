// Created by weixi on 2026/11/26.

import type { APIRoute } from 'astro';
import { getPublishedColumns } from '../features/columns/published-columns';
import { renderedPassages } from '../features/search/rendered-passages.mjs';
import type { SearchEntry } from '../features/search/search';
import { getPostExcerpt, getPostPath, getPublishedPosts, type PostEntry } from '../lib/content/posts';

// Astro replaces the rendered entry when a Markdown file changes during development.
const markdownPassages = new WeakMap<NonNullable<PostEntry['rendered']>, ReturnType<typeof renderedPassages>>();

export const GET: APIRoute = async ({ url }) => {
  const [chinese, english] = await Promise.all([getPublishedPosts(), getPublishedPosts('en')]);
  const columns = await getPublishedColumns(chinese);
  const entries: SearchEntry[] = [];
  for (const post of [...chinese, ...english]) {
    const { title, summary, category, tags, slug, publishedAt, lang } = post.data;
    const memberships = lang === 'en' ? [] : columns.filter(c => c.articles.some(a => a.slug === slug)).map(c => c.title);
    const href = getPostPath(post);
    const entry: SearchEntry = {
      kind: 'article', href, title, summary: summary || getPostExcerpt(post, 180),
      detail: [publishedAt.slice(0, 4), lang === 'en' ? 'English' : '', memberships[0] || category].filter(Boolean).join(' · '),
      terms: [category, ...tags, ...memberships],
    };
    if (import.meta.env.DEV && post.rendered?.html !== undefined) {
      entry.passages = markdownPassages.get(post.rendered) ?? renderedPassages(post.rendered.html, 'body');
      markdownPassages.set(post.rendered, entry.passages);
    }
    entries.push(entry);
  }
  for (const column of columns) {
    entries.push({
      kind: 'column', href: '/columns/' + column.slug + '/', title: column.title, summary: column.intro,
      detail: column.articles.length + ' 篇文章', terms: [...(column.summaryPhrases ?? []), ...column.articles.map(a => a.title)],
    });
  }
  // MDX needs the live route so edits to imported components are included.
  if (import.meta.env.DEV) {
    const local = new URL(url);
    local.hostname = 'localhost';
    const deferred = entries.filter(entry => entry.kind === 'article' && !entry.passages);
    for (let i = 0; i < deferred.length; i += 4) {
      await Promise.all(deferred.slice(i, i + 4).map(async entry => {
        const response = await fetch(new URL(entry.href, local), { redirect: 'error' });
        if (!response.ok) throw new Error('Cannot index ' + entry.href);
        entry.passages = renderedPassages(await response.text());
      }));
    }
  }
  return Response.json(entries);
};
