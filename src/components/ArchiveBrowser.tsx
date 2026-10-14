// Created by weixi on 2026/10/12.

import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { flushSync } from 'react-dom';
import {
  ALL_CATEGORIES,
  filterArchivePosts,
  type ArchiveFilters,
  type ArchivePost,
} from '../utils/archive';

const ARCHIVE_PATH = '/archive/';
const ARCHIVE_PARAMS = {
  query: 'q',
  category: 'category',
  legacyTag: 'tag',
} as const;
const ARCHIVE_IDS = {
  searchInput: 'archive-search-input',
  results: 'archive-results',
  resultStatus: 'archive-result-status',
} as const;
const ARCHIVE_TRANSITION_CLASS = 'archive-is-transitioning';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const PRIMARY_MOUSE_BUTTON = 0;

interface ArchiveCategory {
  name: string;
  count: number;
}

interface ArchiveBrowserProps {
  posts: ArchivePost[];
  categories: ArchiveCategory[];
}

function readUrlFilters(categories: ArchiveCategory[]): ArchiveFilters {
  const params = new URLSearchParams(window.location.search);
  const category = params.get(ARCHIVE_PARAMS.category) ?? ALL_CATEGORIES;
  return {
    query: params.get(ARCHIVE_PARAMS.query) ?? '',
    category: categories.some(({ name }) => name === category) ? category : ALL_CATEGORIES,
  };
}

function writeUrlFilters(filters: ArchiveFilters, mode: 'push' | 'replace') {
  const url = new URL(window.location.href);
  const query = filters.query.trim();
  filters.category !== ALL_CATEGORIES
    ? url.searchParams.set(ARCHIVE_PARAMS.category, filters.category)
    : url.searchParams.delete(ARCHIVE_PARAMS.category);
  query
    ? url.searchParams.set(ARCHIVE_PARAMS.query, query)
    : url.searchParams.delete(ARCHIVE_PARAMS.query);
  url.searchParams.delete(ARCHIVE_PARAMS.legacyTag);

  if (mode === 'push') window.history.pushState({}, '', url);
  else window.history.replaceState({}, '', url);
}

export default function ArchiveBrowser({ posts, categories }: ArchiveBrowserProps) {
  const [filters, setFilters] = useState<ArchiveFilters>({ query: '', category: ALL_CATEGORIES });
  const transitionSequence = useRef(0);

  function displayFilters(nextFilters: ArchiveFilters, animate: boolean) {
    const sequence = ++transitionSequence.current;
    const apply = () => {
      if (sequence === transitionSequence.current) setFilters(nextFilters);
    };
    const startViewTransition = document.startViewTransition?.bind(document);
    if (
      !animate ||
      !startViewTransition ||
      window.matchMedia(REDUCED_MOTION_QUERY).matches
    ) {
      document.documentElement.classList.remove(ARCHIVE_TRANSITION_CLASS);
      apply();
      return;
    }

    document.documentElement.classList.add(ARCHIVE_TRANSITION_CLASS);
    // Commit React's DOM update before the browser captures the new transition frame.
    const transition = startViewTransition(() => flushSync(apply));
    const finish = () => {
      if (sequence === transitionSequence.current) {
        document.documentElement.classList.remove(ARCHIVE_TRANSITION_CLASS);
      }
    };
    void transition.finished.then(finish, finish);
  }

  useEffect(() => {
    // The first browser render matches Astro's HTML; restore URL state after hydration.
    setFilters(readUrlFilters(categories));
    const restoreFilters = () => displayFilters(readUrlFilters(categories), true);
    window.addEventListener('popstate', restoreFilters);
    return () => {
      window.removeEventListener('popstate', restoreFilters);
      transitionSequence.current += 1;
      document.documentElement.classList.remove(ARCHIVE_TRANSITION_CLASS);
    };
  }, [categories]);

  function changeQuery(query: string) {
    // The URL also reflects a category change whose animation has not committed yet.
    const nextFilters = { ...readUrlFilters(categories), query };
    writeUrlFilters(nextFilters, 'replace');
    displayFilters(nextFilters, false);
  }

  function selectCategory(category: string) {
    if (category === readUrlFilters(categories).category) return;
    const nextFilters = { query: filters.query, category };
    writeUrlFilters(nextFilters, 'push');
    displayFilters(nextFilters, true);
  }

  const matchingPosts = filterArchivePosts(posts, filters);

  return (
    <div className="content-container archive-page">
      <ArchiveSearch
        query={filters.query}
        resultCount={matchingPosts.length}
        onQueryChange={changeQuery}
        onSubmit={() => writeUrlFilters(filters, 'replace')}
      />
      <ArchiveCategories
        categories={categories}
        selectedCategory={filters.category}
        totalCount={posts.length}
        onSelect={selectCategory}
      />
      <ArchiveResults posts={matchingPosts} />
    </div>
  );
}

interface ArchiveSearchProps {
  query: string;
  resultCount: number;
  onQueryChange: (query: string) => void;
  onSubmit: () => void;
}

function ArchiveSearch({ query, resultCount, onQueryChange, onSubmit }: ArchiveSearchProps) {
  const searchInput = useRef<HTMLInputElement>(null);

  return (
    <div className="archive-controls">
      <form
        className="archive-search"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <label className="visually-hidden" htmlFor={ARCHIVE_IDS.searchInput}>搜索文章</label>
        <input
          ref={searchInput}
          id={ARCHIVE_IDS.searchInput}
          type="search"
          placeholder="搜索标题、摘要、分类或标签"
          autoComplete="off"
          aria-controls={ARCHIVE_IDS.results}
          aria-describedby={ARCHIVE_IDS.resultStatus}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
        <button
          type="button"
          hidden={query.length === 0}
          onClick={() => {
            onQueryChange('');
            searchInput.current?.focus();
          }}
        >清除</button>
      </form>
      <p id={ARCHIVE_IDS.resultStatus} className="archive-result-status" aria-live="polite">
        {resultCount} 篇文章
      </p>
    </div>
  );
}

interface ArchiveCategoriesProps {
  categories: ArchiveCategory[];
  selectedCategory: string;
  totalCount: number;
  onSelect: (category: string) => void;
}

function ArchiveCategories({
  categories,
  selectedCategory,
  totalCount,
  onSelect,
}: ArchiveCategoriesProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>, category: string) {
    if (
      event.button !== PRIMARY_MOUSE_BUTTON ||
      event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
    ) return;
    event.preventDefault();
    onSelect(category);
  }

  return (
    <nav className="archive-categories" aria-label="按分类筛选文章">
      <a
        href={ARCHIVE_PATH}
        aria-current={selectedCategory === ALL_CATEGORIES ? 'page' : undefined}
        onClick={(event) => handleClick(event, ALL_CATEGORIES)}
      >全部 <sup>{totalCount}</sup></a>
      {categories.map(({ name, count }) => (
        <a
          key={name}
          href={`${ARCHIVE_PATH}?${ARCHIVE_PARAMS.category}=${encodeURIComponent(name)}`}
          aria-current={selectedCategory === name ? 'page' : undefined}
          onClick={(event) => handleClick(event, name)}
        >{name} <sup>{count}</sup></a>
      ))}
    </nav>
  );
}

interface ArchiveResultsProps {
  posts: ArchivePost[];
}

function ArchiveResults({ posts }: ArchiveResultsProps) {
  const years = new Map<string, ArchivePost[]>();
  for (const post of posts) {
    const yearPosts = years.get(post.year) ?? [];
    yearPosts.push(post);
    years.set(post.year, yearPosts);
  }

  return (
    <div id={ARCHIVE_IDS.results}>
      {Array.from(years, ([year, yearPosts]) => (
        <section key={year} className="archive-year">
          <h2 style={{ viewTransitionName: `archive-year-${year}` }}>{year}</h2>
          <ol>
            {yearPosts.map((post) => (
              <li
                key={post.href}
                className="archive-item"
                style={{ viewTransitionName: `archive-${post.slug}` }}
              >
                <a className="archive-item__link" href={post.href}>{post.title}</a>
                <span className="archive-item__meta">{post.meta}</span>
              </li>
            ))}
          </ol>
        </section>
      ))}
      {posts.length === 0 && <p className="archive-empty">没有找到匹配的文章。</p>}
    </div>
  );
}
