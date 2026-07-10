import { getCollection, type CollectionEntry } from 'astro:content';

export type PostEntry = CollectionEntry<'posts'>;

export async function getPublishedPosts(): Promise<PostEntry[]> {
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  const seenSlugs = new Set<string>();

  for (const post of posts) {
    if (seenSlugs.has(post.data.slug)) {
      throw new Error(`Duplicate post slug: ${post.data.slug}`);
    }
    seenSlugs.add(post.data.slug);
  }

  return posts.sort((left, right) => right.data.publishedAt.localeCompare(left.data.publishedAt));
}

export function getPostPath(post: PostEntry): string {
  return `/posts/${post.data.slug}/`;
}

export function getPostPublishedAt(post: PostEntry): Date {
  return new Date(`${post.data.publishedAt.replace(' ', 'T')}+08:00`);
}

export function getPostDate(post: PostEntry): string {
  return post.data.publishedAt.slice(0, 10);
}

export function getPostExcerpt(post: PostEntry, maxLength = 240): string {
  const source = post.body ?? '';
  const markdown = source
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
