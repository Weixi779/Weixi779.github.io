// Created by weixi on 2026/10/26.
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { groupTocHeadings } from '../src/utils/toc';
import { bindTableOfContents } from '../src/components/table-of-contents';

describe('article heading groups', () => {
  it('keeps skipped heading levels under their preceding chapter and excludes footnotes', () => {
    const groups = groupTocHeadings([
      { depth: 2, slug: 'first', text: 'First' },
      { depth: 4, slug: 'nested', text: 'Nested' },
      { depth: 2, slug: 'second', text: 'Second' },
      { depth: 3, slug: 'child', text: 'Child' },
      { depth: 2, slug: 'footnote-label', text: 'Footnotes' },
    ]);
    expect(groups.map(group => [group.heading.slug, group.children.map(child => child.slug)]))
      .toEqual([['first', ['nested']], ['second', ['child']]]);
  });
  it('does not reserve a directory for an empty article', () => {
    expect(groupTocHeadings([])).toEqual([]);
    expect(groupTocHeadings([{ depth: 2, slug: 'footnote-label', text: 'Footnotes' }])).toEqual([]);
  });
});

describe('reading position', () => {
  let dispose: (() => void) | undefined;
  afterEach(() => { dispose?.(); document.body.innerHTML = ''; history.replaceState(null, '', '/'); vi.restoreAllMocks(); });

  function setup(hash = '', restored = false) {
    history.replaceState(null, '', '/' + hash);
    document.body.innerHTML = `<nav class="toc"><details open><summary>目录</summary><ol>
      <li data-toc-chapter="first"><a href="#first">First</a><div data-toc-children inert><a href="#child">Child</a></div></li>
      <li data-toc-chapter="second"><a href="#second">Second</a><div data-toc-children inert><a href="#last">Last</a></div></li>
      </ol></details></nav><article><h2 id="first">First</h2><h3 id="child">Child</h3><h2 id="second">Second</h2><h3 id="last">Last</h3></article>`;
    let scroll = 0;
    ['first', 'child', 'second', 'last'].forEach((id, index) => {
      vi.spyOn(document.getElementById(id)!, 'getBoundingClientRect').mockImplementation(() => ({ top: 200 + index * 300 - scroll } as DOMRect));
    });
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { callback(0); return 1; });
    dispose = bindTableOfContents(document.querySelector('.toc')!, { restored });
    return (position: number) => { scroll = position; window.dispatchEvent(new Event('scroll')); };
  }

  it('opens only the chapter being read, including when scrolling backwards across a long section', () => {
    const scroll = setup();
    expect(document.querySelectorAll('[data-active]')).toHaveLength(0);
    scroll(420);
    expect(document.querySelector('[data-active]')?.getAttribute('data-toc-chapter')).toBe('first');
    expect(document.querySelector('[aria-current]')?.getAttribute('href')).toBe('#child');
    expect(document.querySelector('[data-active] [data-toc-children]')?.hasAttribute('inert')).toBe(false);
    scroll(900);
    expect(document.querySelectorAll('[data-active]')).toHaveLength(1);
    expect(document.querySelector('[data-active]')?.getAttribute('data-toc-chapter')).toBe('second');
    expect(document.querySelector('[data-toc-chapter="first"] [data-toc-children]')?.hasAttribute('inert')).toBe(true);
    scroll(500);
    expect(document.querySelector('[data-active]')?.getAttribute('data-toc-chapter')).toBe('first');
    scroll(0);
    expect(document.querySelectorAll('[data-active]')).toHaveLength(0);
  });

  it('reveals the parent of a deep-linked child before the browser finishes positioning it', () => {
    setup('#last');
    expect(document.querySelector('[data-active]')?.getAttribute('data-toc-chapter')).toBe('second');
    expect(document.querySelector('[aria-current]')?.getAttribute('href')).toBe('#last');
  });

  it('uses the restored scroll position instead of an old hash after browser back', () => {
    setup('#last', true);
    expect(document.querySelectorAll('[data-active]')).toHaveLength(0);
  });
});
