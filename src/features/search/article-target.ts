// Created by weixi on 2026/11/26.

import { articlePassages, passageFragment } from './passages';
import { passageRanges } from './passage-ranges';
import { searchArrival } from './search-history';

function showTarget() {
  const article = document.querySelector('article.prose--article');
  if (!article) return;
  article.querySelector('.search-passage')?.classList.remove('search-passage');
  window.CSS?.highlights?.delete('search-match');
  if (!location.hash.startsWith('#search-p-') || history.state?.siteSearch) return;
  const match = articlePassages(article).find(({ text, kind }) => passageFragment(text, kind) === location.hash);
  if (!match) return;
  match.element.classList.add('search-passage');
  const query = searchArrival()?.query;
  if (query && window.CSS?.highlights) {
    const highlight = new Highlight();
    for (const range of passageRanges(match.element, query)) highlight.add(range);
    CSS.highlights.set('search-match', highlight);
  }
  match.element.scrollIntoView({ block: 'start', behavior: 'instant' });
}

const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
if (location.hash.startsWith('#search-p-') && navigation?.type !== 'back_forward') document.fonts.ready.then(showTarget);
window.addEventListener('popstate', () => requestAnimationFrame(showTarget));
