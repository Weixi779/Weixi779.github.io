// Created by weixi on 2026/10/28.
import config from './timeline.json';
import type { TimelineArticle } from './layout';
export type StoryLevel = 'large' | 'medium' | 'small';
export interface TimelineStory {
  id: string; title: string; date: string; endDate: string; level: StoryLevel;
  intro: string; articles: TimelineArticle[]; related: TimelineArticle[];
}
interface StoryChoice {
  id: string; level: StoryLevel; intro: string; title?: string; members?: string[]; related?: string[];
}
const choices = config.stories as StoryChoice[];

export function buildTimelineStories(articles: TimelineArticle[]): TimelineStory[] {
  const published = new Map(articles.map(article => [article.slug, article]));
  const resolve = (slugs: string[]) => [...new Set(slugs)]
    .flatMap(slug => published.has(slug) ? [published.get(slug)!] : [])
    .sort((a, b) => a.date.localeCompare(b.date));
  return choices.flatMap(choice => {
    const members = resolve(choice.members ?? [choice.id]);
    if (!members.length) return [];
    return [{ id: choice.id, title: choice.title ?? members[0].title,
      level: choice.level, intro: choice.intro, date: members[0].date,
      endDate: members[members.length - 1].date, articles: members,
      related: resolve(choice.related ?? []).filter(article => !members.some(member => member.slug === article.slug)),
    }];
  }).sort((a, b) => a.date.localeCompare(b.date));
}
