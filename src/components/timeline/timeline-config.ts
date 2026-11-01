// Created by weixi on 2026/10/31.
// Build-time validation; no schema library is shipped to the timeline island.
import { z } from 'astro/zod';
import config from './timeline.json';
import type { TimelineArticle } from './layout';

const slug = z.string().trim().min(1);
const choice = z.object({
  id: slug,
  level: z.enum(['large', 'medium', 'small']),
  intro: z.string().trim().min(1),
  title: slug.optional(),
  members: z.array(slug).min(2).optional(),
  related: z.array(slug).optional(),
}).strict().refine(value => !value.members || Boolean(value.title), { message: '系列必须填写 title' });
const schema = z.object({ $schema: z.string().optional(), stories: z.array(choice) }).strict();

export function validateTimelineConfig(input: unknown, articles: TimelineArticle[]) {
  const parsed = schema.parse(input);
  const published = new Set<string>();
  for (const article of articles) {
    if (published.has(article.slug)) throw new Error(`timeline.json: 文章 slug 重复：${article.slug}`);
    if (!Number.isFinite(Date.parse(article.date))) throw new Error(`timeline.json: 文章日期无效：${article.slug}`);
    published.add(article.slug);
  }
  const ids = new Set<string>(), included = new Set<string>();
  for (const story of parsed.stories) {
    if (ids.has(story.id)) throw new Error(`timeline.json: 节点 id 重复：${story.id}`);
    ids.add(story.id);
    for (const member of story.members ?? [story.id]) {
      if (!published.has(member)) throw new Error(`timeline.json: ${story.id} 引用了不存在或未发布的文章：${member}`);
      if (included.has(member)) throw new Error(`timeline.json: 文章重复收录：${member}`);
      included.add(member);
    }
    for (const related of story.related ?? []) {
      if (!published.has(related)) throw new Error(`timeline.json: ${story.id} 的关联文章不存在或未发布：${related}`);
    }
  }
  return parsed;
}
export const validatePublishedTimeline = (articles: TimelineArticle[]) => validateTimelineConfig(config, articles);
