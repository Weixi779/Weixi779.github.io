import type { APIContext } from 'astro';
import { getPostExcerpt, getPostPath, getPublishedPosts } from '../utils/posts';

const fallbackSite = new URL('https://weixi779.github.io');

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export async function GET({ site }: APIContext): Promise<Response> {
  const baseUrl = site ?? fallbackSite;
  const posts = await getPublishedPosts();
  const feedUrl = new URL('/rss.xml', baseUrl).href;
  const homeUrl = new URL('/', baseUrl).href;
  const lastBuildDate = posts[0]?.data.date ?? new Date(0);
  const items = posts
    .map((post) => {
      const postUrl = new URL(getPostPath(post), baseUrl).href;
      const categories = post.data.tags
        .map((tag) => `      <category>${escapeXml(tag)}</category>`)
        .join('\n');

      return `    <item>
      <title>${escapeXml(post.data.title)}</title>
      <link>${escapeXml(postUrl)}</link>
      <guid isPermaLink="true">${escapeXml(postUrl)}</guid>
      <pubDate>${post.data.date.toUTCString()}</pubDate>
      <description>${escapeXml(post.data.summary || getPostExcerpt(post))}</description>
${categories}
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>伟兮の小屋</title>
    <link>${escapeXml(homeUrl)}</link>
    <description>个人博客记录成长</description>
    <language>zh-CN</language>
    <lastBuildDate>${lastBuildDate.toUTCString()}</lastBuildDate>
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  });
}
