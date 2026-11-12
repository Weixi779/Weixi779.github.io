// Created by weixi on 2026/10/25.

import { createMarkdownProcessor, type RemarkPlugin } from '@astrojs/markdown-remark';

import { mdxProse } from './mdx-prose';

interface ProseNode {
  type: string;
  value?: string;
  children?: ProseNode[];
}

function proseText(node: ProseNode): string {
  if (['code', 'html', 'image', 'imageReference', 'definition'].includes(node.type)) return '';
  if (node.type === 'text' || node.type === 'inlineCode') return node.value ?? '';
  return (node.children ?? []).map(proseText).join(' ');
}

// Reuse the site's Markdown parser at build time. No article bodies or parser ship to React.
const collectWordCount: RemarkPlugin = () => (tree, file) => {
  const text = proseText(tree);
  const characters = text.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu) ?? [];
  const words = text.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/gu) ?? [];
  file.data.astro!.frontmatter!.proseWordCount = characters.length + words.length;
  // Only the count is needed; avoid rendering article HTML a second time.
  tree.children = [];
};

const processor = createMarkdownProcessor({
  syntaxHighlight: false,
  smartypants: false,
  remarkPlugins: [collectWordCount],
});

export async function countPostWords(body: string, format: 'md' | 'mdx' = 'md'): Promise<number> {
  // Inline SVG is parsed as separate HTML/text siblings by Markdown; omit the whole asset.
  const prose = (format === 'mdx' ? mdxProse(body) : body).replace(/<(svg|script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/giu, '');
  const result = await (await processor).render(prose);
  const count: unknown = result.metadata.frontmatter.proseWordCount;
  if (typeof count !== 'number') throw new Error('Missing prose word count');
  return count;
}
