// @vitest-environment jsdom
// Created by weixi on 2026/10/14.

import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import ArchiveBrowser from '../src/components/ArchiveBrowser';
import { categories, posts } from './fixtures/archive';

beforeEach(() => {
  window.history.replaceState({}, '', '/archive/');
});

afterEach(() => {
  cleanup();
});

function renderArchive() {
  const user = userEvent.setup();
  render(<ArchiveBrowser posts={posts} categories={categories} />, { reactStrictMode: true });
  return user;
}

function searchInput() {
  return screen.getByRole('searchbox', { name: '搜索文章' });
}

function categoryLink(name: string) {
  return within(screen.getByRole('navigation', { name: '按分类筛选文章' }))
    .getByRole('link', { name });
}

function articleTitles() {
  return screen.queryAllByRole('listitem').map((item) => within(item).getByRole('link').textContent);
}

describe('ArchiveBrowser', () => {
  it('keeps the recommendation attached to its title through filtering', async () => {
    const user = userEvent.setup();
    render(<ArchiveBrowser posts={posts.map((post, index) => ({ ...post, recommended: index === 0 }))} categories={categories} />);
    expect(screen.getAllByRole('img', { name: '作者推荐' })).toHaveLength(1);
    expect(screen.getByRole('img', { name: '作者推荐' }).closest('a')).toHaveAttribute('href', posts[0].href);
    await user.type(searchInput(), '网络图片');
    expect(screen.queryByRole('img', { name: '作者推荐' })).toBeNull();
    await user.clear(searchInput());
    expect(screen.getByRole('img', { name: '作者推荐' }).closest('a')).toHaveAttribute('href', posts[0].href);
  });
  it('renders the full archive grouped by year with working article links', () => {
    renderArchive();

    expect(articleTitles()).toEqual([
      'WICompress 图片压缩', '归档页接入 React', '网络图片调研', '为什么还在创作',
    ]);
    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent))
      .toEqual(['2026 2 篇', '2025 1 篇', '2024 1 篇']);
    expect(screen.getByRole('link', { name: '网络图片调研' })).toHaveAttribute('href', '/posts/image-cache/');
    expect(searchInput()).toHaveAccessibleDescription('4 篇文章');
    expect(categoryLink('全部')).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByRole('button', { name: '清除筛选' })).not.toBeInTheDocument();
  });

  it('updates articles, count and year groups while typing normalized input', async () => {
    const user = renderArchive();
    await user.type(searchInput(), '  ＷＩＣＯＭＰＲＥＳＳ　');

    expect(articleTitles()).toEqual(['WICompress 图片压缩']);
    expect(searchInput()).toHaveAccessibleDescription('1 篇文章');
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(1);
    expect(screen.getByRole('heading', { name: '2026 1 篇' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '清除筛选' })).toBeVisible();
  });

  it('combines search and category, shows an empty state, and restores matches with All', async () => {
    const user = renderArchive();
    await user.type(searchInput(), '图片');
    await user.click(categoryLink('iOS'));
    expect(articleTitles()).toEqual(['WICompress 图片压缩', '网络图片调研']);
    expect(categoryLink('iOS')).toHaveAttribute('aria-current', 'page');
    expect(categoryLink('全部')).not.toHaveAttribute('aria-current');

    await user.click(categoryLink('Web'));
    expect(searchInput()).toHaveValue('图片');
    expect(searchInput()).toHaveAccessibleDescription('0 篇文章');
    expect(articleTitles()).toEqual([]);
    expect(screen.queryAllByRole('heading', { level: 2 })).toHaveLength(0);
    expect(screen.getByText('没有找到匹配的文章。')).toBeVisible();

    await user.click(categoryLink('全部'));
    expect(articleTitles()).toEqual(['WICompress 图片压缩', '网络图片调研']);
    expect(searchInput()).toHaveAccessibleDescription('2 篇文章');
    expect(screen.queryByText('没有找到匹配的文章。')).not.toBeInTheDocument();
    expect(new URLSearchParams(window.location.search).has('category')).toBe(false);
  });

  it('clears both filters and returns focus to search', async () => {
    const user = renderArchive();
    await user.click(categoryLink('iOS'));
    await user.type(searchInput(), 'WICompress');
    expect(articleTitles()).toEqual(['WICompress 图片压缩']);

    await user.click(screen.getByRole('button', { name: '清除筛选' }));

    expect(searchInput()).toHaveValue('');
    expect(searchInput()).toHaveFocus();
    expect(searchInput()).toHaveAccessibleDescription('4 篇文章');
    expect(articleTitles()).toHaveLength(4);
    expect(categoryLink('全部')).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByRole('button', { name: '清除筛选' })).not.toBeInTheDocument();
    expect(new URLSearchParams(window.location.search).has('category')).toBe(false);
    expect(new URLSearchParams(window.location.search).has('q')).toBe(false);
  });

  it('restores the initial query and category from the URL', () => {
    window.history.replaceState({}, '', '/archive/?category=iOS&q=缓存');
    renderArchive();

    expect(searchInput()).toHaveValue('缓存');
    expect(categoryLink('iOS')).toHaveAttribute('aria-current', 'page');
    expect(articleTitles()).toEqual(['网络图片调研']);
    expect(searchInput()).toHaveAccessibleDescription('1 篇文章');
  });

  it('falls back to All for an unknown URL category without losing the query', () => {
    window.history.replaceState({}, '', '/archive/?category=missing&q=React');
    renderArchive();

    expect(categoryLink('全部')).toHaveAttribute('aria-current', 'page');
    expect(searchInput()).toHaveValue('React');
    expect(articleTitles()).toEqual(['归档页接入 React']);
  });

  it('replaces search history, pushes category changes and preserves unrelated URL state', async () => {
    window.history.replaceState({}, '', '/archive/?ref=home&tag=legacy#reading');
    const user = renderArchive();
    const initialHistoryLength = window.history.length;

    await user.type(searchInput(), '  React  ');
    await user.keyboard('{Enter}');
    expect(window.history.length).toBe(initialHistoryLength);
    expect(searchInput()).toHaveValue('  React  ');
    expect(new URLSearchParams(window.location.search).get('q')).toBe('React');
    expect(new URLSearchParams(window.location.search).get('ref')).toBe('home');
    expect(new URLSearchParams(window.location.search).has('tag')).toBe(false);
    expect(window.location.hash).toBe('#reading');

    await user.click(categoryLink('Web'));
    expect(window.history.length).toBe(initialHistoryLength + 1);
    expect(new URLSearchParams(window.location.search).get('category')).toBe('Web');
    expect(new URLSearchParams(window.location.search).get('q')).toBe('React');
    await user.click(categoryLink('Web'));
    expect(window.history.length).toBe(initialHistoryLength + 1);
  });

  it('resynchronizes input, selection and results when a popstate event arrives', () => {
    renderArchive();

    // Exercise the component's event handling; actual browser Back/Forward is a separate check.
    act(() => {
      window.history.replaceState({}, '', '/archive/?category=iOS&q=缓存');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(searchInput()).toHaveValue('缓存');
    expect(categoryLink('iOS')).toHaveAttribute('aria-current', 'page');
    expect(articleTitles()).toEqual(['网络图片调研']);

    act(() => {
      window.history.replaceState({}, '', '/archive/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(searchInput()).toHaveValue('');
    expect(categoryLink('全部')).toHaveAttribute('aria-current', 'page');
    expect(searchInput()).toHaveAccessibleDescription('4 篇文章');
  });
});

describe('archive timeline', () => {
  it('shows actual tags after titles, without substituting a category for an untagged post', () => {
    render(<ArchiveBrowser posts={[
      { ...posts[0], title: '「iOS」WICompress 图片压缩', tags: ['图片', '性能'] },
      { ...posts[1], tags: [] },
    ]} categories={categories} />);
    const rows = screen.getAllByRole('listitem');
    expect(within(rows[0]).getByRole('link')).toHaveTextContent(/^WICompress 图片压缩$/);
    expect(within(rows[0]).getByText('图片')).toBeVisible();
    expect(within(rows[0]).getByText('性能')).toBeVisible();
    expect(within(rows[0]).queryByText('iOS')).not.toBeInTheDocument();
    expect(rows[1].textContent).toBe('归档页接入 React');
  });

  it('updates year counts and anchor destinations after filtering, without filtering by year', async () => {
    const user = renderArchive();
    const years = () => within(screen.getByRole('navigation', { name: '跳转年份' })).queryAllByRole('link');
    expect(years().map(link => link.getAttribute('href'))).toEqual(['#archive-year-2026', '#archive-year-2025', '#archive-year-2024']);
    for (const link of years()) expect(document.querySelector(link.getAttribute('href')!)).not.toBeNull();
    await user.click(categoryLink('iOS'));
    expect(screen.getAllByRole('heading', { level: 2 }).map(heading => heading.textContent)).toEqual(['2026 1 篇', '2025 1 篇']);
    expect(years()).toHaveLength(2);
    await user.click(years()[1]);
    expect(articleTitles()).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: '清除筛选' }));
    expect(years()).toHaveLength(3);
    expect(articleTitles()).toHaveLength(4);
  });

  it('can reset an empty combination and restores the entire archive', async () => {
    const user = renderArchive();
    await user.type(searchInput(), '图片');
    await user.click(categoryLink('Web'));
    const empty = screen.getByText('没有找到匹配的文章。').parentElement!;
    await user.click(within(empty).getByRole('button', { name: '清除筛选' }));
    expect(searchInput()).toHaveValue('');
    expect(articleTitles()).toHaveLength(4);
    expect(window.location.search).toBe('');
  });

  it('keeps every item in a larger archive available without pagination', () => {
    const many = Array.from({ length: 240 }, (_, index) => ({ ...posts[0], slug: `post-${index}`, href: `/posts/post-${index}/` }));
    render(<ArchiveBrowser posts={many} categories={categories} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(240);
    expect(screen.getByRole('heading', { name: '2026 240 篇' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').at(-1)?.querySelector('a')).toHaveAttribute('href', '/posts/post-239/');
  });
});
