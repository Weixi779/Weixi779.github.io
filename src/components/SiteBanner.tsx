// Created by weixi on 2026/10/25.

import { useLayoutEffect, useState, type CSSProperties } from 'react';
import '../styles/banner.css';

interface BannerTranslation {
  href: string;
  language: 'zh-CN' | 'en';
  label: string;
  current: boolean;
}

interface Props {
  variant?: 'home' | 'page';
  title: string;
  summary?: string;
  eyebrow?: string;
  category?: string;
  publishedAt?: string;
  image?: string;
  nightImage?: string;
  translations?: BannerTranslation[];
  language?: 'zh-CN' | 'en';
}

function TypedQuote({ text }: { text: string }) {
  const [state, setState] = useState<{ visible: number | null; typing: boolean }>({ visible: null, typing: false });
  useLayoutEffect(() => {
    const letters = [...text];
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let timer: number | undefined;
    let index = 0;
    function finish() {
      window.clearTimeout(timer);
      setState({ visible: letters.length, typing: false });
    }
    function next() {
      if (index === letters.length || reduced.matches) { finish(); return; }
      const character = letters[index++];
      setState({ visible: index, typing: true });
      timer = window.setTimeout(next, index === letters.length ? 350 : character === ',' ? 210 : /\s/u.test(character) ? 28 : 42);
    }
    function motionChanged() { if (reduced.matches) finish(); }
    function visibilityChanged() { if (document.visibilityState === 'hidden') finish(); }
    if (reduced.matches) finish();
    else {
      setState({ visible: 0, typing: true });
      timer = window.setTimeout(next, 450);
    }
    reduced.addEventListener('change', motionChanged);
    window.addEventListener('pagehide', finish);
    document.addEventListener('visibilitychange', visibilityChanged);
    return () => {
      window.clearTimeout(timer);
      reduced.removeEventListener('change', motionChanged);
      window.removeEventListener('pagehide', finish);
      document.removeEventListener('visibilitychange', visibilityChanged);
    };
  }, [text]);

  let index = 0;
  const tokens = text.match(/\S+|\s+/gu) ?? [];
  return <>
    <span className="site-banner__quote-text">{text}</span>
    <span className="site-banner__typing" aria-hidden="true" data-pending={state.visible === null ? '' : undefined}>
      {tokens.map((token, wordIndex) => (
        <span className={/^\s+$/u.test(token) ? undefined : 'site-banner__word'} key={wordIndex}>
          {[...token].map((character, characterIndex) => {
            const characterPosition = index++;
            return <span className="site-banner__letter" key={characterIndex}
              style={{ visibility: state.visible === null ? undefined : characterPosition < state.visible ? 'visible' : 'hidden' }}
              data-cursor={state.typing && characterPosition === (state.visible ?? 0) - 1 ? '' : undefined}>{character}</span>;
          })}
        </span>
      ))}
    </span>
  </>;
}

export default function SiteBanner({
  variant = 'page', title, summary, eyebrow, category, publishedAt,
  image, nightImage, translations = [], language = 'zh-CN',
}: Props) {
  const prefix = category ? `「${category}」` : '';
  const withoutPrefix = prefix && title.startsWith(prefix) ? title.slice(prefix.length).trimStart() : title;
  const displayTitle = withoutPrefix || title;
  // CSS follows the existing root color mode; the banner owns no theme state.
  const sceneStyle = image ? {
    '--banner-image-light': `url(${JSON.stringify(image)})`,
    '--banner-image-dark': `url(${JSON.stringify(nightImage || image)})`,
  } as CSSProperties : undefined;

  return (
    <section className={`site-banner ${variant === 'home' ? 'home-hero' : 'page-hero'}`}>
      {image && <div className="site-banner__scene" style={sceneStyle} aria-hidden="true" />}
      <div className="site-banner__inner">
        {eyebrow && <p className="site-banner__eyebrow">{eyebrow}</p>}
        {(category || publishedAt) && <div className="site-banner__chapter">
          {category && <span className="site-banner__category">{category}</span>}
          {publishedAt && <time dateTime={publishedAt}>{publishedAt}</time>}
        </div>}
        <h1>{displayTitle}</h1>
        {summary && <p className={variant === 'home' ? 'site-banner__quote' : 'page-hero__summary'}>
          {variant === 'home' ? <TypedQuote text={summary} /> : summary}
        </p>}
        {translations.length > 1 && <nav className="post-language-switch" aria-label={language === 'en' ? 'Article language' : '文章语言'}>
          {translations.map(({ href, language: lang, label, current }) => (
            <a key={lang} href={href} lang={lang} aria-current={current ? 'page' : undefined}>{label}</a>
          ))}
        </nav>}
      </div>
    </section>
  );
}
