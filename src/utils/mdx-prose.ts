// Created by weixi on 2026/10/25.
import { createProcessor } from '@mdx-js/mdx';

interface Node {
  type: string;
  name?: string | null;
  position?: { start: { offset?: number }; end: { offset?: number } };
  children?: Node[];
}
const parser = createProcessor();

// Parse only: never import or evaluate article JavaScript. Keep Markdown source
// inside JSX wrappers so existing excerpt and word-count rules still apply.
export function mdxProse(source: string): string {
  const ranges: [number, number][] = [];
  function visit(node: Node) {
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    if (start === undefined || end === undefined) {
      node.children?.forEach(visit);
      return;
    }
    if (['mdxjsEsm', 'mdxFlowExpression', 'mdxTextExpression'].includes(node.type)
      || ['svg', 'script', 'style'].includes(node.name ?? '')) {
      ranges.push([start, end]);
      return;
    }
    if (['mdxJsxFlowElement', 'mdxJsxTextElement'].includes(node.type)) {
      const children = node.children ?? [];
      ranges.push([start, children[0]?.position?.start.offset ?? end]);
      if (children.length) ranges.push([children.at(-1)!.position!.end.offset!, end]);
    }
    node.children?.forEach(visit);
  }
  visit(parser.parse(source));
  let result = source;
  for (const [start, end] of ranges.sort((a, b) => b[0] - a[0])) {
    result = result.slice(0, start) + ' ' + result.slice(end);
  }
  return result;
}
