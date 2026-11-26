// Created by weixi on 2026/11/26.

import { matchRanges } from './matching';
import { passageText } from './passages';

export function passageRanges(element: Element, query: string): Range[] {
  const nodes: { node: Text; start: number }[] = [];
  const text = passageText(element, (node, start) => nodes.push({ node, start }));
  const ranges = [];
  let i = 0;
  // Paint only included text nodes, even when a match crosses a break or a hidden child.
  for (const [from, to] of matchRanges(text, query)) {
    while (i < nodes.length && nodes[i].start + nodes[i].node.length <= from) i++;
    for (let j = i; j < nodes.length && nodes[j].start < to; j++) {
      const { node, start } = nodes[j];
      const range = element.ownerDocument.createRange();
      range.setStart(node, Math.max(0, from - start));
      range.setEnd(node, Math.min(node.length, to - start));
      ranges.push(range);
    }
  }
  return ranges;
}
