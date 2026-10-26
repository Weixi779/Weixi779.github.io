// Created by weixi on 2026/10/14.

export const ALL_CATEGORIES = '';

export interface ArchivePost {
  slug: string;
  href: string;
  title: string;
  category: string;
  tags: string[];
  year: string;
  searchText: string;
  recommended?: boolean;
}

export interface ArchiveFilters {
  query: string;
  category: string;
}

// Share the same normalization between Astro's search index and React's input.
export function normalizeArchiveSearch(value: string): string {
  return value.normalize('NFKC').trim().toLocaleLowerCase('zh-CN');
}

export function filterArchivePosts(posts: ArchivePost[], filters: ArchiveFilters): ArchivePost[] {
  const query = normalizeArchiveSearch(filters.query);
  return posts.filter(
    (post) =>
      (filters.category === ALL_CATEGORIES || post.category === filters.category) &&
      post.searchText.includes(query),
  );
}
