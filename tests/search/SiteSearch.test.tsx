// @vitest-environment jsdom
// Created by weixi on 2026/11/26.

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import SiteSearch from '../../src/features/search/SiteSearch';
import type { SearchEntry } from '../../src/features/search/search';

afterEach(() => {
  cleanup();
  history.replaceState(null, '');
  sessionStorage.clear();
  vi.unstubAllGlobals();
});

it.each(['metaKey', 'ctrlKey'])('%s + K supports keyboard selection and restores focus on dismissal', async modifier => {
  const entries: SearchEntry[] = ['甲', '乙'].map(title => ({
    kind: 'article', title, href: '/' + title, terms: [], summary: 'Swift 的缓存', detail: '2026',
  }));
  const fetchIndex = vi.fn(async () => Response.json(entries));
  vi.stubGlobal('fetch', fetchIndex);
  const { container } = render(<><button>继续阅读</button><SiteSearch /></>);
  const dialog = container.querySelector('dialog')!;
  dialog.showModal = () => { dialog.open = true; };
  dialog.close = () => { dialog.open = false; dialog.dispatchEvent(new Event('close')); };
  const opener = screen.getByRole('button', { name: '继续阅读' });
  opener.focus();
  expect(fetchIndex).not.toHaveBeenCalled();
  fireEvent.keyDown(opener, { key: 'k', [modifier]: true });
  const input = screen.getByRole('combobox');
  expect(input).toHaveFocus();
  fireEvent.change(input, { target: { value: 'swift 缓存' } });
  const options = await screen.findAllByRole('option');
  for (const option of options) option.scrollIntoView = vi.fn();
  expect(options[0]).toHaveAttribute('aria-selected', 'true');
  fireEvent.keyDown(input, { key: 'ArrowDown' });
  expect(input).toHaveAttribute('aria-activedescendant', options[1].id);
  expect(options[1]).toHaveAttribute('aria-selected', 'true');
  fireEvent.keyDown(input, { key: 'ArrowUp' });
  expect(input).toHaveAttribute('aria-activedescendant', options[0].id);
  // This is the cancel event the native modal dispatches on Escape.
  fireEvent(dialog, new Event('cancel', { cancelable: true }));
  expect(dialog.open).toBe(false);
  expect(opener).toHaveFocus();
  fireEvent.click(screen.getByRole('button', { name: '搜索文章和专栏' }));
  expect(input).toHaveValue('swift 缓存');
  expect(fetchIndex).toHaveBeenCalledTimes(1);
});

it('dismisses only the return control for the current visit, keeping the reading history', () => {
  const state = { searchArrival: { from: '/', to: location.href, query: 'Swift 缓存' }, other: 'keep' };
  history.replaceState(state, '');
  const back = vi.spyOn(history, 'back');
  const view = render(<SiteSearch />);
  expect(screen.getByRole('button', { name: '返回搜索结果' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '收起返回入口' }));
  expect(back).not.toHaveBeenCalled();
  expect(history.state).toEqual({ ...state, searchArrival: { ...state.searchArrival, dismissed: true } });
  view.unmount();
  render(<SiteSearch />);
  expect(screen.queryByRole('button', { name: '返回搜索结果' })).toBeNull();
});
