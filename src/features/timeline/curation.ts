// Created by weixi on 2026/10/28.
import config from './timeline.json';
import columns from '../columns/columns.json';
import type { TimelineArticle } from './layout';
export type StoryLevel = 'large' | 'medium' | 'small';
export interface TimelineStory {
  id: string; title: string; date: string; endDate: string; level: StoryLevel;
  column?: string;
  intro: string; articles: TimelineArticle[]; related: TimelineArticle[];
}
type StoryChoice = { id: string; level: StoryLevel; related?: string[] } & (
  | { column: string }
  | { intro: string; title?: string; members?: string[] }
);

export function findTimelineColumn(slug: string | undefined) {
  return columns.find(column => column.slug === slug);
}

export function storyContent(choice: StoryChoice) {
  if ('column' in choice) {
    const column = findTimelineColumn(choice.column);
    if (!column) return undefined;
    return { title: column.title, intro: column.intro, members: column.articles, column: column.slug };
  }
  return { title: choice.title, intro: choice.intro, members: choice.members ?? [choice.id], column: undefined };
}
const choices = config.stories as StoryChoice[];

export function buildTimelineStories(articles: TimelineArticle[]): TimelineStory[] {
  const published = new Map(articles.map(article => [article.slug, article]));
  const resolve = (slugs: string[]) => [...new Set(slugs)]
    .flatMap(slug => published.has(slug) ? [published.get(slug)!] : [])
    .sort((a, b) => a.date.localeCompare(b.date));
  return choices.flatMap(choice => {
    const content = storyContent(choice);
    if (!content) return [];
    const members = resolve(content.members);
    if (!members.length) return [];
    return [{ id: choice.id, title: content.title ?? members[0].title, column: content.column,
      level: choice.level, intro: content.intro, date: members[0].date,
      endDate: members[members.length - 1].date, articles: members,
      related: resolve(choice.related ?? []).filter(article => !members.some(member => member.slug === article.slug)),
    }];
  }).sort((a, b) => a.date.localeCompare(b.date));
}
