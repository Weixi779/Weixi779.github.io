// Created by weixi on 2026/10/28.
import type { TimelineStory } from './curation';
export interface TimelineArticle { slug: string; date: string; title: string; excerpt?: string }
export const toYear = (date: string) => {
  const ms = Date.parse(date), year = new Date(ms).getUTCFullYear();
  return year + (ms - Date.UTC(year, 0, 1)) / (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1));
};
export function buildTimelineLayout(stories: TimelineStory[]) {
  // A single linear time scale, independent of editorial importance or density.
  return { labels: stories.map(story => ({ story, position: toYear(story.date), width: { large: 300, medium: 260, small: 180 }[story.level] })),
    position: (year: number) => year, year: (position: number) => position };
}
export function zoomAround(view: { center: number; scale: number }, factor: number, offset: number) {
  const scale = Math.max(100, Math.min(20000, view.scale * factor));
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
