// @vitest-environment jsdom
// Created by weixi on 2026/10/25.

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it } from 'vitest';
import SiteFooter from '../src/components/SiteFooter';

afterEach(cleanup);

it('renders the supplied build year and usable destinations before hydration', () => {
  const { container } = render(<div dangerouslySetInnerHTML={{ __html: renderToStaticMarkup(<SiteFooter year={2028} />) }} />);
  const footer = within(container).getByRole('contentinfo');
  expect(within(footer).getByText('Stay hungry. Stay foolish.')).toBeVisible();
  expect(footer).toHaveTextContent('© 2021–2028 Weixi All Rights Reserved');
  expect(within(footer).getByRole('link', { name: 'Font Licenses' })).toHaveAttribute('href', '/fonts/');
  const destinations = [
    ['GitHub', 'https://github.com/Weixi779'],
    ['LeetCode', 'https://leetcode.cn/u/wei-xi-d/'],
    ['哔哩哔哩', 'https://space.bilibili.com/6450245'],
    ['Email', 'mailto:sunshiwei418@126.com'],
    ['RSS', '/rss.xml'],
  ];
  const navigation = within(footer).getByRole('navigation', { name: '在别处找到我' });
  expect(within(navigation).getAllByRole('link')).toHaveLength(5);
  for (const [name, href] of destinations) {
    const link = within(navigation).getByRole('link', { name });
    expect(link).toHaveAttribute('href', href);
    if (href.startsWith('https:')) {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link.getAttribute('rel')?.split(' ')).toEqual(expect.arrayContaining(['noopener', 'noreferrer']));
    } else {
      expect(link).not.toHaveAttribute('target');
    }
  }
});

it('shows names on keyboard focus and dismisses them with Escape without moving focus', async () => {
  const user = userEvent.setup();
  render(<SiteFooter year={2026} />, { reactStrictMode: true });
  await user.tab(); // Font license, then the first social destination.
  await user.tab();
  const github = screen.getByRole('link', { name: 'GitHub' });
  expect(github).toHaveFocus();
  expect(screen.getByRole('tooltip')).toHaveTextContent('GitHub');
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  expect(github).toHaveFocus();
  await user.tab();
  expect(screen.getByRole('tooltip')).toHaveTextContent('LeetCode');
  await user.tab({ shift: true });
  expect(screen.getByRole('tooltip')).toHaveTextContent('GitHub');
});

it('dismisses a hovered name and opens it again on a new hover', () => {
  render(<SiteFooter year={2026} />);
  const link = screen.getByRole('link', { name: 'RSS' });
  fireEvent.mouseEnter(link);
  expect(screen.getByRole('tooltip')).toHaveTextContent('RSS');
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  fireEvent.mouseLeave(link);
  fireEvent.mouseEnter(link);
  expect(screen.getByRole('tooltip')).toHaveTextContent('RSS');
  fireEvent.mouseLeave(link);
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
});

it('keeps the name visible while either focus or hover remains', () => {
  render(<SiteFooter year={2026} />);
  const link = screen.getByRole('link', { name: 'Email' });
  fireEvent.focus(link);
  fireEvent.mouseEnter(link);
  fireEvent.mouseLeave(link);
  expect(screen.getByRole('tooltip')).toHaveTextContent('Email');
  fireEvent.mouseEnter(link);
  fireEvent.blur(link);
  expect(screen.getByRole('tooltip')).toHaveTextContent('Email');
  fireEvent.mouseLeave(link);
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
});
