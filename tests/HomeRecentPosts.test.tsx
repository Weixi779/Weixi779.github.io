// @vitest-environment jsdom
// Created by weixi on 2026/10/25.

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import HomeRecentPosts, { type HomePost } from '../src/components/HomeRecentPosts';

const posts: HomePost[] = [
  { href: '/posts/cache/', title: '现代缓存体系探索', category: 'iOS', publishedAt: '2026-07-24', summary: '顺着缓存体系走一遭。' },
  { href: '/posts/wicompress/', title: '「iOS」解构与重组：AI 时代下的 WICompress 2.0', category: 'iOS', publishedAt: '2026-07-23', summary: '从 204 行的图片压缩工具到 WICompress 2.0，也重新理解人在 AI 编程中的位置。' },
];

afterEach(cleanup);

describe('HomeRecentPosts', () => {
  it('marks only recommended titles without changing article order or link destinations', () => {
    render(<HomeRecentPosts posts={[posts[0], { ...posts[1], recommended: true }]} />);
    const articles = screen.getAllByRole('article');
    expect(within(articles[0]).queryByRole('img', { name: '作者推荐' })).toBeNull();
    const title = within(articles[1]).getByRole('heading', { level: 3 });
    expect(within(title).getByRole('img', { name: '作者推荐' })).toBeInTheDocument();
    expect(within(title).getByRole('link')).toHaveAttribute('href', posts[1].href);
    expect(title.textContent).toBe('解构与重组：AI 时代下的 WICompress 2.0');
  });
  it('renders mixed short and long copy in full, with one introduction per article', () => {
    render(<HomeRecentPosts posts={posts} />);
    const articles = screen.getAllByRole('article');
    expect(articles).toHaveLength(2);
    articles.forEach((article, index) => {
      expect(within(article).getByRole('heading', { level: 3 })).toHaveTextContent(posts[index].title.replace('「iOS」', ''));
      expect(within(article).getByText(posts[index].summary)).toBeInTheDocument();
      expect(article.querySelectorAll('p')).toHaveLength(1);
      expect(article.querySelector('br')).toBeNull();
    });
    expect(screen.getByRole('link', { name: '现代缓存体系探索' })).toHaveAttribute('href', '/posts/cache/');
    expect(screen.getByRole('link', { name: '查看更多文章' })).toHaveAttribute('href', '/archive/');
  });

  it('groups the archive link with the section heading before the articles', () => {
    const { container } = render(<HomeRecentPosts posts={posts} />);
    const region = screen.getByRole('region', { name: '最近写下' });
    const header = region.querySelector('header')!;
    expect(within(header).getByRole('heading', { level: 2 })).toHaveTextContent('最近写下');
    expect(within(header).getByRole('link', { name: '查看更多文章' })).toHaveAttribute('href', '/archive/');
    expect(container.querySelectorAll('a[href="/archive/"]')).toHaveLength(1);
    expect(header.compareDocumentPosition(screen.getByRole('list')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('keeps dates machine-readable and categories separate from titles', () => {
    const { container } = render(<HomeRecentPosts posts={posts} />);
    expect(screen.getByText('2026 / 07 / 24')).toHaveAttribute('dateTime', '2026-07-24');
    expect(screen.getAllByText('iOS')).toHaveLength(2);
    expect(Array.from(container.querySelectorAll('[aria-hidden="true"]')).map(node => node.textContent)).toContain('01');
  });

  it.each(['「另一系列」标题', '标题「iOS」', '「iOS」'])('preserves meaningful title text: %s', title => {
    render(<HomeRecentPosts posts={[{ ...posts[0], title }]} />);
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(title);
  });

  it('server renders complete long copy and working links without hydration', () => {
    const long = { ...posts[0], title: '一个需要自然换行的标题'.repeat(12), summary: '一段需要完整展示的简介。'.repeat(30) };
    const document = new DOMParser().parseFromString(renderToStaticMarkup(<HomeRecentPosts posts={[long]} />), 'text/html');
    expect(document.querySelector('h3')?.textContent).toBe(long.title);
    expect(document.querySelector('article p')?.textContent).toBe(long.summary);
    expect(document.querySelector('h3 a')?.getAttribute('href')).toBe(long.href);
  });
});
