// Created by weixi on 2026/11/25.
import { renderInlineDiagram } from './inline-diagram';

type Point = { x: number; y: number };
type Illustration = HTMLImageElement | SVGSVGElement;
const center: Point = { x: 0.5, y: 0.5 };
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function imageDescription(source: Illustration) {
  return source.getAttribute('aria-label') || source.getAttribute('alt') || source.querySelector('title')?.textContent || '';
}

function illustrations(article: HTMLElement) {
  // Leave links, controls, decorative marks and hydrated demos in the hands of their owners.
  return [...article.querySelectorAll<Illustration>('img, svg[role="img"], svg[aria-label], svg:has(> title)')].filter(source =>
    !source.closest('a, button, summary, label, svg svg, [role="link"], [role="button"], [aria-haspopup], [aria-hidden="true"], [role="presentation"], [role="none"], astro-island, footer, .article-code, .comments, [contenteditable="true"]')
    && !source.hasAttribute('tabindex')
    && !source.querySelector('a, [tabindex], foreignObject')
    && (source.getAttribute('alt') !== '' || !!imageDescription(source) || !!source.closest('figure')?.querySelector('figcaption')));
}

export function bindImageViewer(article: HTMLElement, dialog: HTMLDialogElement) {
  const lifetime = new AbortController();
  const options = { signal: lifetime.signal };
  const stage = dialog.querySelector<HTMLElement>('.viewer-stage')!;
  const plane = dialog.querySelector<HTMLElement>('.viewer-plane')!;
  let image: HTMLElement;
  const title = dialog.querySelector<HTMLElement>('header span')!;
  const scale = dialog.querySelector<HTMLElement>('.viewer-scale')!;
  const fit = dialog.querySelector<HTMLButtonElement>('.viewer-fit')!;
  const minus = dialog.querySelector<HTMLButtonElement>('.viewer-minus')!;
  const plus = dialog.querySelector<HTMLButtonElement>('.viewer-plus')!;
  let opener: Illustration | undefined;
  let origin: Point = { x: 0, y: 0 };
  let naturalWidth = 1, aspect = 1, width = 1;
  let viewport: Point = { x: 0, y: 0 }, padding: Point = { x: 0, y: 0 };
  let detail = { width: 1, point: center };
  let overview = false;

  const middle = (): Point => ({ x: viewport.x / 2, y: viewport.y / 2 });
  const fitWidth = () => Math.max(1, Math.min(stage.clientWidth - 24, (stage.clientHeight - 24) / aspect));
  const maxWidth = () => Math.max(naturalWidth * 2, stage.clientWidth * 3, detail.width);
  function imagePoint(at = middle()): Point {
    return {
      x: (stage.scrollLeft + at.x - padding.x) / width,
      y: (stage.scrollTop + at.y - padding.y) / (width * aspect),
    };
  }

  function draw(requestedWidth: number, point: Point, at?: Point) {
    viewport = { x: stage.clientWidth, y: stage.clientHeight };
    const destination = at ?? middle();
    const whole = fitWidth();
    width = clamp(requestedWidth, whole, maxWidth());
    overview = Math.abs(width - whole) < 0.5;
    const height = width * aspect;
    // When an image edge was tapped near the opposite edge of the screen, the
    // browser needs extra scrollable space to keep that point under the finger.
    function gutter(view: number, size: number, anchor: number, target: number) {
      if (overview) return (view - size) / 2;
      return clamp(Math.max(target - anchor * size, view - target - (1 - anchor) * size), view / 2, view);
    }
    padding = { x: gutter(viewport.x, width, point.x, destination.x),
      y: gutter(viewport.y, height, point.y, destination.y) };
    plane.style.width = `${width + 2 * padding.x}px`;
    plane.style.height = `${height + 2 * padding.y}px`;
    Object.assign(image.style, {
      width: `${width}px`, height: `${height}px`, left: `${padding.x}px`, top: `${padding.y}px`,
    });
    stage.scrollTo({ left: padding.x + point.x * width - destination.x,
      top: padding.y + point.y * height - destination.y, behavior: 'instant' });
    scale.textContent = `${Math.round(width / naturalWidth * 100)}%`;
    fit.toggleAttribute('data-overview', overview);
    fit.title = (overview ? fit.dataset.detailLabel : fit.dataset.fitLabel)!;
    fit.setAttribute('aria-label', fit.title);
    minus.disabled = overview;
    plus.disabled = width >= maxWidth() - 0.5;
  }

  function open(source: Illustration, description: string, click?: Point) {
    const box = source.getBoundingClientRect();
    if (!box.width || !box.height) return;
    let diagram = true;
    if (source instanceof SVGSVGElement) {
      image = renderInlineDiagram(source, description || dialog.dataset.imageLabel!);
      const view = source.viewBox.baseVal;
      naturalWidth = view.width || box.width;
      aspect = view.width && view.height ? view.height / view.width : box.height / box.width;
    } else {
      if (!source.naturalWidth) return;
      const photo = new Image();
      photo.src = source.currentSrc || source.src;
      photo.alt = description;
      photo.draggable = false;
      image = photo;
      diagram = /\.svg(?:[?#]|$)|^data:image\/svg\+xml/i.test(photo.src);
      naturalWidth = source.naturalWidth;
      aspect = source.naturalHeight / naturalWidth;
    }
    plane.replaceChildren(image);
    const point = click ? { x: clamp((click.x - box.left) / box.width, 0, 1),
      y: clamp((click.y - box.top) / box.height, 0, 1) } : center;
    opener = source;
    origin = { x: window.scrollX, y: window.scrollY };
    title.textContent = source.closest('figure')?.querySelector('figcaption')?.textContent?.trim()
      || description || dialog.dataset.imageLabel!;
    dialog.showModal();
    const bounds = stage.getBoundingClientRect();
    const destination = click ? { x: clamp(click.x - bounds.left, 0, bounds.width),
      y: clamp(click.y - bounds.top, 0, bounds.height) } : undefined;
    detail = { point, width: Math.max(box.width * 1.72, fitWidth() * 1.6, Math.min(630, naturalWidth * 1.5)) };
    if (diagram) draw(detail.width, point, destination);
    else draw(fitWidth(), center);
    stage.focus({ preventScroll: true });
  }

  const sources = illustrations(article).map(source => {
    const label = imageDescription(source) || source.closest('figure')?.querySelector('figcaption')?.textContent?.trim() || '';
    const oldRole = source.getAttribute('role'), oldLabel = source.getAttribute('aria-label');
    source.setAttribute('data-reading-zoom', '');
    source.setAttribute('role', 'button');
    source.setAttribute('tabindex', '0');
    source.setAttribute('aria-haspopup', 'dialog');
    source.setAttribute('aria-label', [dialog.dataset.openLabel, label].filter(Boolean).join(' · '));
    source.addEventListener('click', ((event: MouseEvent) => {
      open(source, label, event.detail ? { x: event.clientX, y: event.clientY } : undefined);
    }) as EventListener, options);
    source.addEventListener('keydown', ((event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(source, label); }
    }) as EventListener, options);
    return { source, oldRole, oldLabel };
  });

  fit.addEventListener('click', () => {
    if (overview) draw(detail.width, detail.point);
    else { detail = { point: imagePoint(), width }; draw(fitWidth(), center); }
  }, options);
  function zoom(nextWidth: number, at = middle()) {
    if (!overview) detail = { point: imagePoint(at), width };
    draw(nextWidth, imagePoint(at), at);
  }
  minus.addEventListener('click', () => zoom(width / 1.25), options);
  plus.addEventListener('click', () => zoom(width * 1.25), options);
  dialog.querySelector('.viewer-close')!.addEventListener('click', () => dialog.close(), options);

  const local = (event: MouseEvent): Point => {
    const box = stage.getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  };
  stage.addEventListener('wheel', event => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    zoom(width * Math.exp(-event.deltaY * 0.012), local(event));
  }, { ...options, passive: false });

  const pointers = new Map<number, Point>();
  let start: Point, scroll: Point, pinchPoint: Point, pinchWidth = 0, pinchDistance = 0;
  let dragged = false, onImage = false;
  function pinch() {
    const [a, b] = pointers.values();
    return { at: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)) };
  }
  function beginGesture() {
    if (pointers.size === 2) {
      const { at, distance } = pinch();
      pinchPoint = imagePoint(at); pinchDistance = distance; pinchWidth = width; dragged = true;
    } else if (pointers.size === 1) {
      start = [...pointers.values()][0];
      scroll = { x: stage.scrollLeft, y: stage.scrollTop };
    }
  }
  stage.addEventListener('pointerdown', event => {
    if (event.button !== 0 || pointers.size >= 2) return;
    if (!pointers.size) { dragged = false; onImage = event.target === image; }
    pointers.set(event.pointerId, local(event));
    stage.setPointerCapture(event.pointerId);
    beginGesture();
  }, options);
  stage.addEventListener('pointermove', event => {
    if (!pointers.has(event.pointerId)) return;
    const p = local(event);
    pointers.set(event.pointerId, p);
    if (pointers.size === 2) {
      const { at, distance } = pinch();
      draw(pinchWidth * distance / pinchDistance, pinchPoint, at);
    } else {
      const dx = p.x - start.x, dy = p.y - start.y;
      if (Math.hypot(dx, dy) > 3) dragged = true;
      if (dragged) {
        stage.setAttribute('data-dragging', '');
        stage.scrollTo({ left: scroll.x - dx, top: scroll.y - dy, behavior: 'instant' });
      }
    }
  }, options);
  function release(event: PointerEvent) {
    if (!pointers.delete(event.pointerId)) return;
    beginGesture();
    if (pointers.size) return;
    stage.removeAttribute('data-dragging');
    if (dragged || event.type !== 'pointerup') return;
    if (!onImage) dialog.close();
    else if (overview) {
      const at = local(event);
      draw(detail.width, imagePoint(at), at);
    }
  }
  stage.addEventListener('pointerup', release, options);
  stage.addEventListener('pointercancel', release, options);
  stage.addEventListener('lostpointercapture', release, options);

  const resize = new ResizeObserver(() => {
    if (dialog.open && (stage.clientWidth !== viewport.x || stage.clientHeight !== viewport.y)) {
      draw(overview ? fitWidth() : width, imagePoint());
    }
  });
  resize.observe(stage);

  function restore() {
    if (!opener || dialog.open) return;
    pointers.clear();
    stage.removeAttribute('data-dragging');
    plane.replaceChildren();
    opener.focus({ preventScroll: true });
    window.scrollTo({ left: origin.x, top: origin.y, behavior: 'instant' });
    opener = undefined;
  }
  dialog.addEventListener('close', restore, options);
  return () => {
    if (dialog.open) dialog.close();
    restore();
    lifetime.abort();
    resize.disconnect();
    for (const { source, oldRole, oldLabel } of sources) {
      source.removeAttribute('data-reading-zoom');
      source.removeAttribute('tabindex');
      source.removeAttribute('aria-haspopup');
      if (oldRole === null) source.removeAttribute('role'); else source.setAttribute('role', oldRole);
      if (oldLabel === null) source.removeAttribute('aria-label'); else source.setAttribute('aria-label', oldLabel);
    }
  };
}
