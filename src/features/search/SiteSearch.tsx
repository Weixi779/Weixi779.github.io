// Created by weixi on 2026/11/26.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { findResults, prepareSearch, type Scope, type SearchEntry } from './search';
import { recentSearchLinks, searchArrival, visitResult, type SearchSnapshot } from './search-history';
import { matchRanges } from './matching';
import SearchIcon from './SearchIcon';
import './site-search.css';

const label = '搜索文章和专栏';
const scopes = { all: '全部', article: '文章', column: '专栏' } as const;

function Match({ text, query }: { text: string; query: string }) {
  const ranges = matchRanges(text, query);
  if (!ranges.length) return text;
  const parts = [];
  let start = 0;
  for (const [from, to] of ranges) {
    parts.push(text.slice(start, from), <mark key={from}>{text.slice(from, to)}</mark>);
    start = to;
  }
  return <>{parts}{text.slice(start)}</>;
}

export default function SiteSearch() {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const restoreList = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<Scope>('all');
  const [selected, setSelected] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const [arrived, setArrived] = useState(false);
  const [index, setIndex] = useState<ReturnType<typeof prepareSearch> | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const hits = useMemo(() => index ? findResults(index, query, scope, recent) : [], [index, query, scope, recent]);
  const active = Math.min(selected, hits.length - 1);

  const show = useCallback((snapshot?: SearchSnapshot) => {
    const el = dialog.current;
    if (!el || el.open || document.querySelector('dialog[open]')) return;
    opener.current = document.activeElement instanceof HTMLElement && document.activeElement !== document.body
      ? document.activeElement : trigger.current;
    if (snapshot) {
      setQuery(snapshot.query);
      setScope(snapshot.scope);
      setSelected(snapshot.selected);
      restoreList.current = snapshot.listScroll;
      window.scrollTo({ top: snapshot.scrollY, behavior: 'instant' });
    }
    setRecent(recentSearchLinks());
    el.showModal();
    setOpen(true);
    input.current?.focus({ preventScroll: true });
  }, []);

  function dismiss() {
    if (history.state?.siteSearch) history.replaceState({ ...history.state, siteSearch: null }, '');
    dialog.current?.close();
    opener.current?.focus({ preventScroll: true });
    if (document.activeElement !== opener.current) trigger.current?.focus({ preventScroll: true });
  }

  useEffect(() => {
    if (!open || index) return;
    const controller = new AbortController();
    setFailed(false);
    async function load() {
      try {
        const response = await fetch('/search-index.json', { signal: controller.signal });
        if (!response.ok) throw new Error('Search index unavailable');
        const entries: SearchEntry[] = await response.json();
        if (!controller.signal.aborted) setIndex(prepareSearch(entries));
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      }
    }
    void load();
    return () => controller.abort();
  }, [open, index, attempt]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.isComposing || event.repeat || event.altKey || event.shiftKey || !(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k') return;
      if (document.querySelector('dialog[open]') && !dialog.current?.open) return;
      event.preventDefault();
      if (dialog.current?.open) {
        input.current?.focus();
        input.current?.select();
      } else show();
    }
    function resume() {
      const arrival = searchArrival();
      setArrived(Boolean(arrival && !arrival.dismissed));
      const snapshot = history.state?.siteSearch;
      if (snapshot) show(snapshot);
      else if (dialog.current?.open) dialog.current.close();
    }
    resume();
    window.addEventListener('keydown', onKey);
    window.addEventListener('pageshow', resume);
    window.addEventListener('popstate', resume);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pageshow', resume);
      window.removeEventListener('popstate', resume);
    };
  }, [show]);

  useEffect(() => {
    if (!open || !index || !list.current) return;
    list.current.scrollTop = restoreList.current ?? 0;
    restoreList.current = null;
  }, [open, index, query, scope]);

  useEffect(() => {
    const viewport = window.visualViewport;
    const el = dialog.current;
    if (!open || !viewport || !el) return;
    const update = () => {
      el.style.setProperty('--keyboard-height', viewport.height + 'px');
      el.style.setProperty('--keyboard-top', viewport.offsetTop + 'px');
    };
    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
    };
  }, [open]);

  function choose(at: number) {
    const hit = hits[at];
    if (!hit) return;
    const snapshot = { query, scope, selected: at, scrollY: window.scrollY, listScroll: list.current?.scrollTop ?? 0 };
    dialog.current?.close();
    visitResult(hit.href, hit.entry.href, snapshot);
  }

  function filter(value: Scope) {
    setScope(value);
    setSelected(0);
    input.current?.focus();
  }

  const count = query.trim() ? hits.length + ' 项结果' : hits.some(hit => recent.includes(hit.entry.href))
    ? '最近打开' : scope === 'column' ? '专栏选读' : '最近写下';
  return <>
    <button ref={trigger} type="button" className="site-search-trigger" aria-label={label} title={label}
      aria-haspopup="dialog" aria-expanded={open} onClick={() => show()}><SearchIcon name="search" /></button>
    {arrived && <div className="site-search-return">
      <button type="button" className="site-search-back" onClick={() => history.back()}><SearchIcon name="back" />返回搜索结果</button>
      <button type="button" className="site-search-return__dismiss" aria-label="收起返回入口" title="收起返回入口" onClick={() => {
        history.replaceState({ ...history.state, searchArrival: { ...history.state.searchArrival, dismissed: true } }, '');
        setArrived(false);
        trigger.current?.focus({ preventScroll: true });
      }}><SearchIcon name="close" /></button>
    </div>}
    <dialog ref={dialog} className="site-search" aria-label={label} onClose={() => setOpen(Boolean(dialog.current?.open))}
      onCancel={e => { e.preventDefault(); dismiss(); }}
      onClick={e => { if (e.target === e.currentTarget) dismiss(); }}>
      <div className="site-search__sheet">
        <div className="site-search__input">
          <SearchIcon name="search" />
          <input ref={input} type="text" role="combobox" aria-autocomplete="list" aria-controls="site-search-results"
            aria-expanded={open} aria-activedescendant={active >= 0 ? 'site-hit-' + active : undefined}
            aria-label={label} placeholder={label} autoComplete="off" spellCheck={false} enterKeyHint="go"
            value={query} onChange={e => { setQuery(e.target.value); setSelected(0); }}
            onKeyDown={e => {
              // WebKit can end composition before delivering the confirming Enter (229).
              if (e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229 || !hits.length) return;
              if (e.key === 'Enter') { e.preventDefault(); choose(active); return; }
              if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
              e.preventDefault();
              const at = Math.min(hits.length - 1, Math.max(0, active + (e.key === 'ArrowDown' ? 1 : -1)));
              setSelected(at);
              list.current?.children[at]?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
            }} />
          <button type="button" className="site-search__dismiss" aria-label="关闭搜索" onClick={dismiss}><SearchIcon name="close" /></button>
        </div>
        <div className="site-search__filters">
          <div role="group" aria-label="结果类型">{(Object.keys(scopes) as Scope[]).map(value =>
            <button type="button" key={value} aria-label={scopes[value]} title={scopes[value]} aria-pressed={scope === value}
              onClick={() => filter(value)}>{value === 'all' ? scopes.all : <SearchIcon name={value} />}</button>)}</div>
          <span role="status">{index ? count : failed ? '' : '正在加载…'}</span>
        </div>
        <div ref={list} id="site-search-results" role="listbox" aria-label="搜索结果">
          {hits.map(({ entry, href, snippet, section }, at) =>
            <a key={entry.href} id={'site-hit-' + at} className="site-search__result" href={href} role="option" tabIndex={-1}
              aria-selected={at === active} onPointerMove={e => { if (e.pointerType === 'mouse') setSelected(at); }}
              onClick={e => {
                if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || e.button !== 0) return;
                e.preventDefault();
                choose(at);
              }}>
              <span className="site-search__symbol" role="img" aria-label={scopes[entry.kind]}><SearchIcon name={entry.kind} /></span>
              <span><strong><Match text={entry.title} query={query} /></strong>
                <span className="site-search__snippet"><Match text={snippet} query={query} /></span>
                <small>{section ? entry.detail.split(' · ')[0] + ' · ' + section : entry.detail}</small></span>
              <span className="site-search__enter"><SearchIcon name="enter" /></span>
            </a>)}
        </div>
        {(failed || (index && !hits.length)) && <div className="site-search__empty">
          <p>{failed ? '搜索索引暂时无法加载' : '没有找到「' + query.trim() + '」'}</p>
          <button type="button" onClick={() => {
            if (failed) setAttempt(n => n + 1);
            else { setQuery(''); setSelected(0); }
            input.current?.focus();
          }}>{failed ? '重试' : '清空搜索'}</button>
        </div>}
      </div>
    </dialog>
  </>;
}
