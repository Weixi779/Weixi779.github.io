// Created by weixi on 2026/11/18.

export function bindColumnBrowsing(catalog: HTMLElement) {
  const lifetime = new AbortController();
  const options = { passive: true, signal: lifetime.signal };
  let pressed: HTMLElement | null = null;

  function release() {
    pressed?.removeAttribute('data-pressed');
    pressed = null;
  }

  catalog.addEventListener('touchstart', event => {
    release();
    if (event.touches.length === 1 && event.target instanceof Element) {
      pressed = event.target.closest<HTMLElement>('.column-card');
      pressed?.setAttribute('data-pressed', '');
    }
  }, options);
  for (const name of ['touchmove', 'touchend', 'touchcancel']) {
    catalog.addEventListener(name, release, options);
  }
  catalog.addEventListener('change', event => {
    if (event.target instanceof HTMLInputElement && event.target.name === 'column-view') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, options);

  return () => {
    release();
    lifetime.abort();
  };
}
