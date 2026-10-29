// Created by weixi on 2026/10/29.
import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { TimelineArticle } from './layout';

export default function ArticlePreview({ article, anchor, onDismiss }: {
  article: TimelineArticle;
  anchor: HTMLAnchorElement;
  onDismiss: () => void;
}) {
  const link = useRef<HTMLAnchorElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const bubble = link.current!;
    const place = () => {
      const rect = anchor.getBoundingClientRect();
      const label = anchor.closest('.story-label')?.getBoundingClientRect() ?? rect;
      const height = bubble.getBoundingClientRect().height;
      const clampLeft = (left: number) => Math.max(16, Math.min(left, window.innerWidth - bubble.offsetWidth - 16));
      let left = clampLeft(rect.left);
      const above = rect.top - height - 18;
      // Prefer empty space so previews obscure as little of the timeline as possible.
      const obstacles = Array.from(anchor.closest('.life-timeline')?.querySelectorAll(
        'header > div, header nav, .timeline-toolbar > div, .story-label.label-visible',
      ) ?? []).filter(element => !element.contains(anchor)).map(element => element.getBoundingClientRect());
      const candidates = [left, ...obstacles.flatMap(obstacle => [obstacle.right + 16, obstacle.left - bubble.offsetWidth - 16])]
        .map(clampLeft).sort((a, b) => Math.abs(a - rect.left) - Math.abs(b - rect.left));
      const clearAbove = above >= 72 ? candidates.find(candidate => !obstacles.some(obstacle =>
        candidate < obstacle.right + 8 && candidate + bubble.offsetWidth > obstacle.left - 8 &&
        above < obstacle.bottom + 8 && above + height > obstacle.top - 8,
      )) : undefined;
      if (clearAbove !== undefined) left = clearAbove;
      const top = clearAbove !== undefined ? above : Math.min(label.bottom + 18, window.innerHeight - height - 16);
      setPosition({ left, top: Math.max(16, top) });
    };
    const outside = (event: MouseEvent) => {
      if (event.target instanceof Node && !bubble.contains(event.target) &&
        !(anchor.closest('.story') ?? anchor).contains(event.target)) onDismiss();
    };
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') onDismiss(); };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(bubble);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    document.addEventListener('click', outside);
    document.addEventListener('keydown', key);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      document.removeEventListener('click', outside);
      document.removeEventListener('keydown', key);
    };
  }, [anchor, onDismiss]);

  return createPortal(<a ref={link} className="timeline-article-preview" aria-label={`预览《${article.title}》`}
    href={`/posts/${article.slug}/`} style={{ ...position, visibility: position ? 'visible' : 'hidden' }}>
    <svg viewBox="0 0 480 300" preserveAspectRatio="none" aria-hidden="true">
      <path d="M48 18 C120 4 192 17 258 10 S393 6 435 25 C467 43 463 82 470 129 S475 223 447 254 C419 281 350 273 298 282 S159 286 99 278 C47 279 18 263 13 225 S8 143 12 95 C11 54 21 29 48 18 Z" />
      <path className="dry-stroke" d="M26 61 C34 28 76 20 112 20 M363 280 C409 277 445 277 461 245" />
    </svg>
    <h2>{article.title}</h2><p>{article.excerpt}</p>
  </a>, document.body);
}
