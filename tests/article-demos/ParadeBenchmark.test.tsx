// @vitest-environment jsdom
// Created by weixi on 2026/11/09.
import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import ParadeBenchmark from '../../src/features/article-demos/parade/ParadeBenchmark';

afterEach(cleanup);

it('changes the measured workload and shows the matching times and state caveat', () => {
  render(<ParadeBenchmark />);
  expect(screen.getByText('0.916 ms')).toBeTruthy();
  expect(screen.queryByText(/选中状态未保留/)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '10,000 项' }));
  fireEvent.change(screen.getByLabelText('更新场景'), { target: { value: 'replace-all-sections' } });
  expect(screen.getByText('27.493 ms')).toBeTruthy();
  expect(screen.getByText('18.633 ms')).toBeTruthy();
  expect(screen.getByText(/选中状态未保留：30\/30 次/)).toBeTruthy();
  fireEvent.change(screen.getByLabelText('更新场景'), { target: { value: 'update-fixed5' } });
  expect(screen.queryByText(/选中状态未保留/)).toBeNull();
  expect(screen.queryByText('27.493 ms')).toBeNull();
});

it('keeps a readable default and labels both uncertainty and the experimental backend', () => {
  render(<ParadeBenchmark />);
  const chart = screen.getByRole('region', { name: '完整更新耗时对比' });
  expect(within(chart).getAllByRole('listitem')).toHaveLength(4);
  expect(screen.getByRole('button', { name: '100 项' }).getAttribute('aria-pressed')).toBe('true');
  expect(within(chart).getByRole('list').textContent).toContain('系统后台实验');
  expect(screen.getByText(/不是置信区间/)).toBeTruthy();
  expect(screen.getByRole('link', { name: '全部 31 个场景与复现记录' }).getAttribute('href'))
    .toBe('/benchmarks/parade-2026-11-09/unified-rounds1-4/README.md');
});
