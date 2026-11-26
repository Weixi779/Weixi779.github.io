// Created by weixi on 2026/11/26.

// An inline figure can get its paint and typography from selectors scoped to the article.
const presentation = [
  'color', 'fill', 'fill-opacity', 'fill-rule', 'stroke', 'stroke-width', 'stroke-opacity',
  'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'stroke-dashoffset', 'stroke-miterlimit',
  'font-family', 'font-size', 'font-weight', 'font-style', 'letter-spacing', 'text-anchor',
  'dominant-baseline', 'paint-order', 'vector-effect', 'stop-color', 'stop-opacity',
  'opacity', 'visibility', 'display', 'clip-path', 'clip-rule', 'mask', 'filter', 'marker-start', 'marker-mid', 'marker-end',
  'transform', 'transform-origin', 'transform-box', 'x', 'y', 'cx', 'cy', 'r', 'rx', 'ry', 'd', 'width', 'height',
];

export function renderInlineDiagram(source: SVGSVGElement, description: string) {
  const host = document.createElement('div');
  host.setAttribute('role', 'img');
  host.setAttribute('aria-label', description);
  // A separate tree keeps gradient, marker and clip-path IDs local to this copy.
  const shadow = host.attachShadow({ mode: 'open' });
  const copy = source.cloneNode(true) as SVGSVGElement;
  const originals = [source, ...source.querySelectorAll('*')];
  const copies = [copy, ...copy.querySelectorAll('*')];
  originals.forEach((original, index) => {
    const target = copies[index];
    if (!(target instanceof SVGElement)) return;
    const style = getComputedStyle(original);
    for (const property of presentation) target.style.setProperty(property, style.getPropertyValue(property));
  });
  copy.removeAttribute('tabindex');
  copy.removeAttribute('aria-haspopup');
  copy.setAttribute('aria-hidden', 'true');
  if (!copy.hasAttribute('viewBox')) {
    const { width, height } = source.getBoundingClientRect();
    copy.setAttribute('viewBox', `0 0 ${width} ${height}`);
  }
  Object.assign(copy.style, { display: 'block', width: '100%', height: '100%', maxWidth: 'none', maxHeight: 'none' });
  shadow.append(copy);
  return host;
}
