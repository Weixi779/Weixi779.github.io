// Created by weixi on 2026/10/25.
// Real-browser regression check, not a jsdom layout test.
// After fonts load, evaluate this function on the homepage at widths
// 320, 390, 520 and 1280, in both appearances. At 390 pass
// { mixedTitles: true }; at 520 pass { mixedIntros: true }.
// The caller must assert that the returned failures array is empty.
export function checkHomeRecentPostsLayout({ mixedTitles = false, mixedIntros = false } = {}) {
  const failures = [];
  const near = (a, b) => Math.abs(a - b) < 1;
  const px = value => +value.replace('px', '');
  const list = document.querySelector('.home-recent-posts__list');
  if (!list) return { failures: ['Missing homepage article list'], rows: [] };
  const rows = Array.from(list.querySelectorAll('li')).map((item, index) => {
    const style = getComputedStyle(item);
    const rect = item.getBoundingClientRect();
    const article = item.querySelector('article').getBoundingClientRect();
    const title = item.querySelector('h3');
    const intro = item.querySelector('p');
    const meta = item.querySelector('.home-recent-posts__meta').getBoundingClientRect();
    const number = item.querySelector('.home-recent-posts__number').getBoundingClientRect();
    const top = px(style.paddingTop);
    const bottom = px(style.paddingBottom);
    if (!near(top, bottom)) failures.push(`Row ${index + 1}: asymmetric padding`);
    if (!near(article.top - rect.top, top) || !near(rect.bottom - article.bottom, bottom)) failures.push(`Row ${index + 1}: extra space around content`);
    if (!near(meta.top + meta.height / 2, number.top + number.height / 2)) failures.push(`Row ${index + 1}: number not centered on metadata`);
    if (number.left < 0) failures.push(`Row ${index + 1}: number cropped`);
    for (const text of [title, intro]) {
      const css = getComputedStyle(text);
      if (text.scrollHeight > text.clientHeight + 1 || text.scrollWidth > text.clientWidth + 1) failures.push(`Row ${index + 1}: text clipped or overflowing`);
      const clamp = css.getPropertyValue('-webkit-line-clamp');
      if ((clamp && clamp !== 'none') || css.whiteSpace === 'nowrap' || css.maxHeight !== 'none') failures.push(`Row ${index + 1}: wrapping restricted`);
    }
    return {
      height: rect.height, paddingTop: top, paddingBottom: bottom,
      titleLines: Math.round(title.getBoundingClientRect().height / px(getComputedStyle(title).lineHeight)),
      introLines: Math.round(intro.getBoundingClientRect().height / px(getComputedStyle(intro).lineHeight)),
    };
  });
  if (rows.length !== 5) failures.push('Expected five recent articles');
  for (const [required, key] of [[mixedTitles, 'titleLines'], [mixedIntros, 'introLines']]) {
    if (required && (!rows.some(row => row[key] === 1) || !rows.some(row => row[key] === 2))) failures.push(`Expected mixed one/two-line ${key}`);
  }
  const listHeight = list.getBoundingClientRect().height;
  if (!near(listHeight, rows.reduce((height, row) => height + row.height, 0))) failures.push('List height does not follow its rows');
  if (document.documentElement.scrollWidth > window.innerWidth) failures.push('Horizontal page overflow');
  const content = document.querySelector('.home-sections').getBoundingClientRect();
  const posts = document.querySelector('.home-recent-posts').getBoundingClientRect();
  const rail = getComputedStyle(document.querySelector('.home-recent-posts'), '::before');
  if (!near(px(rail.height), posts.height) || !near(px(rail.top), 0)) failures.push('Blue rail must extend from the section heading through the list');
  const placeholder = document.querySelector('.home-sections__placeholder').getBoundingClientRect();
  const divider = getComputedStyle(document.querySelector('.home-sections'), '::before');
  if (window.innerWidth > 900) {
    if (!near(posts.width / 3, placeholder.width / 2) || !near(posts.top, placeholder.top) || placeholder.left <= posts.right) failures.push('Expected 6:4 columns with a gutter');
    const dividerX = content.left + px(divider.left);
    if (divider.content === 'none' || divider.display === 'none' || dividerX <= posts.right || dividerX >= placeholder.left) failures.push('Divider must sit between columns');
  } else if (placeholder.top < posts.bottom || !near(posts.width, placeholder.width)) {
    failures.push('Expected full-width stacked sections on small screens');
  }
  if (window.innerWidth <= 900 && divider.display !== 'none') failures.push('Hide the column divider in stacked layout');
  const archive = document.querySelector('.home-recent-posts__archive').getBoundingClientRect();
  if (!near(archive.right, posts.right)) failures.push('Archive link must align to the article column right edge');
  const heading = document.querySelector('.home-recent-posts__header').getBoundingClientRect();
  if (heading.bottom > list.getBoundingClientRect().top) failures.push('Section header overlaps articles');
  if (window.innerWidth >= 360) {
    for (const selector of ['.site-banner__inner', '.site-footer__inner']) {
      const reference = document.querySelector(selector).getBoundingClientRect();
      if (!near(content.left, reference.left) || !near(content.right, reference.right)) failures.push(`Container does not align with ${selector}`);
    }
  }
  return { failures, width: window.innerWidth, mode: document.documentElement.dataset.colorMode, listHeight, rows };
}
