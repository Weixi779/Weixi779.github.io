// Created by weixi on 2026/10/26.
export function bindTableOfContents(toc: HTMLElement, { restored = false } = {}): () => void {
  const lifetime = new AbortController();
  const chapters = Array.from(toc.querySelectorAll<HTMLElement>('[data-toc-chapter]'));
  const links = Array.from(toc.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'));
  const entries = links.flatMap(link => {
    const heading = document.getElementById(decodeURIComponent(link.hash.slice(1)));
    const chapter = link.closest<HTMLElement>('[data-toc-chapter]');
    return heading && chapter ? [{ link, heading, chapter }] : [];
  });
  let current: typeof entries[number] | undefined;
  let queued = false;
  let frame = 0;

  function select(entry: typeof current) {
    current = entry;
    for (const chapter of chapters) {
      const active = chapter === entry?.chapter;
      chapter.toggleAttribute('data-active', active);
      chapter.querySelector('[data-toc-children]')?.toggleAttribute('inert', !active);
    }
    for (const link of links) {
      if (link === entry?.link) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  }

  function updatePosition() {
    // Just below the article's 88px anchor offset; retain the previous
    // heading through long sections, including when scrolling backwards.
    const entry = entries.findLast(({ heading }) => heading.getBoundingClientRect().top <= 100);
    if (entry !== current) select(entry);
    queued = false;
  }

  function scheduleUpdate() {
    if (queued) return;
    queued = true;
    frame = window.requestAnimationFrame(updatePosition);
  }

  function selectHash() {
    const entry = entries.find(({ link }) => link.hash === window.location.hash);
    if (entry) select(entry);
    else updatePosition();
  }

  select(undefined);
  if (restored) updatePosition();
  else selectHash();
  window.addEventListener('scroll', scheduleUpdate, { passive: true, signal: lifetime.signal });
  window.addEventListener('resize', scheduleUpdate, { signal: lifetime.signal });
  window.addEventListener('hashchange', selectHash, { signal: lifetime.signal });
  return () => {
    lifetime.abort();
    window.cancelAnimationFrame(frame);
  };
}
