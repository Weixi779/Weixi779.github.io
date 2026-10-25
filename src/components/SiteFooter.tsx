// Created by weixi on 2026/10/25.

import { useEffect, useState, type ReactNode } from 'react';
import '../styles/footer.css';

const destinations = [
  {
    name: 'GitHub', href: 'https://github.com/Weixi779',
    icon: <path d="M9 21v-3.3c-3.8 1.1-4-1.8-5.7-2.5M15 21v-3.6c0-1-.3-1.7-.8-2.2 2.7-.3 5.5-1.3 5.5-6a4.7 4.7 0 0 0-1.3-3.3c.1-.4.5-1.6-.2-3.2 0 0-1-.3-3.3 1.3a12 12 0 0 0-5.8 0C6.8 2.4 5.8 2.7 5.8 2.7c-.7 1.6-.3 2.8-.2 3.2a4.7 4.7 0 0 0-1.3 3.3c0 4.7 2.8 5.7 5.5 6-.5.5-.8 1.2-.8 2.2" />,
  },
  {
    name: 'LeetCode', href: 'https://leetcode.cn/u/wei-xi-d/',
    icon: <path d="m14.6 3.7-8.8 8.8a3.7 3.7 0 0 0 0 5.2l2.5 2.5a3.7 3.7 0 0 0 5.2 0l2.6-2.6M8.4 9.9l1.1-1.1a3.7 3.7 0 0 1 5.2 0l2.5 2.5M10.2 14.7h10" />,
  },
  {
    name: '哔哩哔哩', href: 'https://space.bilibili.com/6450245',
    icon: <><rect x="3.5" y="7.2" width="17" height="13" rx="3.8" /><path d="m7.3 3.8 3 3.4m6.4-3.4-3 3.4M8 12v2.3m8-2.3v2.3m-5.6 2.4q1.6 1.2 3.2 0" /></>,
  },
  {
    name: 'Email', href: 'mailto:sunshiwei418@126.com',
    icon: <><rect x="3.3" y="5.5" width="17.4" height="13" rx="3.3" /><path d="m4.3 7 6.1 5a2.5 2.5 0 0 0 3.2 0l6.1-5" /></>,
  },
  {
    name: 'RSS', href: '/rss.xml',
    icon: <><path d="M5.2 4.6a14.2 14.2 0 0 1 14.2 14.2M5.2 10.7a8.1 8.1 0 0 1 8.1 8.1" /><circle cx="5.8" cy="18.2" r="1.4" /></>,
  },
];

function FooterLink({ name, href, icon }: { name: string; href: string; icon: ReactNode }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const showName = (hovered || focused) && !dismissed;
  const external = href.startsWith('https:');

  useEffect(() => {
    if (!showName) return;
    function dismiss(event: KeyboardEvent) {
      if (event.key === 'Escape') setDismissed(true);
    }
    document.addEventListener('keydown', dismiss);
    return () => document.removeEventListener('keydown', dismiss);
  }, [showName]);

  return (
    <a className="site-footer__link" href={href} aria-label={name}
      target={external ? '_blank' : undefined}
      rel={external ? (name === 'GitHub' ? 'me noopener noreferrer' : 'noopener noreferrer') : undefined}
      onMouseEnter={() => { setHovered(true); setDismissed(false); }}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => { setFocused(true); setDismissed(false); }}
      onBlur={() => setFocused(false)}>
      <svg className="site-footer__icon" aria-hidden="true" viewBox="0 0 24 24">{icon}</svg>
      <span className="site-footer__touch-label" aria-hidden="true">{name}</span>
      {showName && <span className="site-footer__tooltip" role="tooltip">{name}</span>}
    </a>
  );
}

// TODO: Consider live reader presence via Socket in a later iteration.
export default function SiteFooter({ year }: { year: number }) {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <p className="site-footer__signature" lang="en">Stay hungry. Stay foolish.</p>
        <div className="site-footer__legal" lang="en">
          <p>© 2021–{year} Weixi <span className="site-footer__rights">All Rights Reserved</span></p>
          <a className="site-footer__license" href="/fonts/" aria-label="Font Licenses">Font Licenses</a>
        </div>
        <nav className="site-footer__links" aria-label="在别处找到我">
          {destinations.map(destination => <FooterLink key={destination.name} {...destination} />)}
        </nav>
      </div>
    </footer>
  );
}
