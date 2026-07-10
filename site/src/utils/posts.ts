import { readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { getCollection, type CollectionEntry } from 'astro:content';

export type PostEntry = CollectionEntry<'posts'>;

type LegacyRouteParts = {
  year: string;
  month: string;
  day: string;
  slug: string;
};

export async function getPublishedPosts(): Promise<PostEntry[]> {
  const posts = await getCollection('posts');
  const seenSlugs = new Set<string>();

  for (const post of posts) {
    if (seenSlugs.has(post.data.slug)) {
      throw new Error(`Duplicate post slug: ${post.data.slug}`);
    }
    seenSlugs.add(post.data.slug);
  }

  return posts.sort((left, right) => right.data.date.valueOf() - left.data.date.valueOf());
}

export function getLegacyPostRouteParts(post: PostEntry): LegacyRouteParts {
  const filePath = post.filePath;
  const slug = basename(filePath ?? post.id).replace(/\.md$/u, '');
  const source = filePath ? readFileSync(resolve(process.cwd(), filePath), 'utf8') : '';
  const dateMatch = source.match(/^date:\s*(\d{4})-(\d{2})-(\d{2})/mu);

  if (!dateMatch) {
    throw new Error(`Post ${post.id} is missing a YYYY-MM-DD date in its frontmatter.`);
  }

  return {
    year: dateMatch[1],
    month: dateMatch[2],
    day: dateMatch[3],
    slug,
  };
}

export function getPostPath(post: PostEntry): string {
  return `/posts/${post.data.slug}/`;
}

export function getLegacyPostPath(post: PostEntry): string {
  const { year, month, day, slug } = getLegacyPostRouteParts(post);
  return `/${year}/${month}/${day}/${slug}/`;
}

export function getPostDate(post: PostEntry): string {
  const { year, month, day } = getLegacyPostRouteParts(post);
  return `${year}-${month}-${day}`;
}

export function getPostExcerpt(post: PostEntry, maxLength = 240): string {
  const source =
    post.body ?? (post.filePath ? readFileSync(resolve(process.cwd(), post.filePath), 'utf8') : '');
  const markdown = source
    .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/u, '')
    .replace(/```[\s\S]*?```/gu, ' ')
    .replace(/~~~[\s\S]*?~~~/gu, ' ')
    .replace(/<!--[\s\S]*?-->/gu, ' ');
  const paragraphs: string[] = [];

  for (const rawBlock of markdown.split(/\r?\n\s*\r?\n/gu)) {
    const block = rawBlock.trim();
    if (
      !block ||
      /^#{1,6}\s/u.test(block) ||
      /^>/u.test(block) ||
      /^(?:[-*_]\s*){3,}$/u.test(block) ||
      /^(?:!\[[^\]]*\]\([^)]*\)\s*)+$/u.test(block)
    ) {
      continue;
    }

    const plainText = block
      .replace(/^\s*\[[^\]]+\]:\s+\S+.*$/gmu, ' ')
      .replace(/!\[[^\]]*\]\([^)]*\)/gu, ' ')
      .replace(/\[([^\]]+)\]\([^)]*\)/gu, '$1')
      .replace(/\[([^\]]+)\]\[[^\]]*\]/gu, '$1')
      .replace(/<https?:\/\/[^>]+>/gu, ' ')
      .replace(/<[^>]+>/gu, ' ')
      .replace(/^\s*(?:[-+*]|\d+[.)])\s+/gmu, '')
      .replace(/\[\^[^\]]+\]/gu, '')
      .replace(/[`*_~]/gu, '')
      .replace(/&nbsp;/gu, ' ')
      .replace(/\s+/gu, ' ')
      .trim();

    if (!plainText) continue;
    paragraphs.push(plainText);
    if (paragraphs.join(' ').length >= 140) break;
  }

  const excerpt = paragraphs.join(' ');
  return excerpt.length > maxLength ? `${excerpt.slice(0, maxLength).trimEnd()}…` : excerpt;
}
