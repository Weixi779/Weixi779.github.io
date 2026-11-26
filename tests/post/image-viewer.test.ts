// @vitest-environment jsdom
// Created by weixi on 2026/11/26.
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { bindImageViewer } from '../../src/features/post/image-viewer';

let dialog: HTMLDialogElement;
let stage: HTMLElement;
let plane: HTMLElement;
let fit: HTMLButtonElement;
let dispose: () => void;
const thumb = new DOMRect(16, 638, 330, 660);
const viewport = new DOMRect(0, 50, 390, 700);

beforeEach(() => {
  document.body.innerHTML = `<style>article .ink { fill: #14bdae; }</style>
    <article><img id="diagram" src="pipeline.svg" alt="Pipeline"><img id="photo" src="photo.jpg" alt="Photo">
    <svg id="inline" role="img" viewBox="0 0 80 160"><title>Drawing</title><defs><marker id="tip"/></defs><svg role="img"><path class="ink"/></svg></svg>
    <a href="/full"><img alt="Linked"></a><astro-island><svg role="img"></svg></astro-island></article>
    <dialog data-open-label="Enlarge"><header><span></span><button class="viewer-close"></button></header>
      <div class="viewer-stage" tabindex="0"><div class="viewer-plane"></div></div>
      <button class="viewer-minus"></button><span class="viewer-scale"></span><button class="viewer-plus"></button>
      <button class="viewer-fit" data-fit-label="Full" data-detail-label="Detail"></button></dialog>`;
  dialog = document.querySelector('dialog')!;
  stage = dialog.querySelector('.viewer-stage')!;
  plane = dialog.querySelector('.viewer-plane')!;
  fit = dialog.querySelector('.viewer-fit')!;
  dialog.showModal = () => { dialog.open = true; };
  dialog.close = () => { dialog.open = false; dialog.dispatchEvent(new Event('close')); };
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  for (const el of document.querySelectorAll('#diagram, #photo, #inline')) {
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(thumb);
    if (el instanceof HTMLImageElement) Object.defineProperties(el, { naturalWidth: { value: 600 }, naturalHeight: { value: 1200 } });
  }
  vi.spyOn(stage, 'getBoundingClientRect').mockReturnValue(viewport);
  Object.defineProperties(stage, { clientWidth: { value: viewport.width }, clientHeight: { value: viewport.height } });
  // jsdom has no scrolling layout. Match the native scroll bounds so an impossible anchor fails.
  stage.scrollTo = (options: ScrollToOptions | number = {}) => {
    if (typeof options === 'number') throw new Error('Expected scroll options');
    stage.scrollLeft = Math.max(0, Math.min(options.left ?? 0, parseFloat(plane.style.width) - viewport.width));
    stage.scrollTop = Math.max(0, Math.min(options.top ?? 0, parseFloat(plane.style.height) - viewport.height));
  };
  dispose = bindImageViewer(document.querySelector('article')!, dialog);
});
afterEach(() => { dispose(); document.body.replaceChildren(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it('anchors the top of a long diagram at a low tap and restores the same detail after overview', () => {
  const source = document.querySelector<HTMLImageElement>('#diagram')!;
  const tap = thumb.top + thumb.height * .05;
  source.dispatchEvent(new MouseEvent('click', { detail: 1, clientX: 180, clientY: tap }));
  const image = plane.querySelector('img')!;
  const nodeY = () => viewport.top + parseFloat(image.style.top) + parseFloat(image.style.height) * .05 - stage.scrollTop;
  expect(fit.title).toBe('Full');
  expect(nodeY()).toBeCloseTo(tap);
  fit.click();
  expect(fit.title).toBe('Detail');
  fit.click();
  expect(nodeY()).toBeCloseTo(tap);
  dialog.close();
  expect(document.activeElement).toBe(source);
  expect(window.scrollTo).toHaveBeenCalledWith({ left: window.scrollX, top: window.scrollY, behavior: 'instant' });
});

it('opens a photo fitted by keyboard and leaves links and hydrated diagrams alone', () => {
  const photo = document.querySelector('#photo')!;
  photo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
  expect(dialog.open).toBe(true);
  expect(fit.title).toBe('Detail');
  expect(document.activeElement).toBe(stage);
  expect(document.querySelector('a [data-reading-zoom], astro-island [data-reading-zoom]')).toBeNull();
  dispose();
  expect(dialog.open).toBe(false);
  expect(document.activeElement).toBe(photo);
  expect(photo.hasAttribute('tabindex')).toBe(false);
});

it('keeps scoped paint and local IDs in the inline drawing and releases the copy on close', () => {
  const source = document.querySelector('#inline')!;
  source.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
  const drawing = plane.firstElementChild!.shadowRoot!;
  expect(document.querySelector('#inline svg')!.hasAttribute('data-reading-zoom')).toBe(false);
  expect(drawing.querySelector('path')!.style.fill).toBe('rgb(20, 189, 174)');
  expect(drawing.getElementById('tip')).not.toBeNull();
  expect(document.querySelectorAll('#tip')).toHaveLength(1);
  expect(fit.title).toBe('Full');
  dialog.close();
  expect(plane.childElementCount).toBe(0);
  expect(document.activeElement).toBe(source);
});
