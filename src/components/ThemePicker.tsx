// Created by weixi on 2026/10/25.

import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import type { ThemeState } from '../theme/types';

const serverState: Readonly<ThemeState> = { modePreference: 'system', colorMode: 'light' };
const getServerSnapshot = () => serverState;
const getSnapshot = () => window.blogTheme.getState();
const subscribe = (listener: () => void) => window.blogTheme.subscribe(listener);
const modes = [
  { value: 'system', label: '跟随系统' },
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
] as const;

export default function ThemePicker({ hidden = false }: { hidden?: boolean }) {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [open, setOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (hidden) setOpen(false);
  }, [hidden]);

  useEffect(() => {
    if (!open) return;
    const picker = pickerRef.current;
    picker?.querySelector<HTMLInputElement>('input:checked')?.focus({ preventScroll: true });
    function dismissOutside(event: PointerEvent) {
      if (event.target instanceof Node && !picker?.contains(event.target)) setOpen(false);
    }
    function dismissEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setOpen(false);
      toggleRef.current?.focus({ preventScroll: true });
    }
    document.addEventListener('pointerdown', dismissOutside);
    document.addEventListener('keydown', dismissEscape);
    return () => {
      document.removeEventListener('pointerdown', dismissOutside);
      document.removeEventListener('keydown', dismissEscape);
    };
  }, [open]);

  return (
    <div className="theme-picker" data-theme-picker ref={pickerRef}>
      <button ref={toggleRef} type="button" className="theme-toggle"
        aria-label={open ? '关闭主题设置' : '打开主题设置'} aria-haspopup="dialog"
        aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(!open)}
        title={`主题：${modes.find(({ value }) => value === state.modePreference)?.label}`}>
        <svg className="theme-icon theme-icon--moon" aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.3 3.5C11.9 3.5 12.2 4.2 11.8 4.7C10 7.1 10.2 10.5 12.1 12.7C13.7 14.6 16.3 15.4 18.7 14.9C19.4 14.7 19.9 15.3 19.6 16C18.1 19.2 14.6 21 11.1 20.4C6.7 19.8 3.6 15.9 4.1 11.4C4.5 7.4 7.5 4.1 11.3 3.5Z" opacity=".86" />
        </svg>
        <svg className="theme-icon theme-icon--sun" aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="4.7" opacity=".88" />
          <g opacity=".66">{[0, 45, 90, 135, 180, 225, 270, 315].map((angle) =>
            <rect key={angle} x="11" y="1.7" width="2" height="3.2" rx="1" transform={`rotate(${angle} 12 12)`} />)}</g>
        </svg>
      </button>
      <section id={panelId} className="theme-panel" role="dialog" aria-label="主题设置" hidden={!open}>
        <fieldset>
          <legend>显示模式</legend>
          <div className="theme-modes">{modes.map(({ value, label }) => (
            <label className="theme-mode" key={value}>
              <input type="radio" name={panelId} value={value} data-theme-mode-input
                checked={state.modePreference === value} onChange={() => window.blogTheme.setPreference(value)} />
              <span>{label}</span>
            </label>
          ))}</div>
        </fieldset>
      </section>
    </div>
  );
}
