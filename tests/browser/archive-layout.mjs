// Created by weixi on 2026/10/25.
// Evaluate on the real archive at desktop and phone widths after fonts load.
// A caller must assert failures is empty; jsdom cannot verify wrapping or alignment.
export function checkArchiveLayout({ mixedTitles = false } = {}) {
  const failures = [];
  const px = value => +value.replace('px', '');
  const region = document.querySelector('.archive-page');
  if (!region) return { failures: ['Missing archive'], rows: [] };
  const rows = Array.from(region.querySelectorAll('.archive-item')).map(item => {
    const title = item.querySelector('.archive-item__link');
    const style = getComputedStyle(item);
    const rect = item.getBoundingClientRect();
    if (style.paddingTop !== style.paddingBottom) failures.push('Asymmetric row padding');
    if (item.scrollWidth > item.clientWidth + 1) failures.push('Overflowing article');
    const titleStyle = getComputedStyle(title);
    if (titleStyle.whiteSpace === 'nowrap' || !['none', ''].includes(titleStyle.getPropertyValue('-webkit-line-clamp'))) failures.push('Restricted title wrapping');
    for (const tag of item.querySelectorAll('.archive-item__tag')) {
      const box = tag.getBoundingClientRect();
      if (box.right > rect.right + 1 || box.bottom > rect.bottom + 1) failures.push('Tag outside its article');
    }
    return { height: rect.height, titleHeight: title.getBoundingClientRect().height, lineHeight: px(style.lineHeight) };
  });
  if (mixedTitles && (!rows.some(row => row.titleHeight < row.lineHeight) || !rows.some(row => row.titleHeight > row.lineHeight))) failures.push('Expected both one-line and wrapped titles');
  const timeline = region.querySelector('.archive-timeline');
  const pseudoCenter = element => {
    const style = getComputedStyle(element, '::before');
    const width = px(style.width) + (style.boxSizing === 'border-box' ? 0 : px(style.borderLeftWidth) + px(style.borderRightWidth));
    const translation = style.transform === 'none' ? 0 : +style.transform.split(',')[4];
    return element.getBoundingClientRect().left + px(style.left) + width / 2 + translation;
  };
  if (timeline) {
    const railCenter = pseudoCenter(timeline);
    for (const heading of timeline.querySelectorAll('.archive-year h2')) {
      if (Math.abs(pseudoCenter(heading) - railCenter) > .1) failures.push('Year dot is not centered on the timeline');
    }
  }
  for (const group of region.querySelectorAll('.archive-year')) {
    const count = +group.querySelector('.archive-year__count').textContent.replace(/\D/g, '');
    if (count !== group.querySelectorAll('.archive-item').length) failures.push('Incorrect year count');
  }
  const bounds = region.getBoundingClientRect();
  for (const selector of ['.site-banner__inner', '.site-footer__inner']) {
    const other = document.querySelector(selector).getBoundingClientRect();
    if (Math.abs(bounds.left - other.left) > 1 || Math.abs(bounds.right - other.right) > 1) failures.push(`Misaligned with ${selector}`);
  }
  if (document.documentElement.scrollWidth > window.innerWidth) failures.push('Horizontal overflow');
  return { failures, width: window.innerWidth, mode: document.documentElement.dataset.colorMode, rows };
}
