// @vitest-environment jsdom
// Created by weixi on 2026/11/26.

import { describe, expect, it } from 'vitest';
import { articlePassages, passageFragment } from '../../src/features/search/passages';
import { passageRanges } from '../../src/features/search/passage-ranges';
import { matchRanges } from '../../src/features/search/matching';
import { excerpt, findResults, prepareSearch, type SearchEntry } from '../../src/features/search/search';

const article: SearchEntry = {
  href: '/posts/compression/', kind: 'article', title: '一次重构', summary: '流水线的设计',
  detail: '2026 · 图像', terms: ['iOS'], passages: [
    { kind: 'heading', text: '中间阶段' }, { kind: 'code', text: 'let reader = WIImageIO()' },
    { text: '这张图里已经有了 WIImageIO。' },
  ],
};
const column: SearchEntry = {
  href: '/columns/compression/', kind: 'column', title: '图像处理', summary: '系列文章',
  detail: '1 篇文章', terms: [article.title],
};
const index = prepareSearch([article, column]);

describe('site search', () => {
  it('ranks a title before its containing column and respects the selected scope', () => {
    expect(findResults(index, '一次重构', 'all', []).map(hit => hit.href)).toEqual([article.href, column.href]);
    expect(findResults(index, '一次重构', 'column', [])[0].snippet).toBe(article.title);
    expect(findResults(index, '无此词', 'all', [])).toEqual([]);
  });

  it('prefers an explanatory paragraph over earlier code, with a shareable passage and its heading', () => {
    expect(findResults(index, 'ｗｉｉｍａｇｅｉｏ', 'all', [])[0]).toMatchObject({
      href: article.href + passageFragment('这张图里已经有了 WIImageIO。'),
      section: '中间阶段', snippet: '这张图里已经有了 WIImageIO。',
    });
    expect(findResults(index, 'reader', 'all', [])[0].href).toBe(article.href + passageFragment('let reader = WIImageIO()', 'code'));
  });

  it('requires every distinct word, including words split across title, tag and body', () => {
    const [hit] = findResults(index, '一次重构　ｉＯＳ  WIImageIO iOS', 'all', []);
    expect(hit.href).toBe(article.href + passageFragment(article.passages![2].text));
    expect(findResults(index, 'iOS 无此词', 'all', [])).toEqual([]);
    expect(findResults(index, '图像 一次重构', 'column', [])[0].href).toBe(column.href);
  });

  it('opens the paragraph with both words and prefers an existing continuous phrase', () => {
    const passages = [{ text: '缓存策略的起源' }, { text: '在 Swift 中写缓存' }, { text: '最后说说 Swift 缓存。' }];
    const corpus = prepareSearch([{ ...article, passages }]);
    expect(findResults(corpus, 'Swift 缓存', 'article', [])[0].snippet).toBe(passages[2].text);
    expect(findResults(corpus, '缓存 Swift', 'article', [])[0].snippet).toBe(passages[1].text);
    expect(matchRanges('在 Ｓｗｉｆｔ 中写缓存', '缓存 SWIFT')).toEqual([[2, 7], [10, 12]]);
  });

  it('maps a phrase across breaks and inline spans while skipping hidden and nested content', () => {
    document.body.innerHTML = `<ul><li>Swift<span hidden>Swift 缓存</span><br><em>缓</em><b>存</b><ul><li>缓存在子列表</li></ul></li></ul>`;
    const [passage] = articlePassages(document.body);
    expect(passage.text).toBe('Swift 缓存');
    const ranges = passageRanges(passage.element, 'Swift 缓存');
    expect(ranges.map(r => r.toString())).toEqual(['Swift', '缓', '存']);
    expect(ranges.map(r => r.startContainer.parentElement?.tagName)).toEqual(['LI', 'EM', 'B']);
  });

  it('filters recent visits and provides suggestions for a type with no recent visits', () => {
    expect(findResults(index, '', 'all', []).map(hit => hit.href)).toEqual([article.href]);
    expect(findResults(index, '', 'all', [column.href]).map(hit => hit.href)).toEqual([column.href]);
    expect(findResults(index, '', 'article', [column.href]).map(hit => hit.href)).toEqual([article.href]);
  });

  it('keeps original text and offsets through normalization, repeated hits and whitespace', () => {
    const text = '…ﬃ：ＡＢＣ\n  ＡＢＣ';
    expect(matchRanges(text, 'abc').map(([a, b]) => text.slice(a, b))).toEqual(['ＡＢＣ', 'ＡＢＣ']);
    expect(matchRanges(text, 'ffi:')[0]).toEqual([1, 3]);
    expect(matchRanges('ﬃ', 'f')).toEqual([[0, 1]]);
    expect(matchRanges(text, 'abc abc')).toEqual([[3, text.length]]);
    const line = '…'.repeat(70) + '首次出现的是 WIImageIO，请看下图。';
    expect(excerpt(line, 'wiimageio')).toContain('首次出现的是 WIImageIO，请看下图。');
  });

  it('indexes the rendered prose and code while omitting demos, chrome, comments and nested duplicates', () => {
    document.body.innerHTML = `<article><h2>章节</h2><p>正文<strong>在这里</strong><span hidden>隐藏</span></p>
      <ul><li>外层<ul><li>内层</li></ul></li></ul>
      <div class="article-code__bar"><p>Swift 复制</p></div><pre><code><span>let </span><span>value = 2</span></code></pre>
      <astro-island><p>互动按钮</p></astro-island><footer><p>落款</p></footer><section class="comments"><p>评论</p></section></article>`;
    const passages = articlePassages(document.querySelector('article')!);
    expect(passages.map(p => p.text)).toEqual(['章节', '正文在这里', '外层', '内层', 'let value = 2']);
    expect(passages[0].kind).toBe('heading');
    expect(passages.at(-1)?.kind).toBe('code');
  });
});
