// @vitest-environment jsdom
// Created by weixi on 2026/11/18.

import '@testing-library/jest-dom/vitest';
import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ColumnCatalog from '../../src/features/columns/ColumnCatalog';
import { bindColumnBrowsing } from '../../src/features/columns/catalog-interactions';
import type { Column } from '../../src/features/columns/catalog';

afterEach(cleanup);

const columns: Column[] = Array.from({ length: 10 }, (_, i) => ({
  slug: `column-${i}`, title: `专栏 ${i}`, intro: `简介 ${i}`, prominence: i === 0 ? 'small' : 'medium',
  articles: [{ slug: 'echo', href: '/posts/echo/', title: '回响', publishedAt: '2026-10-25 00:00:00', summary: '', recommended: false }],
}));

it('links the empty catalog to the archive', () => {
  render(<ColumnCatalog columns={[]} />);
  expect(screen.getByRole('link', { name: '浏览文章归档' })).toHaveAttribute('href', '/archive/');
  expect(screen.queryByRole('group', { name: '浏览方式' })).not.toBeInTheDocument();
});

it('exposes the configured column link, introduction and derived article count', () => {
  render(<ColumnCatalog columns={columns.slice(0, 1)} />);
  const link = screen.getByRole('link', { name: /专栏 0/ });
  expect(link).toHaveAttribute('href', '/columns/column-0/');
  expect(within(link).getByText('1 篇文章')).toBeInTheDocument();
  expect(within(link).getByText('简介 0')).toBeInTheDocument();
});

it('offers the two native views at ten columns with the same set of destinations', async () => {
  const user = userEvent.setup();
  const { rerender } = render(<ColumnCatalog columns={columns.slice(0, 9)} />);
  expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  rerender(<ColumnCatalog columns={columns} />);
  expect(screen.getByRole('radio', { name: '图文' })).toBeChecked();
  const hrefs = () => screen.getAllByRole('link').map(link => link.getAttribute('href'));
  const before = hrefs();
  await user.click(screen.getByRole('radio', { name: '目录' }));
  expect(screen.getByRole('radio', { name: '目录' })).toBeChecked();
  expect(hrefs()).toEqual(before);
  expect(before).toHaveLength(10);
});

it.each(['touchmove', 'touchend', 'touchcancel'])('clears pressed feedback on %s and disposal', event => {
  const { container } = render(<ColumnCatalog columns={columns.slice(0, 1)} />);
  const release = bindColumnBrowsing(container);
  const card = screen.getByRole('link', { name: /专栏 0/ });
  const title = within(card).getByRole('heading');

  fireEvent.touchStart(title, { touches: [{}] });
  expect(card).toHaveAttribute('data-pressed');
  fireEvent(title, new Event(event, { bubbles: true }));
  expect(card).not.toHaveAttribute('data-pressed');

  fireEvent.touchStart(title, { touches: [{}] });
  release();
  expect(card).not.toHaveAttribute('data-pressed');
  fireEvent.touchStart(title, { touches: [{}] });
  expect(card).not.toHaveAttribute('data-pressed');
});
