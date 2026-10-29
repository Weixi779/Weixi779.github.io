// Created by weixi on 2026/10/28.
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import ArticlePreview from './ArticlePreview';
import { categories, entries, periods } from './data';
import { buildTimelineLayout, zoomAround, axisDetail, type TimelineArticle } from './layout';
import { buildTimelineStories } from './curation';
import './life-timeline.css';

const ENTRANCE_KEY = 'life-timeline:entered-v2';
let enteredWithoutStorage = false;
const YEARS = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
const clamp = (value: number) => Math.max(2018.5, Math.min(2026.95, value));
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
    upper.push(`${x} ${y - pressure / 2}`); lower.unshift(`${x} ${y + pressure / 2}`);
  }
  return `M ${upper.join(' L ')} L ${lower.join(' L ')} Z`;
}

export default function LifeTimeline({ articles }: { articles: TimelineArticle[] }) {
  const stories = useMemo(() => buildTimelineStories(articles), [articles]);
  const layout = useMemo(() => buildTimelineLayout(stories), [stories]);
  const canvas = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const lastButton = useRef<HTMLButtonElement | null>(null);
  const [size, setSize] = useState({ width: 1200, height: 500 });
  const [center, setCenter] = useState(2022.8);
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
  const [category, setCategory] = useState('all');
  const [activeArticle, setActiveArticle] = useState<string | null>(null);
  const [hoveredArticle, setHoveredArticle] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ article: TimelineArticle; anchor: HTMLAnchorElement } | null>(null);
  const dismissPreview = useCallback(() => setPreview(null), []);
  function showPreview(article: TimelineArticle, anchor: HTMLAnchorElement) {
    if (!article.excerpt || dragging || entrancePlaying.current) return;
    setPreview(current => current?.article.slug === article.slug ? current : { article, anchor });
  }
  const [hover, setHover] = useState<number | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ id: number; start: number; last: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const openedAt = useRef(0);
  const { width } = size;
  const mobile = width < 600;
  const axis = mobile ? (width < 360 ? 370 : 340) : 350;
  const periodGap = mobile ? 54 : 60;
  const periodRowHeight = 64;
  const labelWidthFor = (labelWidth: number) => Math.min(labelWidth, Math.max(180, (width - 48) / 1.065));
  const highlightedArticle = hoveredArticle ?? activeArticle;
  const activeStory = stories.find(story => story.id === highlightedArticle);
  const activeTime = activeStory ? layout.labels.find(label => label.story.id === activeStory.id)!.position : null;
  const focusX = hover ?? (activeTime === null ? width / 2 : (activeTime - center) * scale + width / 2);
  const x = (time: number) => (time - center) * scale + width / 2;
  const focusTime = center + (focusX - width / 2) / scale;

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
    const next = zoomAround({ center: centerRef.current, scale: direct ? scaleRef.current : scaleTarget.current }, factor, 0);
    scaleTarget.current = next.scale;
    target.current = clamp(anchorDate - offset / next.scale);
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
    if (!mobile) return;
    const label = layout.labels.find(label => label.story.id === id);
    if (!label) return;
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
    const resize = () => setSize({ width: element.clientWidth, height: element.clientHeight });
    const observer = new ResizeObserver(resize);
    observer.observe(element); resize();
    const wheel = (event: WheelEvent) => {
      if (entrancePlaying.current) { event.preventDefault(); return; }
      if (event.metaKey) return;
      if (event.ctrlKey) {
        event.preventDefault();
        zoom(Math.exp(-event.deltaY * .01), event.clientX - element.getBoundingClientRect().left - element.clientWidth / 2, true);
        return;
      }
      event.preventDefault();
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
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

  useEffect(() => {
    if (selected) {
      target.current = centerRef.current; scaleTarget.current = scaleRef.current; zoomAnchor.current = null;
      dialog.current?.showModal();
      if (dialog.current) dialog.current.scrollTop = 0;
      openedAt.current = performance.now();
    }
  }, [selected]);

  function close() { dialog.current?.close(); }
  function open(id: string, button: HTMLButtonElement) {
    lastButton.current = button; setSelected(id);
  }
  const visible = (id: string) => category === 'all' || category === categories[id];
  const detail = axisDetail(scale);
  const ticks = [];
  for (let year = 2018; year <= 2026; year++) {
    for (let month = 0; month < 12; month++) {
      const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
      for (let day = 1; day <= days; day++) {
        const xx = x(toYear(Date.UTC(year, month, day)));
        if (xx < -100 || xx > width + 100) continue;
        const monthly = day === 1, annual = monthly && month === 0;
        const quarterly = monthly && month % 3 === 0, weekly = (day - 1) % 7 === 0;
        // Mount detail before its fade band, and keep it until the fade has finished.
        if (!monthly && !weekly && scale < 2400 && scaleTarget.current < 2400) continue;
        if (!monthly && weekly && scale < 500 && scaleTarget.current < 500) continue;
        const opacity = annual ? 1 : quarterly ? detail.quarter : monthly ? detail.month : weekly ? detail.week : detail.day;
        // Keep zero-opacity ticks mounted so threshold crossings can fade in and out.
        const near = hover !== null || activeTime !== null ? Math.exp(-Math.pow((xx - focusX) / 88, 2)) : 0;
        const length = (annual ? 42 : monthly ? 30 : weekly ? 20 : 12) + near * 46;
        const labelOpacity = annual ? 1 : quarterly ? detail.quarterLabel : monthly ? detail.monthLabel : weekly ? detail.weekLabel : detail.dayLabel;
        ticks.push(<g key={`${year}-${month}-${day}`} style={{ '--entrance-delay': `${Math.max(0, Math.min(1, xx / width)) * 90}ms` } as CSSProperties}>
          <line className="axis-tick" data-detail={monthly ? 'month' : weekly ? 'week' : 'day'}
            x1={xx} x2={xx} y1={axis - length} y2={axis} opacity={opacity}
            stroke={`url(#timeline-${monthly ? 'major' : 'minor'})`} strokeWidth={annual ? 1.6 : 1} />
          <line className="axis-tick axis-highlight" x1={xx} x2={xx} y1={axis - length} y2={axis}
            opacity={opacity * near} stroke="var(--accent)" strokeWidth={1 + near} />
          <text className="axis-label" x={xx + 2} y={axis + 25} opacity={labelOpacity}
            fill={annual ? 'var(--ink)' : 'var(--muted)'} fontSize={annual ? detail.yearSize : monthly ? 10 + detail.monthLabel : 10}
            fontFamily="var(--font-code)">{annual ? year : monthly ? `${month + 1}月` : `${month + 1}.${day}`}</text>
        </g>);
      }
    }
  }
  // Hover decorates the stable arrangement; only explicit selection changes priority.
  const occupied: Record<string, { left: number; right: number }[]> = { large: [], medium: [], small: [] };
  const labelled = new Set<string>();
  const candidates = [...layout.labels].sort((a, b) => Number(b.story.id === activeArticle) - Number(a.story.id === activeArticle));
  for (const label of candidates) {
    const left = x(label.position), labelWidth = labelWidthFor(label.width);
    if (left + labelWidth < -32 || left > width + 32) continue;
    const selectedLabel = label.story.id === activeArticle;
    if (!selectedLabel && ((label.story.level === 'medium' && scale < 280) || (label.story.level === 'small' && scale < 650))) continue;
    const lane = occupied[label.story.level];
    if (!selectedLabel && lane.some(other => left < other.right + 28 && left + labelWidth + 28 > other.left)) continue;
    lane.push({ left, right: left + labelWidth }); labelled.add(label.story.id);
  }
  if (hoveredArticle) labelled.add(hoveredArticle);
  const entry = selected ? entries[selected] : null;
  return <section className={`life-timeline${entering ? ' entering' : ''}`} aria-label="一路走来" inert={entering} aria-busy={entering}
    style={{ '--entrance-axis': `${axis}px` } as CSSProperties}>
    <header><div><h1>一路走来</h1><p className="subtitle">经历，以及当时留下的记录。</p></div>
      <nav aria-label="时间线分类">{[['all', '全部'], ['life', '经历'], ['work', '工作项目']].map(([id, label]) =>
        <button key={id} aria-pressed={category === id} onClick={() => {
          dismissPreview();
          setCategory(id);
          if (id === 'work') move(2022.8);
        }}>{label}</button>)}</nav>
    </header>
    <div className="timeline-toolbar"><div><output className="position" aria-label="当前年份">{Math.floor(center)} / {String(Math.min(12, Math.floor(center % 1 * 12) + 1)).padStart(2, '0')}</output>
      <span className="tools" role="group" aria-label="跳转年份">{YEARS.map(year => <button key={year} aria-current={year === Math.floor(center) ? 'date' : undefined} aria-label={`跳转到 ${year} 年`} onClick={() => {
        if (scaleRef.current > width) zoom(width / scaleRef.current, 0, true);
        move(year + .5);
      }}>{year}</button>)}</span></div>
      <div className="zoom-tools" role="group" aria-label="时间轴缩放">
        <button aria-label="缩小时间轴" disabled={scale <= 100} onClick={() => zoom(1 / 1.5)}>−</button>
        <output aria-label="可见时间跨度">{width / scale >= 1 ? `${(width / scale).toFixed(1)} 年` : `${Math.max(1, Math.round(width / scale * 365))} 天`}</output>
        <button aria-label="放大时间轴" disabled={scale >= 20000} onClick={() => zoom(1.5)}>＋</button>
        <button className="reset-zoom" onClick={() => zoom(500 / scaleTarget.current)}>重置</button>
      </div>
    </div>
    <div ref={canvas} style={{ height: axis + periodGap + (category === 'all' ? 3 : 1) * periodRowHeight + 66 }} className={`canvas${dragging ? ' dragging' : ''}`} tabIndex={0}
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
      {layout.labels.map(({ story, position, width: labelWidth }) => {
        const left = x(position), selectedStory = highlightedArticle === story.id;
        const hidden = category === 'work' || left + labelWidth < -32 || left > width + 32;
        const length = { large: 160, medium: 45, small: 14 }[story.level];
        return <div key={story.id} hidden={hidden} data-story={story.id} data-level={story.level}
          className={`story story-${story.level}${selectedStory ? ' selected' : ''}${hoveredArticle === story.id ? ' hovered' : ''}`}
          onPointerEnter={event => {
            if (event.pointerType === 'touch' || dragging) return;
            setHoveredArticle(story.id);
            const anchor = event.currentTarget.querySelector<HTMLAnchorElement>('.story-label a');
            if (anchor) showPreview(story.articles[0], anchor);
          }}
          onPointerLeave={() => setHoveredArticle(null)}
          style={{ left, top: axis, '--stem': `${length}px` } as CSSProperties}>
          <button className="story-marker" aria-label={`选中《${story.title}》`} aria-pressed={activeArticle === story.id}
            onClick={() => selectStory(story.id)} onFocus={event => { if (event.currentTarget.matches(':focus-visible')) selectStory(story.id); }}>
            <span className="story-stem" />
          </button>
          <div className={`story-label${labelled.has(story.id) ? ' label-visible' : ''}`} inert={!labelled.has(story.id)} aria-hidden={!labelled.has(story.id)} style={{ left: 0, width: labelWidthFor(labelWidth) }}
            onPointerEnter={() => setHover(left)} onFocus={() => setActiveArticle(story.id)}>
            <span className="date">{story.date.replaceAll('-', '.')}{story.articles.length > 1 && ` — ${story.endDate.replaceAll('-', '.')}`}</span>
            {story.articles.length === 1 ? <h2><a href={`/posts/${story.articles[0].slug}/`}
              onPointerEnter={event => { if (event.pointerType !== 'touch') showPreview(story.articles[0], event.currentTarget); }}
              onFocus={event => showPreview(story.articles[0], event.currentTarget)}>{story.title} <span className="read-arrow">↗</span></a></h2>
              : <><h2>{story.title} <span className="group-count">{story.articles.length} 篇</span></h2><div className="series-links">{story.articles.map((article, index) => <a key={article.slug} href={`/posts/${article.slug}/`} aria-label={article.title}
                onPointerEnter={event => { if (event.pointerType !== 'touch') showPreview(article, event.currentTarget); }}
                onFocus={event => showPreview(article, event.currentTarget)}>{String(index + 1).padStart(2, '0')} {article.title.split(' - ').at(-1)} ↗</a>)}</div></>}
            {story.level === 'large' && <p>{story.intro}</p>}
          </div>
        </div>;
      })}
      {periods.map(({ id: segmentId, entry: id, start, end: fixedEnd, row, parent, date }) => {
        const end = fixedEnd ?? 2026 + 10 / 12; // Current framework through October 2026; no invented end date is displayed.
        const left = x(start), right = x(end), fullWidth = right - left;
        const hidden = !visible(id) || right < 24 || left > width - 24;
        return <button key={segmentId} data-parent={parent} hidden={hidden} className={`period${(activeTime ?? focusTime) >= start && (activeTime ?? focusTime) <= end ? ' current' : ''}`}
          style={{ left: Math.max(24, left), width: Math.max(3, Math.min(width - 24, right) - Math.max(24, left)), top: axis + periodGap + (category === 'work' ? row - 2 : row) * periodRowHeight }}
          onClick={e => open(id, e.currentTarget)}>
          <span className="ink-clip"><svg className="branch-ink" aria-hidden="true" viewBox={`0 0 ${fullWidth} 45`} style={{ left: left - Math.max(24, left), width: fullWidth }}><path className="branch-main" d={inkPath(id, fullWidth)} /></svg></span>
          <span className="label">{entries[id].title}<span className="dates">{date ?? entries[id].date}</span></span>
        </button>;
      })}
    </div>
    <p className="timeline-hint">拖动或滚动平移 · 双指捏合或 ＋ / − 缩放 · 移入节点查看 · 点标题阅读</p>
    {preview && <ArticlePreview key={preview.article.slug} article={preview.article} anchor={preview.anchor} onDismiss={dismissPreview} />}
    <dialog ref={dialog} className="reader" aria-labelledby="reading-title" onClose={() => { setSelected(null); lastButton.current?.focus({ preventScroll: true }); }}
      onWheel={event => { const el = event.currentTarget; if (event.deltaY > 12 && performance.now() - openedAt.current > 900 && el.scrollTop + el.clientHeight >= el.scrollHeight - 3) close(); }}>
      <button className="close" onClick={close}>关闭 · Esc</button>
      {entry && <article><p className="date">{entry.date}</p><h2 id="reading-title">{entry.title}</h2><p className="kind">{entry.kind}</p><p className="bodycopy">{entry.body}</p>
        <div className="links">{entry.links.map(([label, slug]) => <a key={slug} href={`/posts/${slug}/`}>{label} ↗</a>)}</div>
        <button className="return" onClick={close}>← 回到刚才的时间</button><p className="endhint">也可以继续向下滚动，返回时间线。</p>
      </article>}
    </dialog>
  </section>;
}
