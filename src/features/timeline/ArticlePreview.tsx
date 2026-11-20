// Created by weixi on 2026/10/29.
import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { TimelineStory } from './curation';

export default function ArticlePreview({ story, anchor, onDismiss, focusOnOpen = false }: {
  story: TimelineStory;
  anchor: HTMLElement;
  onDismiss: () => void;
  focusOnOpen?: boolean;
}) {
  const link = useRef<HTMLElement>(null);
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
      const clampTop = (top: number) => Math.max(72, Math.min(top, window.innerHeight - height - 16));
      const topCandidates = [...new Set([clampTop(above), clampTop(label.bottom + 18)])];
      // A tall directory must not cover its own trigger and intercept the opening click.
      const blockers = [...obstacles, label];
      const leftCandidates = [...new Set([...candidates, clampLeft(label.right + 16), clampLeft(label.left - bubble.offsetWidth - 16)])];
      const placement = topCandidates.flatMap(top => leftCandidates.map(left => ({ left, top })))
        .find(candidate => !blockers.some(obstacle =>
          candidate.left < obstacle.right + 8 && candidate.left + bubble.offsetWidth > obstacle.left - 8 &&
          candidate.top < obstacle.bottom + 8 && candidate.top + height > obstacle.top - 8,
        ));
      // The opaque outline may cover neighbouring content when no empty slot fits,
      // but keep the opening trigger clear and the directory inside the viewport.
      const fallback = topCandidates.flatMap(top => leftCandidates.map(left => ({ left, top })))
        .find(candidate => candidate.left >= label.right + 8 || candidate.left + bubble.offsetWidth <= label.left - 8 ||
          candidate.top >= label.bottom + 8 || candidate.top + height <= label.top - 8);
      setPosition(placement ?? fallback ?? { left, top: clampTop(above) });
    };
    const outside = (event: MouseEvent) => {
      if (event.target instanceof Node && !bubble.contains(event.target) &&
        !(anchor.closest('.story') ?? anchor).contains(event.target)) onDismiss();
    };
    const key = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (bubble.contains(document.activeElement)) anchor.focus({ preventScroll: true });
      onDismiss();
    };
    // The portal is visually beside its trigger, so Tab should leave it there too.
    const tabOut = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const links = Array.from(bubble.querySelectorAll<HTMLElement>('a'));
      if (event.shiftKey && document.activeElement === links[0]) {
        event.preventDefault();
        anchor.focus({ preventScroll: true });
        onDismiss();
      } else if (!event.shiftKey && document.activeElement === links.at(-1)) {
        const next = Array.from(document.querySelectorAll<HTMLElement>('a[href], button, [tabindex]')).find(element =>
          element.tabIndex >= 0 && !element.matches(':disabled') && !element.closest('[inert], [hidden]') &&
          !bubble.contains(element) && element.getClientRects().length > 0 &&
          Boolean(anchor.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING));
        if (next) {
          event.preventDefault();
          next.focus({ preventScroll: true });
          onDismiss();
        }
      }
    };
    bubble.addEventListener('keydown', tabOut);
    place();
    const observer = new ResizeObserver(place);
    observer.observe(bubble);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    document.addEventListener('click', outside);
    document.addEventListener('keydown', key);
    return () => {
      bubble.removeEventListener('keydown', tabOut);
      observer.disconnect();
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      document.removeEventListener('click', outside);
      document.removeEventListener('keydown', key);
    };
  }, [anchor, onDismiss]);

  useLayoutEffect(() => {
    if (focusOnOpen && position) link.current?.querySelector<HTMLElement>('a')?.focus({ preventScroll: true });
  }, [focusOnOpen, position !== null]);

  const series = Boolean(story.column) || story.articles.length > 1;
  const article = story.articles[0];
  const content = <>
    <svg viewBox="0 0 480 300" preserveAspectRatio="none" aria-hidden="true">
      <path d="M48 18 C120 4 192 17 258 10 S393 6 435 25 C467 43 463 82 470 129 S475 223 447 254 C419 281 350 273 298 282 S159 286 99 278 C47 279 18 263 13 225 S8 143 12 95 C11 54 21 29 48 18 Z" />
      <path className="dry-stroke" d="M26 61 C34 28 76 20 112 20 M363 280 C409 277 445 277 461 245" />
    </svg>
    <h2>{series ? story.title : article.title}</h2><p>{series ? story.intro : article.excerpt}</p>
    {series && <nav className="preview-chapters" aria-label="系列文章">
      {story.articles.map((member, index) => <a key={member.slug} href={`/posts/${member.slug}/`} aria-label={member.title}>
        <span className="chapter-number">{String(index + 1).padStart(2, '0')}</span>
        <span>{member.title.split(' - ').at(-1)}</span><span className="chapter-arrow" aria-hidden="true">↗</span>
      </a>)}
    </nav>}
    {story.column && <a className="timeline-column-link" href={`/columns/${story.column}/`}>阅读完整专栏 →</a>}
  </>;
  const style = { ...position, visibility: position ? 'visible' as const : 'hidden' as const };
  return createPortal(series
    ? <section id="timeline-preview" ref={element => { link.current = element; }} className="timeline-article-preview series-preview"
        aria-label={`${story.title}系列目录`} style={style}>{content}</section>
    : <a ref={element => { link.current = element; }} className="timeline-article-preview"
        aria-label={`预览《${article.title}》`} href={`/posts/${article.slug}/`} style={style}>{content}</a>, document.body);
}
