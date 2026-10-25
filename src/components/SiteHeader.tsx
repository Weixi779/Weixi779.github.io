// Created by weixi on 2026/10/25.

import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import ThemePicker from './ThemePicker';
import '../styles/header.css';

const navigation = [
  { href: '/', label: '首页' },
  { href: '/archive/', label: '归档' },
  { href: '/about/', label: '关于' },
];

export default function SiteHeader({ pathname }: { pathname: string }) {
  const headerRef = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState<number | null>(null);

  useLayoutEffect(() => {
    const header = headerRef.current;
    const title = document.querySelector<HTMLElement>('main .home-hero h1, main .page-hero h1');
    if (!header || !title) {
      setProgress(1);
      return;
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const originalOpacity = title.style.opacity;
    let frame: number | undefined;
    let disposed = false;

    function update() {
      frame = undefined;
      if (disposed || !header || !title) return;
      const bounds = title.getBoundingClientRect();
      const edge = header.getBoundingClientRect().bottom;
      const next = reducedMotion.matches
        ? (bounds.bottom <= edge ? 1 : 0)
        : Math.max(0, Math.min(1, (edge - bounds.top) / Math.max(1, bounds.height)));
      title.style.opacity = String(1 - next);
      setProgress(next);
    }

    function scheduleUpdate() {
      if (!disposed && frame === undefined) frame = window.requestAnimationFrame(update);
    }

    update();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    window.addEventListener('pageshow', scheduleUpdate);
    reducedMotion.addEventListener('change', scheduleUpdate);
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(scheduleUpdate);
    observer?.observe(header);
    observer?.observe(title);
    document.fonts?.ready.then(scheduleUpdate);

    return () => {
      disposed = true;
      if (frame !== undefined) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      window.removeEventListener('pageshow', scheduleUpdate);
      reducedMotion.removeEventListener('change', scheduleUpdate);
      observer?.disconnect();
      title.style.opacity = originalOpacity;
    };
  }, []);

  const hidden = progress === 0;
  const isCurrentPage = (href: string) => href === '/'
    ? pathname === '/' || pathname.startsWith('/page/')
    : pathname === href.slice(0, -1) || pathname.startsWith(href);

  return (
    <header ref={headerRef} className="site-header" data-ready={progress !== null ? '' : undefined}
      inert={hidden} aria-hidden={hidden || undefined}
      style={{ '--header-progress': progress ?? 1 } as CSSProperties}>
      <div className="site-header__inner">
        <a className="site-brand" href="/">伟兮の小屋</a>
        <nav aria-label="主导航">
          {navigation.map(({ href, label }) => (
            <a key={href} href={href} aria-current={isCurrentPage(href) ? 'page' : undefined}>
              {label}
              {isCurrentPage(href) && <svg className="site-header__indicator" aria-hidden="true" viewBox="0 0 38 8" preserveAspectRatio="none">
                <path d="M2.2 4.7C7.4 5.1 10.1 5.9 15.4 5.2C22.2 4.3 27.6 2.2 35.8 2.8C36.5 2.9 36.4 3.4 35.7 3.5C28.1 3.5 23.4 6.1 15.6 6.8C9.8 7.3 5.6 6.2 2.2 5.7C1.3 5.5 1.3 4.6 2.2 4.7Z" fill="currentColor" />
              </svg>}
            </a>
          ))}
        </nav>
        <span className="site-header__divider" aria-hidden="true" />
        <ThemePicker hidden={hidden} />
      </div>
    </header>
  );
}
