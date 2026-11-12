// @vitest-environment jsdom
// Created by weixi on 2026/10/25.

import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import SiteHeader from '../../src/components/site/SiteHeader';
import SiteBanner from '../../src/components/site/SiteBanner';
import { createThemeController } from '../../src/lib/theme/controller';

let titleTop = 180;
let reduced = false;
let media: EventTarget;
let systemChanged: (dark: boolean) => void;
let stored: string | null;
let frames: Map<number, FrameRequestCallback>;

beforeEach(() => {
  titleTop = 180;
  reduced = false;
  stored = null;
  frames = new Map();
  let frameId = 0;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.set(++frameId, callback);
    return frameId;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  media = new EventTarget();
  Object.defineProperty(media, 'matches', { get: () => reduced });
  vi.stubGlobal('matchMedia', () => media);
  // jsdom has no layout. Only the browser's geometry boundary is replaced.
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    if (this.tagName === 'H1') return new DOMRect(0, titleTop, 300, 60);
    if (this.tagName === 'HEADER') return new DOMRect(0, 0, 1200, 60);
    return new DOMRect();
  });
  window.blogTheme = createThemeController({
    storage: { read: () => stored, write: (value) => { stored = value; } },
    system: { isDark: () => false, subscribe: (listener) => { systemChanged = listener; return () => {}; } },
  });
});

afterEach(() => {
  cleanup();
  window.blogTheme.dispose();
  vi.unstubAllGlobals();
});

function mount(pathname = '/', title = true) {
  // The Astro page's title is a sibling outside the React island.
  const result = render(<><SiteHeader pathname={pathname} /><main>{title && <SiteBanner variant={pathname === '/' ? 'home' : 'page'} title="页面标题" />}</main></>, { reactStrictMode: true });
  return { ...result, header: result.container.querySelector('header')! };
}

function scrollToTitle(top: number, event = 'scroll') {
  titleTop = top;
  act(() => {
    window.dispatchEvent(new Event(event));
    const callbacks = [...frames.values()];
    frames.clear();
    callbacks.forEach((callback) => callback(0));
  });
}

describe('SiteHeader title handoff', () => {
  it('leaves a separately hydrated banner consistent with its server markup', async () => {
    const main = document.createElement('main');
    const banner = <SiteBanner variant="home" title="页面标题" />;
    main.innerHTML = renderToString(banner);
    document.body.append(main);
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const header = render(<SiteHeader pathname="/" />);
    const hydrationError = vi.fn();
    let bannerRoot: ReturnType<typeof hydrateRoot> | undefined;
    try {
      await act(async () => { bannerRoot = hydrateRoot(main, banner, { onRecoverableError: hydrationError }); });
      expect(hydrationError).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
      expect(main.querySelector('h1')).not.toHaveAttribute('style');
    } finally {
      header.unmount();
      act(() => bannerRoot?.unmount());
      main.remove();
    }
  });
  it('keeps navigation available while the brand trades places with the page title', () => {
    const { header } = mount();
    expect(header).not.toHaveAttribute('inert');
    expect(screen.getByRole('navigation', { name: '主导航' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '打开主题设置' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '伟兮の小屋' })).not.toBeInTheDocument();
    scrollToTitle(30);
    expect(header.style.getPropertyValue('--header-progress')).toBe('0.5');
    expect(document.documentElement.style.getPropertyValue('--page-title-opacity')).toBe('0.5');
    scrollToTitle(-60);
    expect(header).not.toHaveAttribute('inert');
    expect(screen.getByRole('navigation', { name: '主导航' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '伟兮の小屋' })).toBeInTheDocument();
    scrollToTitle(-400);
    expect(header.style.getPropertyValue('--header-progress')).toBe('1');
    scrollToTitle(-250); // Reversing direction in the content must not hide it.
    expect(header.style.getPropertyValue('--header-progress')).toBe('1');
    scrollToTitle(180);
    expect(header).not.toHaveAttribute('inert');
    expect(screen.getByRole('navigation', { name: '主导航' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '伟兮の小屋' })).not.toBeInTheDocument();
    expect(document.documentElement.style.getPropertyValue('--page-title-opacity')).toBe('1');
  });

  it('shows a full navigation on pages without a title', () => {
    mount('/fonts/', false);
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('keeps navigation available on utility pages with a heading but no banner', () => {
    render(<><SiteHeader pathname="/fonts/" /><main><article className="prose"><h1>字体与许可</h1></article></main></>);
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByRole('heading').style.opacity).toBe('');
  });

  it('measures restored scroll position on mount and pageshow', () => {
    titleTop = -200;
    const { header } = mount('/posts/example/');
    expect(header).not.toHaveAttribute('inert');
    scrollToTitle(180, 'pageshow');
    expect(header.style.getPropertyValue('--header-progress')).toBe('0');
    expect(screen.queryByRole('link', { name: '伟兮の小屋' })).not.toBeInTheDocument();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('recalculates on resize and uses a discrete handoff with reduced motion', () => {
    const { header } = mount();
    scrollToTitle(30, 'resize');
    expect(header.style.getPropertyValue('--header-progress')).toBe('0.5');
    reduced = true;
    act(() => {
      media.dispatchEvent(new Event('change'));
      const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach((cb) => cb(0));
    });
    expect(header.style.getPropertyValue('--header-progress')).toBe('0');
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    scrollToTitle(0);
    expect(header.style.getPropertyValue('--header-progress')).toBe('1');
  });

  it('cancels pending work and restores the title when unmounted', () => {
    const { unmount } = mount();
    scrollToTitle(30);
    const title = screen.getByRole('heading');
    act(() => window.dispatchEvent(new Event('scroll')));
    expect(frames.size).toBe(1);
    unmount();
    expect(frames.size).toBe(0);
    expect(title.style.opacity).toBe('');
    expect(document.documentElement.style.getPropertyValue('--page-title-opacity')).toBe('');
    window.dispatchEvent(new Event('scroll'));
    expect(frames.size).toBe(0);
  });

  it.each([
    ['/', '首页'], ['/page/2/', '首页'], ['/archive/', '归档'], ['/about/', '关于'], ['/aboutness/', null], ['/posts/example/', null],
  ])('marks the correct link on %s', (path, selected) => {
    const { container } = mount(path, false);
    expect(container.querySelector('[aria-current="page"]')?.textContent ?? null).toBe(selected);
    expect(screen.getByRole('link', { name: '归档' })).toHaveAttribute('href', '/archive/');
  });
});

describe('SiteHeader appearance controls', () => {
  it('uses the shared controller, follows system changes, and preserves a manual choice', () => {
    mount('/', false);
    fireEvent.click(screen.getByRole('button', { name: '打开主题设置' }));
    expect(screen.getByRole('radio', { name: '跟随系统' })).toBeChecked();
    act(() => systemChanged(true));
    expect(window.blogTheme.getState().colorMode).toBe('dark');
    fireEvent.click(screen.getByRole('radio', { name: '浅色' }));
    expect(window.blogTheme.getState()).toEqual({ modePreference: 'light', colorMode: 'light' });
    act(() => { systemChanged(false); systemChanged(true); });
    expect(screen.getByRole('radio', { name: '浅色' })).toBeChecked();
    expect(window.blogTheme.getState().colorMode).toBe('light');
    expect(stored).toBe('{"mode":"light"}');
    fireEvent.click(screen.getByRole('radio', { name: '跟随系统' }));
    expect(window.blogTheme.getState().colorMode).toBe('dark');
  });

  it('closes on Escape with focus restored and dismisses on outside pointer down', () => {
    mount('/', false);
    const toggle = screen.getByRole('button', { name: '打开主题设置' });
    fireEvent.click(toggle);
    expect(screen.getByRole('radio', { name: '跟随系统' })).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(toggle).toHaveFocus();
    fireEvent.click(toggle);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens over the banner and keeps the panel available throughout the title handoff', () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: '打开主题设置' }));
    expect(screen.getByRole('radio', { name: '跟随系统' })).toHaveFocus();
    scrollToTitle(-100);
    scrollToTitle(180);
    expect(screen.getByRole('dialog', { name: '主题设置' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: '深色' }));
    expect(window.blogTheme.getState().modePreference).toBe('dark');
  });
});
