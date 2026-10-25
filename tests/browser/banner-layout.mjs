// Created by weixi on 2026/10/25.
// Evaluate against a built article in a real browser, after its fonts load.
export function checkArticleBannerLayout() {
  const failures = [];
  const banner = document.querySelector('.page-hero');
  const inner = banner?.querySelector('.site-banner__inner');
  if (!banner || !inner) return { failures: ['Missing article banner'] };
  const bounds = banner.getBoundingClientRect();
  const scene = banner.querySelector('.site-banner__scene');
  const children = [...inner.children].map(child => child.getBoundingClientRect());
  const last = children.at(-1);
  const bottomSpace = bounds.bottom - last.bottom;
  if (children.some(rect => rect.top < bounds.top || rect.bottom > bounds.bottom)) failures.push('Banner clips text');
  if (document.documentElement.scrollWidth > window.innerWidth) failures.push('Page overflows horizontally');
  if (!scene && bottomSpace > 64) failures.push('Text-only banner retains artwork-sized whitespace');
  if (!scene && bottomSpace < 32) failures.push('Text-only banner has no breathing room before the article');
  if (scene && window.innerWidth <= 700) {
    const image = scene.getBoundingClientRect();
    if (banner.dataset.imageLayout === 'illustration' && image.top < last.bottom) failures.push('Illustration overlaps text on mobile');
    if (['illustration', 'wide'].includes(banner.dataset.imageLayout)
      && (Math.abs(image.left) > 1 || Math.abs(image.width - window.innerWidth) > 1)) failures.push('Mobile artwork no longer fits viewport');
  }
  return { failures, height: bounds.height, bottomSpace, titleHeight: banner.querySelector('h1').getBoundingClientRect().height };
}
