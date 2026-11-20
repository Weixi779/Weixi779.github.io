// Created by weixi on 2026/11/18.

import { useState } from 'react';
import PostTitle from '../../components/post/PostTitle';
import type { ColumnArticle } from './catalog';

export default function ColumnReadingList({ articles }: { articles: readonly ColumnArticle[] }) {
  const [newestFirst, setNewestFirst] = useState(false);
  if (articles.length === 0) return <p className="column-empty">这个专栏还没有收录文章。</p>;

  const ordered = newestFirst
    ? [...articles].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    : articles;

  return <>
    {articles.length > 1 && (
      <button type="button" className="column-reading-order"
        aria-label="按发布时间排序，最新优先" aria-pressed={newestFirst}
        title={newestFirst ? '当前最新优先，切换为最早优先' : '当前最早优先，切换为最新优先'}
        onClick={() => setNewestFirst(current => !current)}>
        发布时间
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 6h9M3 12h7M3 18h5M17.5 5v14" />
          <path d={newestFirst ? 'm14 15.5 3.5 3.5 3.5-3.5' : 'm14 8.5 3.5-3.5 3.5 3.5'} />
        </svg>
      </button>
    )}
    <ol className="column-reading-list" aria-label="收录文章" role="list">
      {ordered.map(article => {
        const date = article.publishedAt.slice(0, 10);
        return (
          <li key={article.slug}>
            <a className="column-link" href={article.href}>
              <h2><PostTitle title={article.title} recommended={article.recommended} /></h2>
              <time dateTime={date}>{date.replaceAll('-', ' / ')}</time>
              {article.summary && <p>{article.summary}</p>}
            </a>
          </li>
        );
      })}
    </ol>
  </>;
}
