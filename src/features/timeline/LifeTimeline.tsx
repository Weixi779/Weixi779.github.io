// Created by weixi on 2026/10/28.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { timelineToday, useTimelineDate } from './date';
import ArticlePreview from './ArticlePreview';
import { entries, periods } from './data';
import { buildTimelineLayout, zoomAround, buildRulerTicks, storyVisibility, smooth, type TimelineArticle } from './layout';
import { buildTimelineStories, findTimelineColumn, type TimelineStory } from './curation';
import './life-timeline.css';

const ENTRANCE_KEY = 'life-timeline:entered-v2';
let enteredWithoutStorage = false;
const toYear = (ms: number) => {
  const year = new Date(ms).getUTCFullYear();
  return year + (ms - Date.UTC(year, 0, 1)) / (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1));
};


// A stable seed keeps each hand-drawn span recognizable as the viewport moves.
function inkPath(id: string, width: number) {
  let seed = 0;
  for (const c of id) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const a = (random() - .5) * 5, b = (random() - .5) * 5;
  random();
  const thickness = 1.1 + random() * .6;
  const upper: string[] = [], lower: string[] = [];
  for (let i = 0; i <= 48; i++) {
    const t = i / 48, x = width * t;
    const y = 27 + Math.sin(t * Math.PI * 2) * a * .55 + Math.sin(t * Math.PI) * b * .4;
    const pressure = .65 + Math.sin(t * Math.PI) * thickness * .5;
    // Serialize at subpixel precision: JS engines can differ in Math.sin's final bits.
    // Those invisible differences must not change the server/client SVG attributes.
    upper.push(`${x.toFixed(3)} ${(y - pressure / 2).toFixed(3)}`);
    lower.unshift(`${x.toFixed(3)} ${(y + pressure / 2).toFixed(3)}`);
  }
  return `M ${upper.join(' L ')} L ${lower.join(' L ')} Z`;
}

export default function LifeTimeline({ articles, initialDate = timelineToday() }: { articles: TimelineArticle[]; initialDate?: string }) {
  const currentDate = useTimelineDate(initialDate);
  const today = toYear(Date.parse(currentDate));
  const stories = useMemo(() => buildTimelineStories(articles), [articles]);
  const layout = useMemo(() => buildTimelineLayout(stories, { start: Math.floor(Math.min(...periods.map(period => period.start))), end: today }), [stories, today]);
  const canvas = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLElement>(null);
  const lastButton = useRef<HTMLButtonElement | null>(null);
  const [size, setSize] = useState({ width: 1200, height: 500 });
  const [introHeights, setIntroHeights] = useState<Record<string, number>>({});
  const [center, setCenter] = useState(() => layout.position(2022.8));
  const [scale, setScale] = useState(500);
  const scaleRef = useRef(scale);
  const scaleTarget = useRef(scale);
  const zoomAnchor = useRef<{ date: number; offset: number } | null>(null);
  const centerRef = useRef(center);
  const target = useRef(center);
  const frame = useRef(0);
  const reduced = useRef(false);
  const [entering, setEntering] = useState(false);
  const entranceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const entranceStarted = useRef(false);
  const entrancePlaying = useRef(false);
  const finishEntrance = () => {
    entrancePlaying.current = false;
    if (entranceTimer.current !== null) clearTimeout(entranceTimer.current);
    entranceTimer.current = null;
    setEntering(false);
    if (entranceStarted.current) {
      try { sessionStorage.setItem(ENTRANCE_KEY, '1'); sessionStorage.setItem(`${ENTRANCE_KEY}:document`, String(performance.timeOrigin)); } catch { enteredWithoutStorage = true; }
    }
  };
  const [activeArticle, setActiveArticle] = useState<string | null>(null);
  const [hoveredArticle, setHoveredArticle] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ story: TimelineStory; anchor: HTMLElement; focusOnOpen?: boolean } | null>(null);
  const dismissPreview = useCallback(() => setPreview(null), []);
  function showPreview(story: TimelineStory, anchor: HTMLElement, focusOnOpen = false) {
    if (selected || (!story.column && story.articles.length === 1 && !story.articles[0].excerpt) || dragging || frame.current || entrancePlaying.current) return;
    const label = layout.labels.find(label => label.story.id === story.id);
    if (!label || storyVisibility(label, scaleRef.current, viewBounds.current.minScale).title <= .7) return;
    if (focusOnOpen && preview?.story.id === story.id) {
      document.getElementById('timeline-preview')?.querySelector<HTMLElement>('a')?.focus({ preventScroll: true });
    }
    setPreview(current => current?.story.id === story.id && !focusOnOpen ? current : { story, anchor, focusOnOpen });
  }
  const [hover, setHover] = useState<number | null>(null);
  const [pointerY, setPointerY] = useState<number | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ id: number; start: number; last: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  const { width } = size;
  const mobile = width < 600;
  const axis = mobile ? (width < 360 ? 346 : 316) : 326;
  const periodGap = mobile ? 54 : 60;
  const periodRowHeight = 64;
  const labelWidthFor = (labelWidth: number) => Math.min(labelWidth, Math.max(180, (width - 48) / 1.065));
  const minScale = Math.max(10, (width - 90) / layout.total);
  const viewBounds = useRef({ width, minScale, total: layout.total });
  viewBounds.current = { width, minScale, total: layout.total };
  const clamp = (value: number, currentScale = scaleRef.current) => {
    const half = (viewBounds.current.width - 70) / currentScale / 2;
    const total = viewBounds.current.total;
    return half >= total / 2 ? total / 2 : Math.max(half, Math.min(total - half, value));
  };
  const centerDate = layout.year(center);
  const spanYears = Math.min(layout.end, layout.year(center + width / scale / 2)) - Math.max(layout.first, layout.year(center - width / scale / 2));
  const highlightedArticle = hoveredArticle ?? activeArticle;
  const activeStory = stories.find(story => story.id === highlightedArticle);
  const activeTime = activeStory ? toYear(Date.parse(activeStory.date)) : null;
  const focusX = hover ?? (activeTime === null ? width / 2 : (layout.position(activeTime) - center) * scale + width / 2);
  const xWorld = (position: number) => (position - center) * scale + width / 2;
  const x = (time: number) => xWorld(layout.position(time));
  const focusTime = layout.year(center + (focusX - width / 2) / scale);
  // Reuse the ruler's pointer position; only the closest collapsed story responds.
  const nearbyStory = hover !== null && pointerY !== null && !dragging
    && pointerY >= axis - 110 && pointerY <= axis + 24 && scale / minScale > 1.4
    ? layout.labels.filter(label => Math.abs(xWorld(label.position) - hover) < 48
      && storyVisibility(label, scale, minScale).title <= .7)
      .sort((a, b) => Math.abs(xWorld(a.position) - hover) - Math.abs(xWorld(b.position) - hover))[0]
    : undefined;

  function animateView() {
    if (frame.current) return;
    function animate() {
      frame.current = 0;
      const scaleDifference = Math.log(scaleTarget.current / scaleRef.current);
      scaleRef.current = reduced.current || Math.abs(scaleDifference) < .0005
        ? scaleTarget.current : scaleRef.current * Math.exp(scaleDifference * .22);
      const difference = target.current - centerRef.current;
      centerRef.current = zoomAnchor.current
        ? clamp(zoomAnchor.current.date - zoomAnchor.current.offset / scaleRef.current)
        : reduced.current || Math.abs(difference) < .0001 ? target.current : centerRef.current + difference * .18;
      setScale(scaleRef.current); setCenter(centerRef.current);
      if (scaleRef.current !== scaleTarget.current || centerRef.current !== target.current) {
        frame.current = requestAnimationFrame(animate);
      } else { zoomAnchor.current = null; }
    }
    frame.current = requestAnimationFrame(animate);
  }

  function zoom(factor: number, offset = 0, direct = false) {
    dismissPreview();
    const anchorDate = centerRef.current + offset / scaleRef.current;
    const next = zoomAround({ center: centerRef.current, scale: direct ? scaleRef.current : scaleTarget.current }, factor, 0, viewBounds.current.minScale);
    scaleTarget.current = next.scale;
    target.current = clamp(anchorDate - offset / next.scale, next.scale);
    zoomAnchor.current = { date: anchorDate, offset };
    if (direct || reduced.current) {
      cancelAnimationFrame(frame.current); frame.current = 0;
      scaleRef.current = next.scale; centerRef.current = target.current;
      zoomAnchor.current = null;
      setScale(next.scale); setCenter(centerRef.current);
    } else animateView();
  }

  function move(value: number) {
    dismissPreview();
    zoomAnchor.current = null; scaleTarget.current = scaleRef.current;
    target.current = clamp(value);
    animateView();
  }

  function selectStory(id: string) {
    setActiveArticle(id);
    const label = layout.labels.find(label => label.story.id === id);
    if (!label) return;
    if (storyVisibility(label, scaleRef.current, viewBounds.current.minScale).title <= .7) {
      scaleTarget.current = Math.min(20000, Math.max(scaleRef.current * 1.65, (label.clearance + 85) / label.gap, viewBounds.current.minScale * 4.2));
      target.current = clamp(label.position + 100 / scaleTarget.current, scaleTarget.current);
      zoomAnchor.current = null;
      dismissPreview();
      animateView();
      return;
    }
    const left = (label.position - centerRef.current) * scaleRef.current + width / 2;
    const right = left + labelWidthFor(label.width) * 1.065;
    const shift = left < 24 ? left - 24 : right > width - 24 ? right - (width - 24) : 0;
    if (shift) move(centerRef.current + shift / scaleRef.current);
  }

  useEffect(() => {
    const element = canvas.current!;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const motionChanged = () => { reduced.current = media.matches; if (media.matches) finishEntrance(); };
    motionChanged();
    let alreadyEntered = enteredWithoutStorage;
    const navigation = performance.getEntriesByType?.('navigation')[0] as PerformanceNavigationTiming | undefined;
    try {
      const completedThisDocument = sessionStorage.getItem(`${ENTRANCE_KEY}:document`) === String(performance.timeOrigin);
      alreadyEntered = sessionStorage.getItem(ENTRANCE_KEY) === '1'
        && (navigation?.type !== 'reload' || completedThisDocument);
    } catch { /* Storage may be unavailable in private browsing. */ }
    const startEntrance = () => {
      if (alreadyEntered || media.matches || entranceStarted.current || document.visibilityState !== 'visible') return;
      entranceStarted.current = true;
      entrancePlaying.current = true;
      setEntering(true);
      entranceTimer.current = setTimeout(finishEntrance, 800);
    };
    startEntrance();
    document.addEventListener('visibilitychange', startEntrance);
    media.addEventListener?.('change', motionChanged);
    const intros = Array.from(element.querySelectorAll<HTMLElement>('.story-label p'));
    const resize = () => {
      setSize({ width: element.clientWidth, height: element.clientHeight });
      setIntroHeights(previous => {
        const next = { ...previous };
        let changed = false;
        for (const intro of intros) {
          const id = intro.closest<HTMLElement>('[data-story]')!.dataset.story!;
          // Hidden/offscreen stories keep their last valid measurement.
          if (intro.offsetHeight > 0 && intro.offsetHeight !== previous[id]) {
            next[id] = intro.offsetHeight; changed = true;
          }
        }
        return changed ? next : previous;
      });
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    intros.forEach(intro => observer.observe(intro));
    resize();
    const wheel = (event: WheelEvent) => {
      if (event.metaKey) return;
      if (!event.ctrlKey && Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      if (entrancePlaying.current) { event.preventDefault(); return; }
      if (event.ctrlKey) {
        event.preventDefault();
        zoom(Math.exp(-event.deltaY * .01), event.clientX - element.getBoundingClientRect().left - element.clientWidth / 2, true);
        return;
      }
      event.preventDefault();
      const delta = event.deltaX;
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientWidth : 1;
      move(target.current + delta * unit / scaleRef.current);
    };
    // Touch pinch shares the same anchored zoom operation as trackpad pinch.
    let pinch: { distance: number; midpoint: number } | null = null;
    const touchStart = (event: TouchEvent) => {
      if (event.touches.length !== 2) return;
      drag.current = null; suppressClick.current = true;
      const [a, b] = Array.from(event.touches);
      pinch = { distance: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), midpoint: (a.clientX + b.clientX) / 2 };
    };
    const touchMove = (event: TouchEvent) => {
      if (!pinch || event.touches.length !== 2) return;
      event.preventDefault();
      const [a, b] = Array.from(event.touches);
      const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const midpoint = (a.clientX + b.clientX) / 2;
      zoom(distance / Math.max(1, pinch.distance), pinch.midpoint - element.getBoundingClientRect().left - element.clientWidth / 2, true);
      centerRef.current = target.current = clamp(centerRef.current - (midpoint - pinch.midpoint) / scaleRef.current);
      setCenter(centerRef.current);
      pinch = { distance, midpoint };
    };
    const touchEnd = () => { pinch = null; };
    element.addEventListener('wheel', wheel, { passive: false });
    element.addEventListener('touchstart', touchStart, { passive: true });
    element.addEventListener('touchmove', touchMove, { passive: false });
    element.addEventListener('touchend', touchEnd);
    element.addEventListener('touchcancel', touchEnd);
    return () => {
      if (entranceTimer.current !== null) clearTimeout(entranceTimer.current);
      document.removeEventListener('visibilitychange', startEntrance);
      entranceStarted.current = false;
      observer.disconnect(); element.removeEventListener('wheel', wheel);
      element.removeEventListener('touchstart', touchStart); element.removeEventListener('touchmove', touchMove);
      element.removeEventListener('touchend', touchEnd); element.removeEventListener('touchcancel', touchEnd);
      media.removeEventListener?.('change', motionChanged);
      cancelAnimationFrame(frame.current); frame.current = 0;
    };
  }, []);

  useLayoutEffect(() => {
    if (!selected || !dialog.current || !lastButton.current) return;
    target.current = centerRef.current; scaleTarget.current = scaleRef.current; zoomAnchor.current = null;
    const panel = dialog.current, anchor = lastButton.current;
    const place = () => {
      const rect = anchor.getBoundingClientRect();
      const below = window.innerHeight - rect.bottom - 24;
      const above = rect.top - 88;
      const useBelow = below >= 360 || below >= above;
      const available = Math.max(180, Math.min(580, useBelow ? below : above));
      panel.style.setProperty('--reader-space', `${available}px`);
      panel.style.left = `${Math.max(16, Math.min(rect.left, window.innerWidth - panel.offsetWidth - 16))}px`;
      panel.style.top = `${Math.max(80, useBelow ? rect.bottom + 12 : rect.top - panel.offsetHeight - 12)}px`;
    };
    const outside = (event: MouseEvent) => {
      if (event.target instanceof Node && !panel.contains(event.target) &&
        !(event.target instanceof Element && event.target.closest('.period'))) setSelected(null);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setSelected(null); anchor.focus({ preventScroll: true }); }
    };
    place();
    panel.querySelector<HTMLElement>('.reader-prose')?.focus({ preventScroll: true });
    panel.addEventListener('toggle', place, true);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    document.addEventListener('click', outside);
    document.addEventListener('keydown', key);
    return () => {
      panel.removeEventListener('toggle', place, true);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      document.removeEventListener('click', outside);
      document.removeEventListener('keydown', key);
    };
  }, [selected]);

  function open(id: string, button: HTMLButtonElement) {
    lastButton.current = button;
    dismissPreview();
    setSelected(current => current === id ? null : id);
  }
  const mainPeriods = periods.filter(period => !period.parent);
  const periodRows = Math.max(...mainPeriods.map(period => period.row)) + 1;
  const rulerTicks = useMemo(() => buildRulerTicks(layout, scale, center, width, minScale), [layout, scale, center, width, minScale]);
  const ticks = rulerTicks.map(tick => {
    const near = hover !== null || activeTime !== null ? Math.exp(-Math.pow((tick.x - focusX) / 88, 2)) : 0;
    const emphasis = near * (nearbyStory ? .3 : 1);
    const length = tick.length + emphasis * 46;
    return <g key={tick.key} style={{ '--entrance-delay': `${Math.max(0, Math.min(1, tick.x / width)) * 90}ms` } as CSSProperties}>
      <line className="axis-tick" data-detail={tick.annual ? 'year' : tick.label ? 'month' : 'fine'}
        x1={tick.x} x2={tick.x} y1={axis - length} y2={axis} opacity={tick.opacity}
        stroke={`url(#timeline-${tick.annual || tick.label ? 'major' : 'minor'})`} strokeWidth={tick.annual ? 1.6 : 1} />
      <line className="axis-tick axis-highlight" x1={tick.x} x2={tick.x} y1={axis - length} y2={axis}
        opacity={tick.opacity * emphasis} stroke="var(--accent)" strokeWidth={1 + emphasis} />
      {tick.label && <text className="axis-label" x={tick.x + 2} y={axis + 25} opacity={tick.labelOpacity}
        fill={tick.annual ? 'var(--ink)' : 'var(--muted)'} fontSize={tick.annual ? 14 : 11}
        fontFamily="var(--font-code)">{tick.label}</text>}
    </g>;
  });
  const entry = selected ? entries[selected] : null;
  const column = findTimelineColumn(entry?.column);
  const entryLinks = entry?.links.filter(([, slug]) => !column?.articles.includes(slug)) ?? [];
  const projects = [...new Set(periods.filter(period => period.parent === selected).map(period => period.entry))];
  return <section className={`life-timeline${entering ? ' entering' : ''}`} aria-label="一路走来" inert={entering} aria-busy={entering}
    style={{ '--entrance-axis': `${axis}px` } as CSSProperties}>
    <div className="timeline-toolbar"><div><output className="position" aria-label="当前年份">{Math.floor(centerDate)} / {String(Math.min(12, Math.floor(centerDate % 1 * 12 + .000001) + 1)).padStart(2, '0')}</output>
      <span className="tools" role="group" aria-label="跳转年份">{layout.years.map(year => <button key={year} aria-current={year === Math.floor(centerDate) ? 'date' : undefined} aria-label={`跳转到 ${year} 年`} onClick={() => {
        if (scaleRef.current < 500) zoom(500 / scaleRef.current, 0, true);
        else if (scaleRef.current > width) zoom(width / scaleRef.current, 0, true);
        move(layout.position(year + .5));
      }}>{year}</button>)}</span></div>
      <div className="zoom-tools" role="group" aria-label="时间轴缩放">
        <button aria-label="缩小时间轴" disabled={scale <= minScale} onClick={() => zoom(1 / 1.5)}>−</button>
        <output aria-label="可见时间跨度">{spanYears >= 1 ? `${spanYears.toFixed(1)} 年` : `${Math.max(1, Math.round(spanYears * 365))} 天`}</output>
        <button aria-label="放大时间轴" disabled={scale >= 20000} onClick={() => zoom(1.5)}>＋</button>
        <button className="reset-zoom" onClick={() => zoom(500 / scaleTarget.current)}>重置</button>
      </div>
    </div>
    <div ref={canvas} style={{ height: axis + periodGap + periodRows * periodRowHeight + 24 }} className={`canvas${dragging ? ' dragging' : ''}`} tabIndex={0}
      aria-label="时间画布：滚动或拖动浏览，方向键移动"
      onKeyDown={event => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault(); move(target.current + (event.key === 'ArrowLeft' ? -1 : 1) * width * .35 / scaleRef.current);
        } else if (event.key === '+' || event.key === '=' || event.key === '-') {
          event.preventDefault(); zoom(event.key === '-' ? 1 / 1.5 : 1.5);
        }
      }}
      onPointerDown={event => {
        if (event.button !== 0 || drag.current) return;
        suppressClick.current = false;
        drag.current = { id: event.pointerId, start: event.clientX, last: event.clientX, moved: false };
      }}
      onPointerMove={event => {
        const rect = event.currentTarget.getBoundingClientRect();
        setHover(event.clientX - rect.left);
        setPointerY(event.pointerType === 'touch' ? null : event.clientY - rect.top);
        const pointer = drag.current;
        if (!pointer || pointer.id !== event.pointerId) return;
        if (Math.abs(event.clientX - pointer.start) > 5) {
          pointer.moved = true; setDragging(true);
          event.currentTarget.setPointerCapture(event.pointerId);
        }
        if (pointer.moved) move(target.current - (event.clientX - pointer.last) / scaleRef.current);
        pointer.last = event.clientX;
      }}
      onPointerUp={() => { suppressClick.current = drag.current?.moved ?? false; drag.current = null; setDragging(false); }}
      onPointerCancel={() => { drag.current = null; setDragging(false); setHover(null); }}
      onLostPointerCapture={() => { drag.current = null; setDragging(false); }}
      onPointerLeave={() => { setHover(null); setHoveredArticle(null); if (!dragging) drag.current = null; }}
      onClickCapture={event => { if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); suppressClick.current = false; } }}>
      <svg className="ruler" aria-hidden="true"><defs>{['major', 'minor'].map(id =>
        <linearGradient key={id} id={`timeline-${id}`} gradientUnits="userSpaceOnUse" x1="0" x2="0" y1={axis - 100} y2={axis}>
          {[['0', 0], ['.48', .32], ['1', 1]].map(([offset, opacity]) => <stop key={offset} offset={offset} stopColor={`var(--axis-${id === 'major' ? 'major' : 'week'})`} stopOpacity={opacity} />)}
        </linearGradient>)}</defs>{ticks}
      </svg>
      {layout.labels.map(label => {
        const { story, position, width: labelWidth, lane } = label;
        const left = xWorld(position), selectedStory = highlightedArticle === story.id;
        const hidden = left + labelWidth < -32 || left > width + 32;
        const reveal = storyVisibility(label, scale, minScale);
        const titleOpacity = reveal.title;
        const introSpace = story.level === 'large' ? (introHeights[story.id] ?? 48) + 10 : 0;
        const labelBottom = Math.max(lane === 0 ? 210 : 90, introSpace + 14 + 56);
        const shortLength = { large: 50, medium: 40, small: 30 }[story.level];
        const proximity = nearbyStory?.story.id === story.id && hover !== null
          ? 1 - smooth(12, 48, Math.abs(left - hover)) : 0;
        const length = shortLength + (labelBottom - introSpace - 14 - shortLength) * titleOpacity + proximity * 22;
        const markerOpacity = smooth(1.03, 1.5, scale / minScale);
        const readable = titleOpacity > .7;
        const labelInView = left >= 0 && left + labelWidthFor(labelWidth) * 1.065 <= width;
        const markerInView = left >= 18 && left <= width - 18;
        return <div key={story.id} hidden={hidden} data-story={story.id} data-level={story.level}
          className={`story story-${story.level}${!readable ? ' story-collapsed' : ''}${proximity > 0 ? ' story-nearby' : ''}${selectedStory ? ' selected' : ''}${hoveredArticle === story.id ? ' hovered' : ''}`}
          onPointerEnter={event => {
            if (event.pointerType === 'touch' || dragging) return;
            setHoveredArticle(story.id);
            if (!readable) { dismissPreview(); return; }
            const marker = event.currentTarget.querySelector<HTMLElement>('.story-marker');
            const overMarker = event.target instanceof Element && event.target.closest('.story-marker');
            const anchor = overMarker ? marker : event.currentTarget.querySelector<HTMLElement>('.story-label a, .series-trigger');
            if (anchor) showPreview(story, anchor);
          }}
          onPointerLeave={() => setHoveredArticle(null)}
          style={{ left, top: axis, '--stem': `${length}px`, '--label-bottom': `${labelBottom}px`, '--title-opacity': titleOpacity, '--marker-opacity': markerOpacity } as CSSProperties}>
          <button className="story-marker" tabIndex={markerOpacity > .7 && markerInView ? 0 : -1} aria-hidden={markerOpacity < .1} style={{ pointerEvents: markerOpacity < .1 ? 'none' : undefined }} aria-label={`选中《${story.title}》`} aria-pressed={activeArticle === story.id}
            onClick={() => selectStory(story.id)} onFocus={event => { if (event.currentTarget.matches(':focus-visible')) selectStory(story.id); }}>
            <span className="story-stem" />
          </button>
          <div className={`story-label${readable ? ' label-visible' : ''}`} inert={titleOpacity <= .01} aria-hidden={!readable} style={{ left: 0, width: labelWidthFor(labelWidth) }}
            onClickCapture={event => { if (!readable) { event.preventDefault(); event.stopPropagation(); selectStory(story.id); } }}
            onPointerEnter={() => setHover(left)} onFocus={() => setActiveArticle(story.id)}>
            <span className="date">{story.date.replaceAll('-', '.')}{story.articles.length > 1 && ` — ${story.endDate.replaceAll('-', '.')}`}</span>
            {!story.column && story.articles.length === 1 ? <h2><a tabIndex={readable && labelInView ? 0 : -1} href={`/posts/${story.articles[0].slug}/`}
              onPointerEnter={event => { if (event.pointerType !== 'touch') showPreview(story, event.currentTarget); }}
              onFocus={event => showPreview(story, event.currentTarget)}>{story.title} <span className="read-arrow">↗</span></a></h2>
              : <h2><button className="series-trigger" tabIndex={readable && labelInView ? 0 : -1} aria-controls={preview?.story.id === story.id ? "timeline-preview" : undefined} aria-expanded={preview?.story.id === story.id}
                onKeyDown={event => {
                  if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ' || (event.key === 'Tab' && !event.shiftKey && preview?.story.id === story.id)) {
                    event.preventDefault(); showPreview(story, event.currentTarget, true);
                  }
                }}
                onClick={event => showPreview(story, event.currentTarget)}
                onFocus={event => { if (event.currentTarget.matches(':focus-visible')) showPreview(story, event.currentTarget); }}>
                {story.title} <span className="group-count">{story.articles.length} 篇</span>
              </button></h2>}
            {story.level === 'large' && <p>{story.intro}</p>}
          </div>
        </div>;
      })}
      {mainPeriods.map(({ id: segmentId, entry: id, start, end: fixedEnd, row, parent, date }) => {
        const end = Math.min(fixedEnd ?? today, today);
        const left = x(start), right = x(end), fullWidth = right - left;
        const hidden = start > today || right < 24 || left > width - 24;
        return <button key={segmentId} aria-expanded={selected === id} aria-controls={selected === id ? "period-reader" : undefined} data-parent={parent} hidden={hidden} className={`period${(activeTime ?? focusTime) >= start && (activeTime ?? focusTime) <= end ? ' current' : ''}`}
          style={{ left: Math.max(24, left), width: Math.max(3, Math.min(width - 24, right) - Math.max(24, left)), top: axis + periodGap + row * periodRowHeight }}
          onClick={e => open(id, e.currentTarget)}>
          <span className="ink-clip"><svg className="branch-ink" aria-hidden="true" viewBox={`0 0 ${fullWidth} 45`} style={{ left: left - Math.max(24, left), width: fullWidth }}><path className="branch-main" d={inkPath(id, fullWidth)} /></svg></span>
          <span className="label">{entries[id].title}<span className="dates">{date ?? entries[id].date}</span></span>
        </button>;
      })}
    </div>
    <p className="timeline-hint">年份按内容疏密展开 · 拖动或横向滚动平移 · 双指捏合或 ＋ / − 缩放 · 移入节点查看 · 点标题阅读</p>
    {preview && !selected && layout.labels.some(label => label.story.id === preview.story.id && storyVisibility(label, scale, minScale).title > .7) && <ArticlePreview key={preview.story.id} story={preview.story} anchor={preview.anchor} focusOnOpen={preview.focusOnOpen} onDismiss={dismissPreview} />}
    {entry && <section key={selected} ref={dialog} id="period-reader" role="dialog" className="reader" aria-labelledby="reading-title">
      <svg className="reader-outline" viewBox="0 0 860 560" preserveAspectRatio="none" aria-hidden="true">
        <path d="M30 8 Q220 1 432 7 T828 8 Q853 10 851 35 L855 513 Q859 547 828 550 Q620 559 420 551 T30 552 Q7 550 9 525 L6 40 Q5 12 30 8Z" />
        <path className="echo" d="M27 16 Q145 7 290 12 M850 411 Q866 544 818 557 L693 560" />
      </svg>
      <div className="reader-heading"><p className="date">{entry.date}</p><h2 id="reading-title">{entry.title}</h2><p className="kind">{entry.kind}</p></div>
      <div className={`reader-grid${entryLinks.length || column || entry.resources?.length || projects.length ? '' : ' reader-prose-only'}`}>
        <div className="reader-prose" tabIndex={0} aria-label="阶段正文">{entry.body.split('\n\n').map((paragraph, index) => {
          const lines = paragraph.split('\n');
          if (lines.every(line => line.startsWith('- '))) return <ul className="bodycopy reader-list" key={index}>{lines.map((line, itemIndex) => {
            const text = line.slice(2);
            const heading = text.match(/^\*\*(.+?)\*\*\s*(.*)$/);
            return <li key={itemIndex}>{heading ? <><strong>{heading[1]}</strong> {heading[2]}</> : text}</li>;
          })}</ul>;
          return <p className="bodycopy" key={index}>{paragraph}</p>;
        })}</div>
        {(entryLinks.length > 0 || column || Boolean(entry.resources?.length) || projects.length > 0) && <aside>
          {projects.length > 0 && <div className="reader-projects"><h3>参与的项目</h3>{projects.map(id => {
            const project = entries[id];
            const projectColumn = findTimelineColumn(project.column);
            const links = project.links.filter(([, slug]) => !projectColumn?.articles.includes(slug));
            return <details key={id} className="reader-project">
              <summary><span>{project.title}</span><small>{project.date}</small></summary>
              <div className="project-content"><p>{project.body}</p>
                {projectColumn && <div className="links"><a href={`/columns/${projectColumn.slug}/`}>专栏 · {projectColumn.title} →</a></div>}
                {links.length > 0 && <div className="links">{links.map(([label, slug]) => <a key={slug} href={`/posts/${slug}/`}>{label} ↗</a>)}</div>}
              </div>
            </details>;
          })}</div>}
          {column && <><h3>相关专栏</h3><div className="links"><a href={`/columns/${column.slug}/`}>{column.title} →</a></div></>}
          {entryLinks.length > 0 && <><h3>当时留下的文字</h3><div className="links">{entryLinks.map(([label, slug, status]) => status === 'pending' && !articles.some(article => article.slug === slug) ? <span key={slug} className="pending-article">{label} · 待发布</span> : <a key={slug} href={`/posts/${slug}/`}>{label} ↗</a>)}</div></>}
          {entry.resources && <div className="resources"><h3>做过的东西</h3><div className="links">{entry.resources.map(([label, href]) => <a key={href} href={href}>{label} ↗</a>)}</div></div>}
        </aside>}
      </div>
    </section>}

  </section>;
}
