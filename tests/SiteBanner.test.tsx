// @vitest-environment jsdom
// Created by weixi on 2026/10/25.

import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SiteBanner from '../src/components/SiteBanner';

let reduced = false;
let media: EventTarget;
beforeEach(() => {
  vi.useFakeTimers();
  reduced = false;
  media = new EventTarget();
  Object.defineProperty(media, 'matches', { get: () => reduced });
  vi.stubGlobal('matchMedia', () => media);
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('SiteBanner', () => {
  it('places page-specific content after the summary without replacing the title', () => {
    const html = renderToStaticMarkup(<SiteBanner title="归档" summary="一点一滴">
      <p aria-label="归档统计">共 27 篇文章，累计约 6.2 万字</p>
    </SiteBanner>);
    const document = new DOMParser().parseFromString(html, 'text/html');
    expect(document.querySelector('h1')?.textContent).toBe('归档');
    expect(document.querySelector('.page-hero__summary')?.nextElementSibling?.textContent).toBe('共 27 篇文章，累计约 6.2 万字');
  });
  it('separates only an exact category prefix and preserves the rest of the title', () => {
    render(<SiteBanner title="「后日谈」热爱也有难以回答的问题" category="后日谈" publishedAt="2026-09-24" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/^热爱也有难以回答的问题$/);
    expect(screen.getByText('后日谈')).toBeInTheDocument();
    expect(screen.getByText('2026-09-24')).toHaveAttribute('dateTime', '2026-09-24');
  });

  it.each(['「另一系列」热爱也有难以回答的问题', '热爱「后日谈」里的问题', '「后日谈」'])('does not remove meaningful title text: %s', (title) => {
    render(<SiteBanner title={title} category="后日谈" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(title);
  });

  it('server renders the full long title and summary, including without a poster', () => {
    const title = 'Deconstructing and Rebuilding WICompress 2.0 in the Age of AI';
    const summary = 'How a 204-line image compression utility became WICompress 2.0—and what that taught me about authorship in AI-assisted engineering.';
    const html = renderToStaticMarkup(<SiteBanner title={title} summary={summary} />);
    const document = new DOMParser().parseFromString(html, 'text/html');
    expect(document.querySelector('h1')?.textContent).toBe(title);
    expect(document.querySelector('.page-hero__summary')?.textContent).toBe(summary);
    expect(document.querySelector('.site-banner__scene')).toBeNull();
  });

  it('retains translated article destinations and the active language before hydration', () => {
    render(<SiteBanner title="解构与重组" translations={[
      { href: '/posts/wicompress/', language: 'zh-CN', label: '中文', current: true },
      { href: '/en/posts/wicompress/', language: 'en', label: 'English', current: false },
    ]} />);
    expect(screen.getByRole('link', { name: '中文' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'English' })).toHaveAttribute('href', '/en/posts/wicompress/');
    expect(screen.getByRole('link', { name: 'English' })).toHaveAttribute('lang', 'en');
    expect(screen.getByRole('link', { name: 'English' })).not.toHaveAttribute('aria-current');
  });

  it('keeps the complete home quote available while its visual copy animates', () => {
    const quote = 'What I cannot create, I do not understand.';
    const { container } = render(<SiteBanner variant="home" title="伟兮の小屋" summary={quote} eyebrow="WEIXI’S SPACE" />);
    expect(container.querySelector('.site-banner__quote-text')).toHaveTextContent(quote);
    const animated = container.querySelector('.site-banner__typing');
    expect(animated).toHaveAttribute('aria-hidden', 'true');
    expect(animated?.textContent).toBe(quote);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('continues past the first second and finishes the quote without an active cursor', () => {
    const quote = 'What I cannot create, I do not understand.';
    const { container } = render(<SiteBanner variant="home" title="首页" summary={quote} />);
    const visibleText = () => Array.from(container.querySelectorAll<HTMLElement>('.site-banner__letter'))
      .filter(letter => letter.style.visibility !== 'hidden').map(letter => letter.textContent).join('');
    expect(visibleText()).toBe('');
    act(() => { vi.advanceTimersByTime(1000); });
    expect(visibleText()).toBe('What I cannot c');
    act(() => { vi.advanceTimersByTime(2000); });
    expect(visibleText()).toBe(quote);
    expect(container.querySelector('[data-cursor]')).toBeNull();
    act(() => { window.dispatchEvent(new Event('scroll')); });
    expect(visibleText()).toBe(quote);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('finishes immediately for reduced motion and does not restart when it is turned off', () => {
    const { container } = render(<SiteBanner variant="home" title="首页" summary="An entire sentence." />);
    act(() => { reduced = true; media.dispatchEvent(new Event('change')); });
    expect(Array.from(container.querySelectorAll<HTMLElement>('.site-banner__letter')).every(letter => letter.style.visibility === 'visible')).toBe(true);
    act(() => { reduced = false; media.dispatchEvent(new Event('change')); });
    expect(vi.getTimerCount()).toBe(0);
    expect(container.querySelector('[data-cursor]')).toBeNull();
  });

  it('preserves a complete quote when returning from history and cancels timers on unmount', () => {
    const { container, unmount } = render(<SiteBanner variant="home" title="首页" summary="An entire sentence." />);
    act(() => { vi.advanceTimersByTime(500); window.dispatchEvent(new Event('pagehide')); });
    act(() => { window.dispatchEvent(new Event('pageshow')); });
    expect(Array.from(container.querySelectorAll<HTMLElement>('.site-banner__letter')).every(letter => letter.style.visibility === 'visible')).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    unmount();
    const other = render(<SiteBanner variant="home" title="首页" summary="Another sentence." />);
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    other.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
