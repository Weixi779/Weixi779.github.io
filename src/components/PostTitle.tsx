// Created by weixi on 2026/10/26.

import '../styles/post-title.css';

/** Shared title content for article links, including Astro-rendered notes. */
export default function PostTitle({ title, recommended = false }: { title: string; recommended?: boolean }) {
  if (!recommended) return title;

  // Keep the last grapheme with the bookmark so it cannot wrap onto a line alone.
  const segments = Array.from(new Intl.Segmenter('zh-CN', { granularity: 'grapheme' }).segment(title));
  const end = segments.at(-1)?.index ?? 0;
  return <>{title.slice(0, end)}<span className="post-title__ending">{title.slice(end)}<span className="post-title__bookmark" role="img" aria-label="作者推荐" title="作者推荐">
    <svg viewBox="0 0 16 20" aria-hidden="true">
      <path d="M4.1 2.6 11.6 2.35Q12.05 2.4 12 3.1L11.8 17.1 8.05 14.2 4.3 17.3 3.95 3.2Q3.95 2.65 4.1 2.6Z" fill="currentColor" />
    </svg>
  </span></span></>;
}
