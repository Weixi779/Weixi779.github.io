// Created by weixi on 2026/11/26.

const blocks = 'h1,h2,h3,h4,h5,h6,p,li,pre,td,th,figcaption,dt,dd';
const excluded = 'footer,.comments,.article-code__bar,astro-island,script,style,svg,button,template,[hidden],[aria-hidden="true"]';

export function passageText(block: Element, onText?: (node: Text, start: number) => void) {
  let text = '';
  function visit(parent: Element) {
    for (const child of parent.childNodes) {
      if (child.nodeType === 3) {
        const node = child as Text;
        onText?.(node, text.length);
        text += node.data;
      } else if (child.nodeType === 1) {
        const element = child as Element;
        if (element.matches(excluded) || element.matches(blocks)) continue;
        if (element.tagName === 'BR') text += ' ';
        else visit(element);
      }
    }
  }
  visit(block);
  return text;
}

export type PassageKind = 'code' | 'heading' | undefined;

export function passageFragment(text: string, kind?: PassageKind) {
  // Content-based fragments survive insertions earlier in a post.
  const value = (kind ?? '') + ':' + text;
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  return '#search-p-' + (hash >>> 0).toString(36);
}

// Keep the index and the article's fragment navigation in the same reading order.
export function articlePassages(root: ParentNode) {
  return Array.from(root.querySelectorAll<HTMLElement>(blocks)).flatMap(element => {
    if (element.closest(excluded)) return [];
    const text = passageText(element).replace(/\s+/gu, ' ').trim();
    const kind: PassageKind = element.tagName === 'PRE' ? 'code' : /^H[1-6]$/u.test(element.tagName) ? 'heading' : undefined;
    return text ? [{ element, text, kind }] : [];
  });
}
