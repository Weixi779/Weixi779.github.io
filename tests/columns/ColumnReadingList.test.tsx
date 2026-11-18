// @vitest-environment jsdom
// Created by weixi on 2026/11/18.

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it } from 'vitest';
import ColumnReadingList from '../../src/features/columns/ColumnReadingList';
import type { ColumnArticle } from '../../src/features/columns/catalog';

afterEach(cleanup);

function article(slug: string, publishedAt: string): ColumnArticle {
  return { slug, href: `/posts/${slug}/`, title: slug, publishedAt, summary: '', recommended: false };
}
const articles = [
  article('first', '2021-12-26 18:58:00'),
  article('second', '2022-12-27 00:00:00'),
  article('third', '2022-12-27 00:00:00'),
];

it('starts oldest first, changes the actual link order and preserves ties in either direction', async () => {
  const user = userEvent.setup();
  render(<ColumnReadingList articles={articles} />);
  const hrefs = () => screen.getAllByRole('link').map(link => link.getAttribute('href'));
  const ascending = articles.map(post => post.href);
  const toggle = screen.getByRole('button', { name: /发布时间/, pressed: false });
  expect(screen.getByText('2021 / 12 / 26')).toHaveAttribute('datetime', '2021-12-26');
  expect(hrefs()).toEqual(ascending);

  await user.click(toggle);
  expect(toggle).toHaveAttribute('aria-pressed', 'true');
  expect(hrefs()).toEqual([articles[1].href, articles[2].href, articles[0].href]);
  await user.keyboard('{Enter}');
  expect(toggle).toHaveAttribute('aria-pressed', 'false');
  expect(hrefs()).toEqual(ascending);
});

it('only offers sorting when the list has multiple articles', () => {
  const { rerender } = render(<ColumnReadingList articles={[]} />);
  expect(screen.getByText('这个专栏还没有收录文章。')).toBeVisible();
  expect(screen.queryByRole('button')).toBeNull();
  rerender(<ColumnReadingList articles={articles.slice(0, 1)} />);
  expect(screen.getByRole('link')).toHaveAttribute('href', articles[0].href);
  expect(screen.queryByRole('button')).toBeNull();
});
