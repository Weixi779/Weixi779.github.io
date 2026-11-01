// @vitest-environment jsdom
// Created by weixi on 2026/10/31.
import { act, renderHook, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { timelineToday, useTimelineDate } from '../src/components/timeline/date';
afterEach(() => { cleanup(); vi.useRealTimers(); });
it('advances at Shanghai midnight and refreshes a stale build date without waiting for publication', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-12-31T15:59:59Z'));
  expect(timelineToday()).toBe('2026-12-31');
  const { result, unmount } = renderHook(() => useTimelineDate('2026-10-31'));
  expect(result.current).toBe('2026-12-31');
  act(() => { vi.advanceTimersByTime(1001); });
  expect(result.current).toBe('2027-01-01');
  vi.setSystemTime(new Date('2027-02-01T00:00:00Z'));
  act(() => { document.dispatchEvent(new Event('visibilitychange')); });
  expect(result.current).toBe('2027-02-01');
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});
