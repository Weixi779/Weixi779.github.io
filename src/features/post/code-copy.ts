// Created by weixi on 2026/11/25.

function selectCode(code: HTMLElement) {
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(code);
  selection?.removeAllRanges();
  selection?.addRange(range);
  return selection;
}

function copySelection() {
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  }
}

export function bindCodeCopy(article: HTMLElement, tools: HTMLElement) {
  const template = tools.querySelector<HTMLTemplateElement>('.copy-template')!;
  const status = tools.querySelector<HTMLElement>('.copy-status')!;
  const help = document.createElement('div');
  help.className = 'copy-help';
  help.textContent = status.dataset.manual!;
  help.setAttribute('aria-hidden', 'true');
  const lifetime = new AbortController();
  const timers = new Map<HTMLButtonElement, number>();
  const buttons: HTMLButtonElement[] = [];
  let latestAttempt = 0;

  for (const block of article.querySelectorAll('.article-code')) {
    const code = block.querySelector<HTMLElement>('pre > code');
    const bar = block.querySelector('.article-code__bar');
    if (!bar || !code) continue;
    const button = template.content.firstElementChild!.cloneNode(true) as HTMLButtonElement;
    const copyLabel = button.title;
    bar.append(button);
    buttons.push(button);
    function resetFeedback() {
      window.clearTimeout(timers.get(button));
      timers.delete(button);
      delete button.dataset.copied;
      button.title = copyLabel;
      button.setAttribute('aria-label', copyLabel);
    }
    button.addEventListener('click', async () => {
      const attempt = ++latestAttempt;
      resetFeedback();
      help.remove();
      status.textContent = '';
      try {
        await navigator.clipboard.writeText(code.textContent);
      } catch {
        if (lifetime.signal.aborted || attempt !== latestAttempt) return;
        const selection = selectCode(code);
        if (!copySelection()) {
          bar.after(help);
          status.textContent = help.textContent;
          return;
        }
        selection?.removeAllRanges();
      }
      if (lifetime.signal.aborted || attempt !== latestAttempt) return;
      button.dataset.copied = '';
      button.title = button.dataset.copiedLabel!;
      button.setAttribute('aria-label', button.title);
      status.textContent = button.title;
      timers.set(button, window.setTimeout(resetFeedback, 1450));
    }, { signal: lifetime.signal });
  }

  return () => {
    lifetime.abort();
    for (const timer of timers.values()) window.clearTimeout(timer);
    for (const button of buttons) button.remove();
    help.remove();
    status.textContent = '';
  };
}
