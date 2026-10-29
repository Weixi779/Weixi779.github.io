// @vitest-environment jsdom
// Created by weixi on 2026/10/28.
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { periods } from '../src/components/timeline/data';
import LifeTimeline from '../src/components/timeline/LifeTimeline';

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

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
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
  expect(screen.getByRole('button', { name: /碰爪 · iOS13/ })).toBeVisible();
  expect(screen.getByRole('button', { name: /7850 · Unity2D2022.03/ })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: /第一份工作2021.11/ }));
  expect(screen.getByRole('dialog')).toHaveAttribute('open');
  expect(screen.getByRole('link', { name: /三年阶段总结/ })).toHaveAttribute('href', '/posts/developer-journey-year-3/');
  fireEvent.click(screen.getByRole('button', { name: /回到刚才的时间/ }));
  expect(screen.queryByRole('dialog')).toBeNull();
  view.unmount();
  expect(disconnect).toHaveBeenCalledOnce();
});

it('navigates by year and keyboard, filters spans, and supports anchored zoom', () => {
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
  const beforeZoom = screen.getByLabelText('可见时间跨度').textContent;
  const zoom = new WheelEvent('wheel', { ctrlKey: true, deltaY: -50, clientX: 600, cancelable: true });
  act(() => { canvas.dispatchEvent(zoom); });
  expect(zoom.defaultPrevented).toBe(true);
  expect(screen.getByLabelText('可见时间跨度').textContent).not.toBe(beforeZoom);
  fireEvent.click(screen.getByRole('button', { name: '工作项目' }));
  act(() => { frames.shift()?.(0); });
  expect(screen.getByRole('button', { name: /碰爪 · iOS13/ })).toBeVisible();
  expect(screen.queryByRole('button', { name: /大学/ })).toBeNull();
  expect(screen.getByRole('button', { name: '工作项目' })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(screen.getByRole('button', { name: '全部' }));
  expect(screen.getByRole('button', { name: /大学/ })).toBeVisible();
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
  const eventButton = screen.getByRole('button', { name: /第一份工作2021.11/ });
  fireEvent.pointerDown(eventButton, { button: 0, clientX: 600 });
  fireEvent.pointerMove(canvas, { clientX: 700 });
  fireEvent.pointerUp(canvas);
  fireEvent.click(eventButton);
  expect(screen.queryByRole('dialog')).toBeNull();
  act(() => { frames.shift()?.(0); });
  expect(screen.getByLabelText('当前年份')).not.toHaveTextContent('2022 / 10');
  fireEvent.wheel(canvas, { deltaY: 80 });
  expect(frames).toHaveLength(1);
  view.unmount();
  expect(cancel).toHaveBeenCalled();
  fireEvent.wheel(canvas, { deltaY: 80 });
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
  expect(screen.getByRole('link', { name: /相机控制/ })).toHaveAttribute('href', '/posts/unity-sandbox-building-camera-control/');
  expect(screen.getByRole('link', { name: /命令模式/ })).toHaveAttribute('href', '/posts/unity-sandbox-building-command-pattern/');
  const before = screen.getByLabelText('可见时间跨度').textContent;
  const dateBefore = screen.getByLabelText('当前年份').textContent;
  fireEvent.click(screen.getByRole('button', { name: '放大时间轴' }));
  expect(screen.getByLabelText('可见时间跨度').textContent).not.toBe(before);
  expect(screen.getByLabelText('当前年份').textContent).toBe(dateBefore);
  fireEvent.click(screen.getByRole('button', { name: '重置' }));
  expect(screen.getByLabelText('可见时间跨度')).toHaveTextContent(before!);
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
  expect(screen.getByLabelText('时间画布：滚动或拖动浏览，方向键移动').style.height).toBe('652px');
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
