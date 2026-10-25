// Created by weixi on 2026/10/12.

import { useEffect, useRef, useState, type MouseEvent, type RefObject } from 'react';
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
  const searchInput = useRef<HTMLInputElement>(null);

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
  const years = new Map<string, ArchivePost[]>();
  for (const post of matchingPosts) {
    const yearPosts = years.get(post.year) ?? [];
    yearPosts.push(post);
    years.set(post.year, yearPosts);
  }

  function resetFilters() {
    const nextFilters = { query: '', category: ALL_CATEGORIES };
    writeUrlFilters(nextFilters, 'push');
    displayFilters(nextFilters, false);
    searchInput.current?.focus();
  }

  return (
    <div className="content-container archive-page">
      <ArchiveSearch
        inputRef={searchInput}
        query={filters.query}
        resultCount={matchingPosts.length}
        hasFilters={filters.query.length > 0 || filters.category !== ALL_CATEGORIES}
        onReset={resetFilters}
        onQueryChange={changeQuery}
        onSubmit={() => writeUrlFilters(filters, 'replace')}
      />
      <div className="archive-filter-line">
        <ArchiveCategories categories={categories} selectedCategory={filters.category} onSelect={selectCategory} />
        <nav className="archive-year-nav" aria-label="跳转年份">
          {Array.from(years.keys(), year => <a key={year} href={`#archive-year-${year}`}>{year}</a>)}
        </nav>
      </div>
      <ArchiveResults years={years} onReset={resetFilters} />
    </div>
  );
}

interface ArchiveSearchProps {
  inputRef: RefObject<HTMLInputElement | null>;
  query: string;
  resultCount: number;
  hasFilters: boolean;
  onReset: () => void;
  onQueryChange: (query: string) => void;
  onSubmit: () => void;
}

function ArchiveSearch({ inputRef, query, resultCount, hasFilters, onReset, onQueryChange, onSubmit }: ArchiveSearchProps) {
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
        <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="10.5" cy="10.5" r="6.7" /><path d="m16 16 4.5 4.5" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
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
          hidden={!hasFilters}
          onClick={onReset}
        >清除筛选</button>
      </form>
      <p id={ARCHIVE_IDS.resultStatus} className="archive-result-status visually-hidden" aria-live="polite">
        {resultCount} 篇文章
      </p>
    </div>
  );
}

interface ArchiveCategoriesProps {
  categories: ArchiveCategory[];
  selectedCategory: string;
  onSelect: (category: string) => void;
}

function ArchiveCategories({
  categories,
  selectedCategory,
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
      >全部</a>
      {categories.map(({ name }) => (
        <a
          key={name}
          href={`${ARCHIVE_PATH}?${ARCHIVE_PARAMS.category}=${encodeURIComponent(name)}`}
          aria-current={selectedCategory === name ? 'page' : undefined}
          onClick={(event) => handleClick(event, name)}
        >{name}</a>
      ))}
    </nav>
  );
}

interface ArchiveResultsProps {
  years: Map<string, ArchivePost[]>;
  onReset: () => void;
}

function ArchiveResults({ years, onReset }: ArchiveResultsProps) {
  return (
    <div id={ARCHIVE_IDS.results} className={years.size > 0 ? 'archive-timeline' : undefined}>
      {Array.from(years, ([year, yearPosts]) => (
        <section key={year} className="archive-year" id={`archive-year-${year}`} aria-labelledby={`archive-heading-${year}`}>
          <h2 id={`archive-heading-${year}`} style={{ viewTransitionName: `archive-year-${year}` }}>
            {year} <span className="archive-year__count">{yearPosts.length} 篇</span>
          </h2>
          <ol role="list">
            {yearPosts.map((post) => {
              // Match the homepage and banner's exact category-prefix rule.
              const prefix = `「${post.category}」`;
              const title = post.title.startsWith(prefix) ? post.title.slice(prefix.length).trimStart() || post.title : post.title;
              return (
                <li
                  key={post.href}
                  className="archive-item"
                  style={{ viewTransitionName: `archive-${post.slug}` }}
                >
                  <a className="archive-item__link" href={post.href}>{title}</a>
                  {post.tags.map(tag => <span className="archive-item__tag" key={tag}>
                    <span className="archive-item__dot" aria-hidden="true" />{tag}
                  </span>)}
                </li>
              );
            })}
          </ol>
        </section>
      ))}
      {years.size === 0 && <div className="archive-empty">
        <p>没有找到匹配的文章。</p><button type="button" onClick={onReset}>清除筛选</button>
      </div>}
    </div>
  );
}
