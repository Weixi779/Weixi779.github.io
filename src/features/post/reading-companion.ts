// Created by weixi on 2026/11/24.
export function bindReadingCompanion(corner: HTMLElement, link: HTMLAnchorElement): () => void {
  const lifetime = new AbortController();
  const { signal } = lifetime;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const eyeGroups = [...corner.querySelectorAll<SVGGElement>('.companion__blinking-eyes')];
  let currentBlink: Animation | undefined;
  let arrivalTimer: number | undefined;
  let giftTimer: number | undefined;

  function clearArrival() {
    window.clearTimeout(arrivalTimer);
    arrivalTimer = undefined;
    corner.removeAttribute('data-returning');
  }

  function clearGift() {
    window.clearTimeout(giftTimer);
    corner.removeAttribute('data-gift');
  }

  function updatePosition() {
    link.hidden = window.scrollY < 360;
    if (corner.hasAttribute('data-returning') && window.scrollY <= 16 && arrivalTimer === undefined) {
      arrivalTimer = window.setTimeout(clearArrival, 240);
    }
  }

  function interrupt() {
    if (!corner.hasAttribute('data-returning')) return;
    clearArrival();
    clearGift();
    corner.toggleAttribute('data-interrupted', link.matches(':hover'));
    window.scrollTo({ top: window.scrollY, behavior: 'instant' });
  }

  function blink() {
    if (link.hidden || reducedMotion.matches || !link.matches(':hover, :focus-visible')) return;
    const eyes = eyeGroups.find(group => group.getClientRects().length > 0);
    if (!eyes || currentBlink?.playState === 'running') return;
    // Let one blink finish even if the pointer leaves midway.
    currentBlink = eyes.animate([
      { '--companion-blink': '0', easing: 'ease-in' },
      { '--companion-blink': '1', offset: .40, easing: 'ease-out' },
      { '--companion-blink': '0' },
    ], 190);
  }

  link.addEventListener('pointerenter', blink, { signal });
  link.addEventListener('focus', blink, { signal });
  link.addEventListener('click', event => {
    if (event.button || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    if (corner.hasAttribute('data-returning')) {
      event.preventDefault();
      return;
    }
    corner.removeAttribute('data-interrupted');
    if (reducedMotion.matches) return;
    corner.setAttribute('data-returning', '');
    corner.setAttribute('data-gift', '');
    window.clearTimeout(giftTimer);
    giftTimer = window.setTimeout(clearGift, 700);
    // The native fragment link owns scrolling, focus and browser history.
  }, { signal });
  link.addEventListener('pointerleave', () => corner.removeAttribute('data-interrupted'), { signal });
  window.addEventListener('wheel', event => { if (event.deltaY) interrupt(); }, { passive: true, signal });
  window.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch' || event.target !== link) interrupt();
  }, { passive: true, signal });
  window.addEventListener('keydown', event => {
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) interrupt();
  }, { signal });
  window.addEventListener('scroll', updatePosition, { passive: true, signal });
  updatePosition();
  return () => {
    lifetime.abort();
    clearArrival();
    clearGift();
    currentBlink?.cancel();
    corner.removeAttribute('data-interrupted');
  };
}
