// @vitest-environment jsdom
// Created by weixi on 2026/10/25.
import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import HitchExplorer from '../src/components/articles/HitchExplorer';
import ReuseTimeline from '../src/components/articles/ReuseTimeline';
afterEach(cleanup);
it('switches recordings and moves the selected time window', () => {
  render(<HitchExplorer />);
  fireEvent.click(screen.getByRole('button', { name: '5. Feed 复用调整后' }));
  expect(screen.getByRole('img').getAttribute('aria-labelledby')).toBeTruthy();
  expect(screen.getByText(/录制长度 35.6 秒/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '放大为 8 秒窗口' }));
  fireEvent.change(screen.getByRole('slider'), { target: { value: '10' } });
  expect(screen.getByText('移动选区：10.0–18.0 秒')).toBeTruthy();
  expect(screen.getByRole('img').querySelector('title')?.textContent).toBe('Feed 复用调整后：10.0 至 18.0 秒的卡顿分布');
});
it('keeps the reuse step buttons and slider synchronized', () => {
  render(<ReuseTimeline />);
  fireEvent.click(screen.getByRole('button', { name: '3. 再次显示相同内容' }));
  expect(screen.getByText('复用有效标题图片')).toBeTruthy();
  expect((screen.getByRole('slider') as HTMLInputElement).value).toBe('2');
  fireEvent.change(screen.getByRole('slider'), { target: { value: '3' } });
  expect(screen.getByRole('button', { name: '4. 主题发生变化' }).getAttribute('aria-pressed')).toBe('true');
  expect(screen.getByText('使旧图片失效')).toBeTruthy();
});
it('excludes the two specified opening spikes by default and restores them on demand', () => {
  render(<HitchExplorer />);
  for (const [name, value] of [['3. 条目视图复用后', '150.00 ms'], ['5. Feed 复用调整后', '183.33 ms']]) {
    fireEvent.click(screen.getByRole('button', { name }));
    expect(screen.queryByText(value)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '查看完整录制' }));
    expect(screen.getByText(value)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '排除已标记事件' }));
    expect(screen.queryByText(value)).toBeNull();
  }
});
