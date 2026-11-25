// @vitest-environment jsdom
// Created by weixi on 2026/11/25.
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { bindFeaturedColumns } from '../../src/features/home/featured-columns';

let shelf: HTMLElement;
let rows: HTMLAnchorElement[];
let dispose: () => void;
let notifyResize: () => void;
let wide = true;

beforeEach(() => {
  vi.useFakeTimers();
  wide = true;
  vi.stubGlobal('matchMedia', () => ({ get matches() { return wide; } }));
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: () => void) { notifyResize = callback; }
    observe() {}
    disconnect() {}
  });
  shelf = document.createElement('div');
  shelf.innerHTML = ['one', 'two', 'three'].map((id, i) => `
    <div class="edition" ${i === 0 ? 'data-active' : ''}>
      <a class="row" href="#${id}"><span class="copy">${id}</span></a>
      <div class="preview"><a href="#post-${id}">Article</a></div>
    </div>`).join('');
  document.body.append(shelf);
  rows = [...shelf.querySelectorAll<HTMLAnchorElement>('.row')];
  dispose = bindFeaturedColumns(shelf);
});

afterEach(() => {
  dispose();
  shelf.remove();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function pointer(row: HTMLAnchorElement, type: string, x: number, device = 'mouse') {
  row.dispatchEvent(new PointerEvent(type, { pointerType: device, clientX: x }));
}

const current = () => shelf.querySelector('.edition[data-active] .row');

it('animates the rail only for a selection change', () => {
  expect(shelf.hasAttribute('data-animate-rail')).toBe(false);
  rows[1].focus();
  expect(shelf.hasAttribute('data-animate-rail')).toBe(true);
  notifyResize();
  expect(shelf.hasAttribute('data-animate-rail')).toBe(false);
});

it('keeps the article target during a diagonal crossing, then switches when the pointer rests', () => {
  for (const row of rows.slice(1)) {
    pointer(row, 'pointerenter', 10);
    for (const x of [14, 18, 22]) {
      vi.advanceTimersByTime(100);
      pointer(row, 'pointermove', x);
      expect(current()).toBe(rows[0]);
    }
    pointer(row, 'pointerleave', 24);
  }
  vi.advanceTimersByTime(500);
  expect(current()).toBe(rows[0]);
  pointer(rows[1], 'pointerenter', 10);
  vi.advanceTimersByTime(250);
  expect(current()).toBe(rows[1]);
});

it('shows the group when keyboard focus lands on the column or one of its articles', () => {
  rows[2].focus();
  expect(current()).toBe(rows[2]);
  rows[1].parentElement!.querySelector<HTMLAnchorElement>('.preview a')!.focus();
  expect(current()).toBe(rows[1]);
});

it('previews only the first tap on an inactive wide-screen column', () => {
  function tap(row: HTMLAnchorElement) {
    pointer(row, 'pointerdown', 10, 'touch');
    row.focus();
    return row.dispatchEvent(new MouseEvent('click', { detail: 1, cancelable: true }));
  }
  expect(tap(rows[1])).toBe(false);
  expect(current()).toBe(rows[1]);
  expect(tap(rows[1])).toBe(true);
  wide = false;
  expect(tap(rows[2])).toBe(true);
});
