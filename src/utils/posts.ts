import { getCollection, type CollectionEntry } from 'astro:content';

export type PostEntry = CollectionEntry<'posts'>;
export type PostLanguage = 'zh-CN' | 'en';

export interface PostRouteProps {
  post: PostEntry;
  translation?: PostEntry;
  newerPost?: PostEntry;
  olderPost?: PostEntry;
}

async function loadPublishedPosts(): Promise<PostEntry[]> {
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  const seenRoutes = new Set<string>();
  const seenTranslations = new Set<string>();

  for (const post of posts) {
    const routeIdentity = `${post.data.lang}:${post.data.slug}`;
    if (seenRoutes.has(routeIdentity)) {
      throw new Error(`Duplicate post route: ${routeIdentity}`);
    }
    seenRoutes.add(routeIdentity);

    if (post.data.translationKey) {
      const translationIdentity = `${post.data.lang}:${post.data.translationKey}`;
      if (seenTranslations.has(translationIdentity)) {
        throw new Error(`Duplicate post translation: ${translationIdentity}`);
      }
      seenTranslations.add(translationIdentity);
    }
  }

  return posts.sort((left, right) => right.data.publishedAt.localeCompare(left.data.publishedAt));
}

export async function getPublishedPosts(language: PostLanguage = 'zh-CN'): Promise<PostEntry[]> {
  const posts = await loadPublishedPosts();
  return posts.filter((post) => post.data.lang === language);
}

export async function getPostStaticPaths(language: PostLanguage) {
  const allPosts = await loadPublishedPosts();
  const posts = allPosts.filter((post) => post.data.lang === language);

  return posts.map((post, index) => ({
    params: { slug: post.data.slug },
    props: {
      post,
      translation: post.data.translationKey
        ? allPosts.find(
            (candidate) =>
              candidate.data.translationKey === post.data.translationKey &&
              candidate.data.lang !== post.data.lang,
          )
        : undefined,
      newerPost: index > 0 ? posts[index - 1] : undefined,
      olderPost: index < posts.length - 1 ? posts[index + 1] : undefined,
    } satisfies PostRouteProps,
  }));
}

export function getPostPath(post: PostEntry): string {
  const prefix = post.data.lang === 'en' ? '/en/posts' : '/posts';
  return `${prefix}/${post.data.slug}/`;
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
