// Created by weixi on 2026/10/25.

import '../styles/home-recent-posts.css';
import PostTitle from './PostTitle';

export interface HomePost {
  href: string;
  title: string;
  category: string;
  publishedAt: string;
  summary: string;
  recommended?: boolean;
}

export default function HomeRecentPosts({ posts }: { posts: HomePost[] }) {
  return (
    <section className="home-recent-posts" aria-labelledby="recent-posts-heading">
      <header className="home-recent-posts__header">
        <h2 id="recent-posts-heading">最近写下</h2>
        <nav className="home-recent-posts__archive" aria-label="全部文章">
          <a href="/archive/">查看更多文章</a>
        </nav>
      </header>
      <ol className="home-recent-posts__list" role="list">
        {posts.map((post, index) => {
          // Match the banner: separate only an exact category prefix.
          const prefix = `「${post.category}」`;
          const title = post.title.startsWith(prefix)
            ? post.title.slice(prefix.length).trimStart() || post.title
            : post.title;

          return <li className="home-recent-posts__item" key={post.href}>
            <article>
              <div className="home-recent-posts__meta">
                <span className="home-recent-posts__number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                <time dateTime={post.publishedAt}>{post.publishedAt.replaceAll('-', ' / ')}</time>
                <span className="home-recent-posts__dot" aria-hidden="true" />
                <span className="home-recent-posts__category">{post.category}</span>
              </div>
              <h3 className="home-recent-posts__title"><a href={post.href}><PostTitle title={title} recommended={post.recommended} /></a></h3>
              <p className="home-recent-posts__intro">{post.summary}</p>
            </article>
          </li>;
        })}
      </ol>
    </section>
  );
}
