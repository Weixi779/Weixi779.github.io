// Created by weixi on 2026/10/28.
import { expect, it } from 'vitest';
import { buildTimelineLayout, zoomAround, buildRulerTicks } from '../../src/features/timeline/layout';
import { buildTimelineStories } from '../../src/features/timeline/curation';
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
  const { axisDetail } = await import('../../src/features/timeline/layout');
  expect(axisDetail(500).week).toBe(0);
  expect(axisDetail(1000).week).toBeGreaterThan(0);
  expect(axisDetail(1000).week).toBeLessThan(1);
  expect(axisDetail(1600).week).toBe(1);
  expect(axisDetail(4000).day).toBeGreaterThan(0);
  expect(axisDetail(4000).day).toBeLessThan(1);
  expect(axisDetail(18000).dayLabel).toBe(1);
});

it('gives dense years more room while preserving within-year date ratios and inverse mapping', () => {
  const layout = buildTimelineLayout(buildTimelineStories([
    { slug: 'observer', title: '旁观者', date: '2026-07-04' },
    { slug: 'wicompress-2-architecture-ai', title: 'WICompress', date: '2026-08-02' },
  ]));
  expect(layout.position(2027) - layout.position(2026)).toBeGreaterThan(layout.position(2024) - layout.position(2023));
  for (const date of [2018, 2022.8, 2026.01, 2026.99, 2027]) {
    expect(layout.year(layout.position(date))).toBeCloseTo(date, 8);
  }
});

it('keeps title lanes stable and reveals detail continuously as spacing grows', async () => {
  const { storyVisibility } = await import('../../src/features/timeline/layout');
  const layout = buildTimelineLayout(buildTimelineStories([
    { slug: 'observer', title: '旁观者', date: '2026-07-04' },
    { slug: 'wicompress-2-architecture-ai', title: 'WICompress', date: '2026-08-02' },
    { slug: 'the-echo-that-never-came', title: '回响', date: '2026-10-25' },
  ]));
  const label = layout.labels[0];
  expect(storyVisibility(label, 100, 100).title).toBe(0);
  expect(storyVisibility(label, 20000, 100).title).toBe(1);
  const scale = (label.clearance + 40) / label.gap;
  const middle = storyVisibility(label, scale, 1);
  expect(middle.title).toBeGreaterThan(0);
  expect(middle.title).toBeLessThan(1);
  expect(middle.intro).toBe(middle.title);
  expect(layout.labels.map(l => l.lane)).toEqual([0, 1, 0]);
});

it('retains fine ruler marks at overview and uses real month boundaries', async () => {
  const { buildRulerTicks } = await import('../../src/features/timeline/layout');
  const layout = buildTimelineLayout(buildTimelineStories([
    { slug: 'observer', title: '旁观者', date: '2026-07-04' },
  ]));
  const ticks = buildRulerTicks(layout, 300, 0, 10000, 300);
  expect(ticks.filter(t => !t.annual && t.opacity > 0).length).toBeGreaterThan(20);
  expect(ticks.filter(t => !t.annual).every(t => t.labelOpacity === 0)).toBe(true);
  const july = buildRulerTicks(layout, 3000, 0, 50000, 100).find(t => t.label === '7月' && Math.floor(t.date) === 2026)!;
  expect(july.date).toBeCloseTo(2026 + 181 / 365);
});

it('ends at today without a future year marker or losing date mapping across rollover', () => {
  const today = 2026 + 303 / 365;
  const layout = buildTimelineLayout([], { start: 2018, end: today });
  expect(layout.end).toBe(today);
  expect(layout.total).toBeCloseTo(layout.position(today));
  const ticks = buildRulerTicks(layout, 500, layout.total, 1200, 100);
  expect(ticks.every(t => t.date <= today)).toBe(true);
  expect(ticks.some(t => t.label === '2027')).toBe(false);
  const next = buildTimelineLayout([], { start: 2018, end: 2027 });
  expect(next.years).toContain(2027);
  expect(next.position(2026.5)).toBe(layout.position(2026.5));
});


it('reserves the wider preceding title and hover space in a shared lane', async () => {
  const { storyVisibility } = await import('../../src/features/timeline/layout');
  const stories = buildTimelineStories([
    { slug: 'observer', title: '旁观者', date: '2026-07-04' },
    { slug: 'wicompress-2-architecture-ai', title: 'WICompress', date: '2026-08-02' },
    { slug: 'after-deleting-ai-skills', title: '删掉大量 Skill 以后', date: '2026-08-19' },
  ]);
  const layout = buildTimelineLayout(stories);
  const later = layout.labels[2];
  expect(storyVisibility(later, 300 / later.gap, 1).title).toBe(0);
});
