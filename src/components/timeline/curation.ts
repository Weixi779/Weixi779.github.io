// Created by weixi on 2026/10/28.
import type { TimelineArticle } from './layout';
export type StoryLevel = 'large' | 'medium' | 'small';
export interface TimelineStory {
  id: string; title: string; date: string; endDate: string; level: StoryLevel;
  intro: string; articles: TimelineArticle[]; related: TimelineArticle[];
}
interface StoryChoice {
  id: string; level: StoryLevel; intro: string; title?: string; members?: string[]; related?: string[];
}
const compression = ['image-compression-fundamentals', 'ios-image-compression', 'wicompress-2-architecture-ai'];
// Editorial choices for this page only. Titles and dates still belong to published posts.
const choices: StoryChoice[] = [
  { id: 'falling-behind', level: 'medium', intro: '一直往前走，却发现有些事情不会在下一个阶段等我。', related: ['year-2021-afterword'] },
  { id: 'momentum', level: 'medium', intro: '秋招期间，想找回喜欢什么就敢去做的自己。后来，真的剪了一部短片。', related: ['year-2021-afterword'] },
  { id: 'year-2021-afterword', level: 'large', intro: '从校园走进工作，把这一年的记忆点留在这里。', related: ['falling-behind', 'momentum'] },
  { id: 'year-2022-afterword', level: 'large', intro: '已经开始工作，直到回了一趟学校，才真正觉得自己毕业了。' },
  { id: 'swift-model-decoding', level: 'small', intro: '从业务模型层开始，为 Objective-C 与 Swift 的并行开发搭一座桥。' },
  { id: 'image-compression-fundamentals', level: 'small', intro: '从业务里的图片问题出发，写下一套 Unity 图片压缩方案。', related: compression },
  { id: 'quest-3-bypass-router', level: 'small', intro: '买琴、搬家，为了学琴买了 Quest，随后开始折腾网络。' },
  { id: 'unity-series', title: '沙盒建造游戏设计', level: 'medium', intro: '一个真实的建造功能，从相机控制、撤销操作到状态管理与复制搜索。', members: ['unity-sandbox-building-camera-control', 'unity-sandbox-building-command-pattern', 'unity-sandbox-building-state-pattern', 'unity-sandbox-building-search-algorithms'] },
  { id: 'developer-journey-year-3', level: 'large', intro: '技术更熟练了，下一段路却还看不清。' },
  { id: 'ios-image-compression', level: 'small', intro: '继续研究 iOS 图片压缩，把方案整理成 WICompress 开源包。', related: compression },
  { id: 'japan-business-trip-notes', level: 'medium', intro: '为技术大会忙碌之后，留下十多天的通勤、饮食与同行者。' },
  { id: 'markdown-latex-rendering-ios', level: 'medium', intro: '从寻找现成方案，到自己掌握渲染链路。一寸一寸地柳暗花明。', related: ['observer'] },
  { id: 'ios-network-layer-evolution', level: 'medium', intro: '从 Moya 的启蒙出发，再为新的尝试取名 Moira。' },
  { id: 'developer-journey-year-4', level: 'large', intro: 'AI 改变了探索的节奏。告别北京，再去下一个舞台。' },
  { id: 'observer', level: 'large', intro: '当探索变得太快，作者还站在哪里。', related: ['ios-image-compression', 'markdown-latex-rendering-ios', 'wicompress-2-architecture-ai'] },
  { id: 'cache-images', title: '缓存与网络图片', level: 'medium', intro: '从网络图片走向缓存研究与 Latte，再回到加载和展示，尝试 Iris。', members: ['caffeine-moka-cache-notes', 'ios-network-image-survey'] },
  { id: 'wicompress-2-architecture-ai', level: 'large', intro: '这一次，我没有只做一个旁观者。', related: [...compression, 'observer'] },
  { id: 'after-deleting-ai-skills', level: 'medium', intro: '一次对照实验以后，重新判断 Skill 应该保存什么。' },
  { id: 'why-i-still-create', level: 'large', intro: '问题仍然没有答案，但明天大概还是会继续做今天愿意做的事情。', related: ['the-echo-that-never-came'] },
  { id: 'the-echo-that-never-came', level: 'large', intro: '回响始终没有来。他还在等，只是不再拿它验收自己。', related: ['why-i-still-create'] },
];

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
