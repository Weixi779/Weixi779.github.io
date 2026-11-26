// @vitest-environment jsdom
// Created by weixi on 2026/11/26.
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { bindCodeCopy } from '../../src/features/post/code-copy';

const source = 'one\n\n    two';
const writeText = vi.fn<(text: string) => Promise<void>>();
const legacyCopy = vi.fn<() => boolean>();
let dispose: () => void;
let buttons: HTMLButtonElement[];
let status: HTMLElement;

beforeEach(() => {
  vi.useFakeTimers();
  const block = '<div class="article-code"><div class="article-code__bar"><span>Swift</span></div><pre><code></code></pre></div>';
  document.body.innerHTML = `<article>${block}${block}</article><aside><template class="copy-template">
    <button title="Copy" aria-label="Copy" data-copied-label="Copied"></button></template>
    <span class="copy-status" role="status" data-manual="Use system Copy"></span></aside>`;
  const [first, second] = document.querySelectorAll('code');
  first.textContent = source;
  second.textContent = 'another block';
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: writeText.mockReset() } });
  Object.defineProperty(document, 'execCommand', { configurable: true, value: legacyCopy.mockReset() });
  dispose = bindCodeCopy(document.querySelector('article')!, document.querySelector('aside')!);
  buttons = [...document.querySelectorAll('button')];
  status = document.querySelector('.copy-status')!;
});
afterEach(() => {
  dispose();
  Reflect.deleteProperty(navigator, 'clipboard');
  Reflect.deleteProperty(document, 'execCommand');
  document.body.replaceChildren();
  vi.useRealTimers();
});

it('copies exactly the code and resets the button feedback', async () => {
  writeText.mockResolvedValue(undefined);
  buttons[0].click();
  await Promise.resolve();
  expect(writeText).toHaveBeenCalledWith(source);
  expect(buttons[0].getAttribute('aria-label')).toBe('Copied');
  expect(status.textContent).toBe('Copied');
  vi.runAllTimers();
  expect(buttons[0].title).toBe('Copy');
  expect(buttons[0].hasAttribute('data-copied')).toBe(false);
});

it('keeps the selection available and the toolbar intact when both clipboard paths fail', async () => {
  writeText.mockRejectedValue(new Error('denied'));
  legacyCopy.mockReturnValue(false);
  buttons[0].click();
  await Promise.resolve();
  const bar = buttons[0].parentElement!;
  expect(getSelection()?.toString()).toBe(source);
  expect(bar.lastElementChild).toBe(buttons[0]);
  expect(bar.nextElementSibling?.textContent).toBe('Use system Copy');
  expect(status.parentElement?.tagName).toBe('ASIDE');
  expect(status.textContent).toBe('Use system Copy');
  legacyCopy.mockReturnValue(true);
  buttons[1].click();
  await Promise.resolve();
  expect(document.querySelector('.copy-help')).toBeNull();
  expect(status.textContent).toBe('Copied');
  expect(getSelection()?.toString()).toBe('');
});

it('ignores an older permission response and cleans up feedback and timers on page exit', async () => {
  let deny!: () => void;
  writeText.mockImplementationOnce(() => new Promise((_, reject) => { deny = reject; })).mockResolvedValue(undefined);
  buttons[0].click();
  buttons[1].click();
  await Promise.resolve();
  deny();
  await Promise.resolve();
  expect(legacyCopy).not.toHaveBeenCalled();
  expect(status.textContent).toBe('Copied');
  dispose();
  expect(document.querySelector('article button')).toBeNull();
  expect(vi.getTimerCount()).toBe(0);
  expect(status.textContent).toBe('');
});
