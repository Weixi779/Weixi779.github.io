// Created by weixi on 2026/10/28.
import { expect, it } from 'vitest';
import { buildTimelineStories } from '../src/components/timeline/curation';

it('curates published inputs, groups a series once, and preserves member dates', () => {
  const stories = buildTimelineStories([
    { slug: 'unity-sandbox-building-state-pattern', title: '状态模式', date: '2024-04-27' },
    { slug: 'unity-sandbox-building-camera-control', title: '相机控制', date: '2024-04-14' },
    { slug: 'ios-logging-system-design', title: '日志系统设计', date: '2026-01-09' },
    { slug: 'the-echo-that-never-came', title: '回响', date: '2026-10-25' },
  ]);
  expect(stories).toHaveLength(2);
  expect(stories[0]).toMatchObject({ id: 'unity-series', date: '2024-04-14', endDate: '2024-04-27' });
  expect(stories[0].articles.map(post => post.title)).toEqual(['相机控制', '状态模式']);
  expect(stories[1]).toMatchObject({ title: '回响', level: 'large' });
});

it('keeps cross-year relationships at their publication dates without inventing absent routes', () => {
  const stories = buildTimelineStories([
    { slug: 'wicompress-2-architecture-ai', title: 'WICompress 2.0', date: '2026-08-02' },
    { slug: 'image-compression-fundamentals', title: '浅谈图片压缩', date: '2024-03-07' },
    { slug: 'observer', title: '旁观者', date: '2026-07-04' },
  ]);
  const wi = stories.find(story => story.id === 'wicompress-2-architecture-ai')!;
  expect(wi.date).toBe('2026-08-02');
  expect(wi.related.map(post => [post.slug, post.date])).toEqual([
    ['image-compression-fundamentals', '2024-03-07'], ['observer', '2026-07-04'],
  ]);
  expect(stories.map(story => story.id)).toEqual(['image-compression-fundamentals', 'observer', 'wicompress-2-architecture-ai']);
});

it('rejects missing references, duplicate membership and malformed editorial choices at publication', async () => {
  const { validateTimelineConfig } = await import('../src/components/timeline/timeline-config');
  const posts = [{ slug: 'a', title: 'A', date: '2026-01-01' }];
  const story = { id: 'a', level: 'large', intro: '导读' };
  expect(() => validateTimelineConfig({ stories: [story] }, posts)).not.toThrow();
  expect(() => validateTimelineConfig({ stories: [{ ...story, id: 'missing' }] }, posts)).toThrow(/missing/);
  expect(() => validateTimelineConfig({ stories: [story, story] }, posts)).toThrow(/重复/);
  expect(() => validateTimelineConfig({ stories: [{ ...story, level: 'larg' }] }, posts)).toThrow();
  expect(() => validateTimelineConfig({ stories: [{ ...story, related: ['missing'] }] }, posts)).toThrow(/missing/);
  expect(() => validateTimelineConfig({ stories: [story, { ...story, id: 'series', title: '系列', members: ['a', 'b'] }] }, [...posts, { ...posts[0], slug: 'b' }])).toThrow(/重复/);
});


it('validates experience links while allowing explicitly pending articles', async () => {
  const { validateEntryLinks } = await import('../src/components/timeline/timeline-config');
  const entry = { date: '', kind: '', title: '', body: '', links: [['文章', 'missing']] as [string, string, 'pending'?][] };
  expect(() => validateEntryLinks({ university: entry }, [])).toThrow(/university.*missing/);
  entry.links[0][2] = 'pending';
  expect(() => validateEntryLinks({ university: entry }, [])).not.toThrow();
  entry.links[0][2] = undefined;
  expect(() => validateEntryLinks({ university: entry }, [{ slug: 'missing', title: '', date: '2026-01-01' }])).not.toThrow();
});
