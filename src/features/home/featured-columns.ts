// Created by weixi on 2026/11/25.

export function bindFeaturedColumns(shelf: HTMLElement) {
  const editions = [...shelf.querySelectorAll<HTMLElement>('.edition')];
  const wide = window.matchMedia('(min-width: 761px)');
  const listeners = new AbortController();
  const options = { signal: listeners.signal };
  let active = editions.find(edition => edition.hasAttribute('data-active'))!;
  let pending: number | undefined;
  let touchPreview: HTMLAnchorElement | undefined;

  function cancelPreview() {
    window.clearTimeout(pending);
    pending = undefined;
  }

  function positionIndicator(animate: boolean) {
    if (!wide.matches) return;
    const copy = active.querySelector<HTMLElement>('.copy')!.getBoundingClientRect();
    shelf.toggleAttribute('data-animate-rail', animate);
    shelf.style.setProperty('--rail-top', `${copy.top - shelf.getBoundingClientRect().top}px`);
    shelf.style.setProperty('--rail-height', `${copy.height}px`);
  }

  function select(edition: HTMLElement) {
    cancelPreview();
    if (active === edition) return;
    active.removeAttribute('data-active');
    active = edition;
    active.setAttribute('data-active', '');
    positionIndicator(true);
  }

  const sizes = new ResizeObserver(() => positionIndicator(false));
  for (const edition of editions) {
    const row = edition.querySelector<HTMLAnchorElement>('.row')!;
    sizes.observe(row);
    let lastX = 0;

    row.addEventListener('pointerenter', event => {
      cancelPreview();
      if (event.pointerType === 'touch' || !wide.matches || edition === active) return;
      lastX = event.clientX;
      pending = window.setTimeout(() => select(edition), 140);
    }, options);
    row.addEventListener('pointermove', event => {
      if (pending === undefined || event.pointerType === 'touch') return;
      // Keep the current articles in place while the pointer crosses other rows on its way right.
      if (event.clientX > lastX) {
        cancelPreview();
        pending = window.setTimeout(() => select(edition), 200);
      }
      lastX = event.clientX;
    }, options);
    row.addEventListener('pointerleave', cancelPreview, options);

    // Capture touch intent before the browser focuses the link on pointer-up.
    row.addEventListener('pointerdown', event => {
      touchPreview = event.pointerType === 'touch' && wide.matches && edition !== active ? row : undefined;
    }, options);
    row.addEventListener('pointercancel', () => { touchPreview = undefined; }, options);
    row.addEventListener('click', event => {
      if (touchPreview === row && event.detail > 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
        event.preventDefault();
        select(edition);
      }
      touchPreview = undefined;
    }, options);

    // Each article follows its column in tab order, including when moving backwards.
    edition.addEventListener('focusin', () => {
      if (wide.matches) select(edition);
    }, options);
  }

  shelf.setAttribute('data-interactive', '');
  positionIndicator(false);
  return () => {
    cancelPreview();
    sizes.disconnect();
    listeners.abort();
    shelf.removeAttribute('data-interactive');
    shelf.removeAttribute('data-animate-rail');
  };
}
