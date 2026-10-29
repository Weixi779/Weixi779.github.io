// Created by weixi on 2026/10/28.
import { expect, it } from 'vitest';
import { buildTimelineLayout, zoomAround } from '../src/components/timeline/layout';
import { buildTimelineStories } from '../src/components/timeline/curation';
it('keeps equal time intervals equal regardless of title density', () => {
  const layout = buildTimelineLayout(buildTimelineStories([
    { slug: 'observer', title: '旁观者', date: '2026-07-04' },
    { slug: 'wicompress-2-architecture-ai', title: 'WICompress', date: '2026-08-02' },
  ]));
  expect(layout.position(2026.7) - layout.position(2026.6)).toBeCloseTo(layout.position(2026.8) - layout.position(2026.7));
  expect(layout.year(layout.position(2024.25))).toBeCloseTo(2024.25);
});
it('zooms around the pointer without moving the date under it', () => {
  const before = { center: 2024, scale: 500 };
  const next = zoomAround(before, 2, 240);
  expect(next.scale).toBe(1000);
  expect(before.center + 240 / before.scale).toBeCloseTo(next.center + 240 / next.scale);
  expect(zoomAround(before, 1000, 0).scale).toBeLessThanOrEqual(20000);
  expect(zoomAround(before, .0001, 0).scale).toBeGreaterThanOrEqual(100);
});

it('reveals ruler detail progressively rather than switching at a single scale', async () => {
  const { axisDetail } = await import('../src/components/timeline/layout');
  expect(axisDetail(500).week).toBe(0);
  expect(axisDetail(1000).week).toBeGreaterThan(0);
  expect(axisDetail(1000).week).toBeLessThan(1);
  expect(axisDetail(1600).week).toBe(1);
  expect(axisDetail(4000).day).toBeGreaterThan(0);
  expect(axisDetail(4000).day).toBeLessThan(1);
  expect(axisDetail(18000).dayLabel).toBe(1);
});
