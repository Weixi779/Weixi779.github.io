// @vitest-environment jsdom
// Created by weixi on 2026/10/28.
import '@testing-library/jest-dom/vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { periods } from '../src/components/timeline/data';
import LifeTimeline from '../src/components/timeline/LifeTimeline';
import ArticlePreview from '../src/components/timeline/ArticlePreview';

// Articles are routes; experience spans above remain dialog entries.
const articles = [
  { slug: 'falling-behind', date: '2021-03-19', title: '掉队' },
  { slug: 'momentum', date: '2021-09-17', title: '做点什么' },
  { slug: 'year-2021-afterword', date: '2021-12-26', title: '2021 再见' },
  { slug: 'year-2022-afterword', date: '2022-12-27', title: '甚至没有机会告别' },
  { slug: 'developer-journey-year-3', date: '2024-07-15', title: '三年阶段总结' },
  { slug: 'japan-business-trip-notes', date: '2025-08-04', title: '日本出差随笔' },
  { slug: 'developer-journey-year-4', date: '2026-03-29', title: '第四年的后日谈' },
  { slug: 'observer', date: '2026-07-04', title: '旁观者' },
];

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });
it('previews article prose without replacing its direct link, switches previews, and dismisses outside', () => {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 1200 });
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  vi.stubGlobal('PointerEvent', MouseEvent);
  const prose = articles.map(article => ({ ...article, excerpt: `正文：${article.title}` }));
  render(<LifeTimeline articles={prose} />);
  const first = screen.getByRole('link', { name: /甚至没有机会告别/ });
  fireEvent.pointerEnter(screen.getByRole('button', { name: '选中《甚至没有机会告别》' }));
  const preview = screen.getByRole('link', { name: '预览《甚至没有机会告别》' });
  expect(preview).toHaveTextContent('正文：甚至没有机会告别');
  expect(preview).toHaveAttribute('href', '/posts/year-2022-afterword/');
  expect(first).toHaveAttribute('href', '/posts/year-2022-afterword/');
  fireEvent.pointerLeave(first);
  expect(preview).toBeInTheDocument();
  fireEvent.pointerEnter(screen.getByText('从校园走进工作，把这一年的记忆点留在这里。'));
  expect(preview).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: '预览《2021 再见》' })).toHaveTextContent('正文：2021 再见');
  fireEvent.click(document.body);
  expect(screen.queryByRole('link', { name: /^预览/ })).toBeNull();
  fireEvent.focus(first);
  expect(screen.getByRole('link', { name: '预览《甚至没有机会告别》' })).toBeInTheDocument();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('link', { name: /^预览/ })).toBeNull();
});
it('opens an event, returns to the canvas, and releases its observer on unmount', () => {
  const disconnect = vi.fn();
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect = disconnect; });
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); this.dispatchEvent(new Event('close')); };
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 1200 });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 600 });
  const view = render(<LifeTimeline articles={articles} />);
  expect(screen.queryByRole('button', { name: /碰爪 · iOS13/ })).toBeNull();
  expect(screen.queryByRole('button', { name: /7850 · Unity2D2022.03/ })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /天津 · 云账户2021.11/ }));
  expect(screen.getByRole('dialog')).toBeVisible();
  expect(screen.getByRole('dialog').querySelectorAll('details')).toHaveLength(4);
  expect(within(screen.getByRole('dialog')).getByText('7850 · Unity2D')).toBeInTheDocument();
  fireEvent.wheel(screen.getByRole('dialog'), { deltaY: 120 });
  expect(screen.getByRole('dialog')).toBeVisible();
  expect(within(screen.getByRole('dialog')).getByRole('link', { name: /三年阶段总结/ })).toHaveAttribute('href', '/posts/developer-journey-year-3/');
  fireEvent.click(screen.getByRole('button', { name: /天津 · 云账户2021.11/ }));
  expect(screen.queryByRole('dialog')).toBeNull();
  view.unmount();
  expect(disconnect).toHaveBeenCalledOnce();
});

it('navigates by year and keyboard and supports anchored zoom without a project filter', () => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  const frames: FrameRequestCallback[] = [];
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.push(callback); return frames.length; });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  render(<LifeTimeline articles={articles} />);
  fireEvent.click(screen.getByRole('button', { name: '跳转到 2022 年' }));
  act(() => { frames.shift()?.(0); });
  expect(screen.getByLabelText('当前年份')).toHaveTextContent('2022 / 07');
  const canvas = screen.getByLabelText('时间画布：滚动或拖动浏览，方向键移动');
  fireEvent.keyDown(canvas, { key: 'ArrowRight' });
  act(() => { frames.shift()?.(0); });
  expect(screen.getByLabelText('当前年份')).not.toHaveTextContent('2022 / 07');
  const beforeScroll = screen.getByLabelText('当前年份').textContent;
  const queuedFrames = frames.length;
  for (const deltaX of [0, 10]) {
    const vertical = new WheelEvent('wheel', { deltaX, deltaY: 80, cancelable: true });
    act(() => { canvas.dispatchEvent(vertical); });
    expect(vertical.defaultPrevented).toBe(false);
    expect(frames).toHaveLength(queuedFrames);
    expect(screen.getByLabelText('当前年份').textContent).toBe(beforeScroll);
  }
  const horizontal = new WheelEvent('wheel', { deltaX: 80, deltaY: 10, cancelable: true });
  act(() => { canvas.dispatchEvent(horizontal); });
  expect(horizontal.defaultPrevented).toBe(true);
  const beforeZoom = screen.getByLabelText('可见时间跨度').textContent;
  const zoom = new WheelEvent('wheel', { ctrlKey: true, deltaY: -50, clientX: 600, cancelable: true });
  act(() => { canvas.dispatchEvent(zoom); });
  expect(zoom.defaultPrevented).toBe(true);
  expect(screen.getByLabelText('可见时间跨度').textContent).not.toBe(beforeZoom);
  expect(screen.queryByRole('button', { name: '工作项目' })).toBeNull();
});

it('pans without accidentally opening the dragged event and cancels pending work on unmount', () => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  vi.stubGlobal('PointerEvent', MouseEvent);
  const frames: FrameRequestCallback[] = [];
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.push(callback); return frames.length; });
  const cancel = vi.fn();
  vi.stubGlobal('cancelAnimationFrame', cancel);
  HTMLElement.prototype.setPointerCapture = vi.fn();
  const view = render(<LifeTimeline articles={articles} />);
  const canvas = screen.getByLabelText('时间画布：滚动或拖动浏览，方向键移动');
  const eventButton = screen.getByRole('button', { name: /天津 · 云账户2021.11/ });
  fireEvent.pointerDown(eventButton, { button: 0, clientX: 600 });
  fireEvent.pointerMove(canvas, { clientX: 700 });
  fireEvent.pointerUp(canvas);
  fireEvent.click(eventButton);
  expect(screen.queryByRole('dialog')).toBeNull();
  act(() => { frames.shift()?.(0); });
  expect(screen.getByLabelText('当前年份')).not.toHaveTextContent('2022 / 10');
  fireEvent.wheel(canvas, { deltaX: 80 });
  expect(frames).toHaveLength(1);
  view.unmount();
  expect(cancel).toHaveBeenCalled();
  fireEvent.wheel(canvas, { deltaX: 80 });
  expect(frames).toHaveLength(1);
});


it('keeps university whole and the four work projects inside their parent, with a real Unity gap', () => {
  expect(periods.filter(period => period.entry === 'university')).toHaveLength(1);
  const parent = periods.find(period => period.id === 'first')!;
  const projects = periods.filter(period => period.parent === 'first');
  expect(new Set(projects.map(period => period.entry)).size).toBe(4);
  for (const project of projects) {
    expect(project.start).toBeGreaterThanOrEqual(parent.start);
    expect(project.end).toBeLessThanOrEqual(parent.end!);
    expect(project.row).toBeGreaterThan(parent.row);
  }
  const unity = projects.filter(period => period.entry === 'unity');
  expect(unity).toHaveLength(2);
  expect(unity[0].end).toBeLessThan(unity[1].start);
  expect(periods.some(period => period.entry === 'wi')).toBe(false);
});

it('selects a line without an expansion panel and keeps article titles as direct links', () => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  render(<LifeTimeline articles={articles} />);
  const marker = screen.getByRole('button', { name: '选中《甚至没有机会告别》' });
  fireEvent.click(marker);
  expect(marker).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('link', { name: /甚至没有机会告别/ })).toHaveAttribute('href', '/posts/year-2022-afterword/');
  expect(screen.queryByLabelText('选中的记录')).toBeNull();
  expect(screen.queryByRole('dialog')).toBeNull();
  fireEvent.pointerMove(screen.getByLabelText('时间画布：滚动或拖动浏览，方向键移动'), { clientX: 500 });
  fireEvent.pointerLeave(screen.getByLabelText('时间画布：滚动或拖动浏览，方向键移动'));
  expect(marker).toHaveAttribute('aria-pressed', 'true');
});
it('offers zoom controls and keeps all series members directly reachable', () => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  const frames: FrameRequestCallback[] = [];
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.push(callback); return frames.length; });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  render(<LifeTimeline articles={[...articles,
    { slug: 'unity-sandbox-building-camera-control', date: '2024-04-14', title: '相机控制' },
    { slug: 'unity-sandbox-building-command-pattern', date: '2024-04-22', title: '命令模式' },
  ]} />);
  fireEvent.click(screen.getByRole('button', { name: '跳转到 2024 年' }));
  act(() => { frames.shift()?.(0); });
  fireEvent.click(screen.getByRole('button', { name: '选中《沙盒建造游戏设计》' }));
  act(() => { frames.shift()?.(0); });
  expect(screen.queryByRole('link', { name: /相机控制/ })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '沙盒建造游戏设计 2 篇' }));
  expect(screen.getByRole('link', { name: /相机控制/ })).toHaveAttribute('href', '/posts/unity-sandbox-building-camera-control/');
  expect(screen.getByRole('link', { name: /命令模式/ })).toHaveAttribute('href', '/posts/unity-sandbox-building-command-pattern/');
  const before = screen.getByLabelText('可见时间跨度').textContent;
  const dateBefore = screen.getByLabelText('当前年份').textContent;
  fireEvent.click(screen.getByRole('button', { name: '放大时间轴' }));
  expect(screen.getByLabelText('可见时间跨度').textContent).not.toBe(before);
  expect(screen.getByLabelText('当前年份').textContent).toBe(dateBefore);
  fireEvent.click(screen.getByRole('button', { name: '重置' }));
  expect(Number.parseFloat(screen.getByLabelText('可见时间跨度').textContent!)).toBeGreaterThan(Number.parseFloat(before!));
});

it('handles two-finger pinch with the same scale controls and releases touch listeners', () => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  const view = render(<LifeTimeline articles={articles} />);
  const canvas = screen.getByLabelText('时间画布：滚动或拖动浏览，方向键移动');
  const remove = vi.spyOn(canvas, 'removeEventListener');
  const before = screen.getByLabelText('可见时间跨度').textContent;
  fireEvent.touchStart(canvas, { touches: [{ clientX: 400, clientY: 200 }, { clientX: 600, clientY: 200 }] });
  fireEvent.touchMove(canvas, { touches: [{ clientX: 300, clientY: 200 }, { clientX: 700, clientY: 200 }] });
  expect(screen.getByLabelText('可见时间跨度').textContent).not.toBe(before);
  fireEvent.touchEnd(canvas, { touches: [] });
  view.unmount();
  expect(remove.mock.calls.map(call => call[0])).toEqual(expect.arrayContaining(['touchstart', 'touchmove', 'touchend', 'touchcancel']));
});

it('highlights a node on hover without requiring a click or adding a dot', () => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  render(<LifeTimeline articles={articles} />);
  const marker = screen.getByRole('button', { name: '选中《甚至没有机会告别》' });
  const story = marker.closest('[data-story]')!;
  fireEvent.pointerEnter(story, { pointerType: 'mouse' });
  expect(story).toHaveClass('hovered', 'selected');
  expect(marker).toHaveAttribute('aria-pressed', 'false');
  expect(story.querySelector('.story-dot')).toBeNull();
  expect(screen.getByRole('link', { name: /甚至没有机会告别/ })).toHaveAttribute('href', '/posts/year-2022-afterword/');
  fireEvent.pointerLeave(story);
  expect(story).not.toHaveClass('hovered');
});
it('animates button zoom through intermediate scales while keeping its center stable', () => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  const frames: FrameRequestCallback[] = [];
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.push(callback); return frames.length; });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  render(<LifeTimeline articles={articles} />);
  const before = screen.getByLabelText('可见时间跨度').textContent;
  const center = screen.getByLabelText('当前年份').textContent;
  fireEvent.click(screen.getByRole('button', { name: '放大时间轴' }));
  expect(screen.getByLabelText('可见时间跨度').textContent).toBe(before);
  act(() => { frames.shift()?.(0); });
  const middle = screen.getByLabelText('可见时间跨度').textContent;
  expect(middle).not.toBe(before);
  act(() => { for (let i = 0; i < 80 && frames.length; i++) frames.shift()?.(i * 16); });
  expect(screen.getByLabelText('可见时间跨度').textContent).not.toBe(middle);
  expect(screen.getByLabelText('当前年份').textContent).toBe(center);
  expect(frames).toHaveLength(0);
});

it('keeps the neighbouring title visible when hovering a dense story', () => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  const frames: FrameRequestCallback[] = [];
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.push(callback); return frames.length; });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  render(<LifeTimeline articles={articles} />);
  fireEvent.click(screen.getByRole('button', { name: '跳转到 2026 年' }));
  act(() => { frames.shift()?.(0); });
  expect(screen.getByRole('link', { name: /第四年的后日谈/ })).toBeVisible();
  const story = screen.getByRole('button', { name: '选中《旁观者》' }).closest('[data-story]')!;
  fireEvent.pointerEnter(story, { pointerType: 'mouse' });
  expect(screen.getByRole('link', { name: /第四年的后日谈/ })).toBeVisible();
  expect(screen.getByRole('link', { name: /旁观者/ })).toBeVisible();
});

it('pans a selected mobile title completely into view with room for emphasis', () => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 390 });
  const frames: FrameRequestCallback[] = [];
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.push(callback); return frames.length; });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  render(<LifeTimeline articles={articles} />);
  const marker = screen.getByRole('button', { name: '选中《甚至没有机会告别》' });
  fireEvent.click(marker);
  act(() => { frames.shift()?.(0); });
  const story = marker.closest('[data-story]') as HTMLElement;
  const label = story.querySelector('.story-label') as HTMLElement;
  const left = Number.parseFloat(story.style.left);
  expect(left).toBeGreaterThanOrEqual(23.9);
  expect(left + Number.parseFloat(label.style.width) * 1.065).toBeLessThanOrEqual(366.1);
  expect(screen.getByLabelText('时间画布：滚动或拖动浏览，方向键移动').style.height).toBe('714px');
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 1200 });
});

it('finishes entrance despite interaction and plays once per tab session', () => {
  vi.useFakeTimers();
  sessionStorage.clear();
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  const first = render(<LifeTimeline articles={articles} />);
  expect(screen.getByRole('region', { name: '一路走来' })).toHaveClass('entering');
  expect(screen.getByRole('region', { name: '一路走来' })).toHaveAttribute('inert');
  expect(sessionStorage.getItem('life-timeline:entered-v2')).toBeNull();
  fireEvent.pointerMove(screen.getByRole('region', { name: '一路走来' }), { movementX: 5 });
  expect(screen.getByRole('region', { name: '一路走来' })).toHaveClass('entering');
  fireEvent.pointerDown(screen.getByRole('region', { name: '一路走来' }));
  fireEvent.wheel(screen.getByRole('region', { name: '一路走来' }));
  fireEvent.keyDown(screen.getByRole('region', { name: '一路走来' }), { key: 'Tab' });
  expect(screen.getByRole('region', { name: '一路走来' })).toHaveClass('entering');
  act(() => { vi.advanceTimersByTime(800); });
  expect(screen.getByRole('region', { name: '一路走来' })).not.toHaveClass('entering');
  expect(screen.getByRole('region', { name: '一路走来' })).not.toHaveAttribute('inert');
  first.unmount();
  render(<LifeTimeline articles={articles} />);
  expect(screen.getByRole('region', { name: '一路走来' })).not.toHaveClass('entering');
  sessionStorage.clear();
  vi.useRealTimers();
});

it('finishes entrance after 800ms and respects reduced motion', () => {
  sessionStorage.clear();
  vi.useFakeTimers();
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  const first = render(<LifeTimeline articles={articles} />);
  act(() => { vi.advanceTimersByTime(800); });
  expect(screen.getByRole('region', { name: '一路走来' })).not.toHaveClass('entering');
  first.unmount();
  sessionStorage.clear();
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  render(<LifeTimeline articles={articles} />);
  expect(screen.getByRole('region', { name: '一路走来' })).not.toHaveClass('entering');
  vi.useRealTimers();
  sessionStorage.clear();
});

it('does not consume the entrance while the page is hidden', () => {
  sessionStorage.clear();
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
  render(<LifeTimeline articles={articles} />);
  expect(screen.getByRole('region', { name: '一路走来' })).not.toHaveClass('entering');
  expect(sessionStorage.getItem('life-timeline:entered-v2')).toBeNull();
  visibility.mockReturnValue('visible');
  fireEvent(document, new Event('visibilitychange'));
  expect(screen.getByRole('region', { name: '一路走来' })).toHaveClass('entering');
  visibility.mockRestore();
  sessionStorage.clear();
});

it('replays on refresh even when a previous document already played', () => {
  sessionStorage.setItem('life-timeline:entered-v2', '1');
  sessionStorage.setItem('life-timeline:entered-v2:document', 'previous-document');
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  const navigation = vi.spyOn(performance, 'getEntriesByType').mockReturnValue([{ type: 'reload' } as PerformanceNavigationTiming]);
  render(<LifeTimeline articles={articles} />);
  expect(screen.getByRole('region', { name: '一路走来' })).toHaveClass('entering');
  expect(screen.getByRole('region', { name: '一路走来' })).toHaveAttribute('inert');
  navigation.mockRestore();
  sessionStorage.clear();
});

it.each([
  ['unity-series', '沙盒建造游戏设计', 2024, [
    ['unity-sandbox-building-camera-control', '相机控制'],
    ['unity-sandbox-building-command-pattern', '命令模式'],
    ['unity-sandbox-building-state-pattern', '状态模式'],
    ['unity-sandbox-building-search-algorithms', '搜索算法'],
  ]],
  ['cache-images', '缓存与网络图片', 2026, [
    ['caffeine-moka-cache-notes', '缓存研究'], ['ios-network-image-survey', '网络图片'],
  ]],
] as const)('shows %s members together in one stable directory', (_id, title, year, members) => {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 1200 });
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  vi.stubGlobal('PointerEvent', MouseEvent);
  const frames: FrameRequestCallback[] = [];
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.push(callback); return frames.length; });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  render(<LifeTimeline articles={members.map(([slug, title]) => ({ slug, title, date: `${year}-04-14` }))} />);
  fireEvent.click(screen.getByRole('button', { name: `跳转到 ${year} 年` }));
  act(() => { frames.shift()?.(0); });
  fireEvent.click(screen.getByRole('button', { name: `选中《${title}》` }));
  act(() => { frames.shift()?.(0); });
  const trigger = screen.getByRole('button', { name: `${title} ${members.length} 篇` });
  expect(screen.queryByRole('link')).toBeNull();
  fireEvent.pointerEnter(trigger);
  const directory = screen.getByRole('region', { name: `${title}系列目录` });
  expect(directory.querySelectorAll('a')).toHaveLength(members.length);
  for (const [slug, name] of members) {
    const link = screen.getByRole('link', { name: new RegExp(name) });
    expect(link).toHaveAttribute('href', `/posts/${slug}/`);
    fireEvent.pointerEnter(link);
    expect(screen.getByRole('region', { name: `${title}系列目录` })).toBe(directory);
  }
  expect(trigger).toHaveAttribute('aria-expanded', 'true');
  fireEvent.click(document.body);
  expect(screen.queryByRole('region', { name: `${title}系列目录` })).toBeNull();
  fireEvent.click(trigger);
  expect(screen.getByRole('region', { name: `${title}系列目录` })).toBeInTheDocument();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
});

it('places a tall series directory beside its trigger instead of covering the opening click', () => {
  vi.stubGlobal('innerWidth', 1280);
  vi.stubGlobal('innerHeight', 720);
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  const trigger = document.createElement('button');
  document.body.append(trigger);
  const bounds = (left: number, top: number, width: number, height: number) => ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON() {} });
  const rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    return this === trigger ? bounds(300, 400, 260, 40) : bounds(0, 0, 450, 350);
  });
  const offset = vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(450);
  try {
    render(<ArticlePreview anchor={trigger} onDismiss={() => {}} story={{ id: 'series', title: '系列', date: '2024-04-14', endDate: '2024-05-04', level: 'medium', intro: '导读', related: [], articles: articles.slice(0, 2) }} />);
    const bubble = screen.getByRole('region', { name: '系列系列目录' });
    const left = Number.parseFloat(bubble.style.left), top = Number.parseFloat(bubble.style.top);
    expect(left + 450 <= 300 || left >= 560 || top + 350 <= 400 || top >= 440).toBe(true);
    expect(top).toBeGreaterThanOrEqual(72);
    expect(top + 350).toBeLessThanOrEqual(704);
  } finally {
    rect.mockRestore(); offset.mockRestore(); trigger.remove();
  }
});

it('fits the whole elastic timeline when zooming out from the last year', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-31T00:00:00Z'));
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 1200 });
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  const frames: FrameRequestCallback[] = [];
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.push(callback); return frames.length; });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  const view = render(<LifeTimeline articles={articles} />);
  fireEvent.click(screen.getByRole('button', { name: '跳转到 2026 年' }));
  act(() => { frames.shift()?.(0); });
  for (let i = 0; i < 20; i++) fireEvent.click(screen.getByRole('button', { name: '缩小时间轴' }));
  expect(screen.getByLabelText('可见时间跨度')).toHaveTextContent('8.8 年');
  expect(Array.from(view.container.querySelectorAll('.axis-label')).map(el => el.textContent)).toEqual(expect.arrayContaining(['2018', '2026']));
  expect(screen.queryByRole('link', { name: /旁观者/ })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '跳转到 2026 年' }));
  act(() => { frames.shift()?.(0); });
  expect(screen.getByLabelText('可见时间跨度')).not.toHaveTextContent('9.0 年');
});

it('keeps previews dismissed while titles move during a zoom', () => {
  sessionStorage.setItem('life-timeline:entered-v2', '1');
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.stubGlobal('PointerEvent', MouseEvent);
  render(<LifeTimeline articles={articles.map(a => ({ ...a, excerpt: a.title }))} />);
  fireEvent.click(screen.getByRole('button', { name: '放大时间轴' }));
  fireEvent.pointerEnter(screen.getByRole('button', { name: '选中《甚至没有机会告别》' }));
  expect(screen.queryByRole('link', { name: /^预览/ })).toBeNull();
  sessionStorage.clear();
});

it('updates the current end across New Year while retaining the reading position', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-12-31T15:59:59Z'));
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 1200 });
  const { unmount } = render(<LifeTimeline articles={articles} initialDate="2026-10-31" />);
  const position = screen.getByLabelText('当前年份').textContent;
  expect(screen.queryByRole('button', { name: '跳转到 2027 年' })).toBeNull();
  act(() => { vi.advanceTimersByTime(1001); });
  expect(screen.getByRole('button', { name: '跳转到 2027 年' })).toBeInTheDocument();
  expect(screen.getByLabelText('当前年份')).toHaveTextContent(position!);
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});


it('keeps hand-drawn SVG paths identical across insignificant math rounding differences', () => {
  const paths = () => {
    const html = renderToStaticMarkup(<LifeTimeline articles={articles} initialDate="2026-10-31" />);
    const document = new DOMParser().parseFromString(html, 'text/html');
    return Array.from(document.querySelectorAll('.branch-main'), path => path.getAttribute('d'));
  };
  const server = paths();
  expect(server.length).toBeGreaterThan(0);
  const sin = Math.sin;
  const alternateEngine = vi.spyOn(Math, 'sin').mockImplementation(value => sin(value) + Number.EPSILON);
  try {
    expect(paths()).toEqual(server);
  } finally {
    alternateEngine.mockRestore();
  }
});


it('guides exploration without previewing an unreadable title', () => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  vi.stubGlobal('PointerEvent', MouseEvent);
  render(<LifeTimeline articles={articles.map((a, i) => ({ ...a, date: `2022-07-${String(i + 1).padStart(2, '0')}`, excerpt: a.title }))} />);
  const marker = screen.getByRole('button', { name: '选中《甚至没有机会告别》', hidden: true });
  expect(marker.closest('.story')?.querySelector('.story-label')).toHaveAttribute('aria-hidden', 'true');
  fireEvent.pointerEnter(marker);
  expect(screen.queryByRole('link', { name: /^预览/ })).toBeNull();
  expect(screen.queryByText('点击展开')).toBeNull();
  expect(screen.queryByText(/条记录未展开/)).toBeNull();
  const story = marker.closest<HTMLElement>('.story')!;
  const before = parseFloat(story.style.getPropertyValue('--stem'));
  fireEvent.pointerMove(screen.getByLabelText('时间画布：滚动或拖动浏览，方向键移动'), {
    clientX: parseFloat(story.style.left), clientY: parseFloat(story.style.top) - 20,
  });
  expect(parseFloat(story.style.getPropertyValue('--stem'))).toBeGreaterThan(before);
  expect(screen.queryByRole('link', { name: /^预览/ })).toBeNull();
});

it('leaves a recognizable stem below a measured multi-line introduction', () => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  const height = vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) { return this.tagName === 'P' ? 72 : 0; });
  try {
    const view = render(<LifeTimeline articles={articles.filter(a => ['year-2021-afterword', 'year-2022-afterword'].includes(a.slug))} />);
    const story = view.container.querySelector<HTMLElement>('[data-story="year-2022-afterword"]')!;
    const stem = parseFloat(story.style.getPropertyValue('--stem'));
    const bottom = parseFloat(story.style.getPropertyValue('--label-bottom'));
    expect(stem).toBeGreaterThanOrEqual(48);
    expect(bottom - stem).toBeGreaterThanOrEqual(72 + 10 + 14);
  } finally { height.mockRestore(); }
});
