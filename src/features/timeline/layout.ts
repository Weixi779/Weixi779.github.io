// Created by weixi on 2026/10/28.
import type { TimelineStory } from './curation';
export interface TimelineArticle { slug: string; date: string; title: string; excerpt?: string }
export const toYear = (date: string) => {
  const ms = Date.parse(date), year = new Date(ms).getUTCFullYear();
  return year + (ms - Date.UTC(year, 0, 1)) / (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1));
};
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
export function smooth(from: number, to: number, value: number) {
  const t = clamp((value - from) / (to - from), 0, 1);
  return t * t * (3 - 2 * t);
}

export function buildTimelineLayout(stories: TimelineStory[], range = { start: 2018, end: toYear(new Date().toISOString()) }) {
  const first = Math.floor(Math.min(range.start, ...stories.map(s => toYear(s.date))));
  const end = range.end;
  const years = Array.from({ length: Math.floor(end) - first + 1 }, (_, i) => first + i);
  let total = 0;
  const spans = years.map(year => {
    const width = .36 + stories.filter(s => Math.floor(toYear(s.date)) === year)
      .reduce((sum, s) => sum + ({ large: .4, medium: .32, small: .25 }[s.level]), 0);
    const start = total;
    total += width;
    return { year, start, width };
  });
  const position = (date: number) => {
    const span = spans[clamp(Math.floor(date) - first, 0, spans.length - 1)];
    return span.start + (date - span.year) * span.width;
  };
  const year = (position: number) => {
    const span = spans.find(s => position < s.start + s.width) ?? spans.at(-1)!;
    return span.year + (position - span.start) / span.width;
  };
  const labels = [...stories].sort((a, b) => toYear(a.date) - toYear(b.date)).map((story, index) => ({
    story, position: position(toYear(story.date)), width: { large: 280, medium: 240, small: 210 }[story.level], lane: index % 2, gap: Infinity, clearance: 0,
  }));
  for (let i = 0; i < labels.length; i++) {
    // Labels extend right; reserve the previous label too, including hover growth.
    labels[i].clearance = Math.max(labels[i].width, labels[i - 2]?.width ?? 0) * 1.065 + 16;
    labels[i].gap = Math.min(i >= 2 ? labels[i].position - labels[i - 2].position : Infinity,
      i + 2 < labels.length ? labels[i + 2].position - labels[i].position : Infinity);
  }
  return { labels: labels.filter(label => toYear(label.story.date) <= end), position, year, spans, years, total: position(end), first, end };
}

export function storyVisibility(label: ReturnType<typeof buildTimelineLayout>['labels'][number], scale: number, minScale: number) {
  const zoom = scale / minScale;
  const bands = { large: [1.15, 2.2], medium: [1.9, 3.4], small: [2.5, 4.1] }[label.story.level];
  const title = smooth(bands[0], bands[1], zoom) * smooth(label.clearance, label.clearance + 85, label.gap * scale);
  const intro = label.story.level === 'large' ? title : 0;
  return { title, intro };
}

export function buildRulerTicks(layout: ReturnType<typeof buildTimelineLayout>, scale: number, center: number, width: number, minScale: number) {
  const ticks: { key: string; date: number; x: number; annual: boolean; length: number; opacity: number; label: string; labelOpacity: number }[] = [];
  const x = (date: number) => (layout.position(date) - center) * scale + width / 2;
  const add = (key: string, date: number, annual: boolean, length: number, opacity: number, label = '', labelOpacity = 0) => {
    const xx = x(date);
    if (date <= layout.end && xx >= -60 && xx <= width + 60) ticks.push({ key, date, x: xx, annual, length, opacity, label, labelOpacity });
  };
  for (const span of layout.spans) {
    const local = span.width * scale;
    if (x(span.year + 1) < -60 || x(span.year) > width + 60) continue;
    add(`${span.year}`, span.year, true, 42, 1, String(span.year), 1);
    const seen = new Set<number>([0]);
    for (const divisions of [2, 4, 12, 24, 48, 96, 192, 384, 768]) {
      const opacity = smooth(9, 22, local / divisions);
      if (!opacity) continue;
      for (let i = 1; i < divisions; i++) {
        const monthPosition = i / divisions * 12;
        const key = Math.round(monthPosition * 1000000);
        if (seen.has(key)) continue;
        seen.add(key);
        const month = Math.floor(monthPosition), fraction = monthPosition - month;
        const ms = Date.UTC(span.year, month, 1) + fraction * (Date.UTC(span.year, month + 1, 1) - Date.UTC(span.year, month, 1));
        const date = toYear(new Date(ms).toISOString());
        const monthly = Math.abs(fraction) < .00001;
        const labelOpacity = monthly ? smooth(1.15, 1.8, scale / minScale) * smooth(month % 3 === 0 ? 500 : 1100, month % 3 === 0 ? 800 : 1600, local) : 0;
        add(`${span.year}-${key}`, date, false, divisions <= 4 ? 30 : divisions === 12 ? 22 : 12, opacity, monthly ? `${month + 1}月` : '', labelOpacity);
      }
    }
  }
  return ticks;
}
export function zoomAround(view: { center: number; scale: number }, factor: number, offset: number, minimum = 100) {
  const scale = Math.max(minimum, Math.min(20000, view.scale * factor));
  return { scale, center: view.center + offset / view.scale - offset / scale };
}

// Smooth density bands keep detail continuous while the time scale changes.
export function axisDetail(scale: number) {
  const fade = (from: number, to: number) => {
    const t = Math.max(0, Math.min(1, (scale - from) / (to - from)));
    return t * t * (3 - 2 * t);
  };
  return { quarter: fade(100, 240), month: fade(220, 520), week: fade(650, 1500),
    day: fade(2800, 6500), quarterLabel: fade(200, 420), monthLabel: fade(650, 1150),
    weekLabel: fade(2400, 4200), dayLabel: fade(11000, 18000), yearSize: 12 + fade(300, 1600) * 2 };
}
