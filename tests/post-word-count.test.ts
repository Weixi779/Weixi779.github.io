// Created by weixi on 2026/10/25.

import { describe, expect, it } from 'vitest';
import { countPostWords } from '../src/utils/post-word-count';

describe('countPostWords', () => {
  it('counts Chinese characters and Latin words, including headings and inline code', async () => {
    expect(await countPostWords('# 中文标题\n\n你好，React world！`Swift`')).toBe(9);
  });

  it('counts readable link text but excludes images, URLs, code blocks and SVG markup', async () => {
    const body = ['[链接](https://example.com/many/words)', '', '![图片说明](poster.png)', '',
      '```swift', 'let longVariableName = "不计入代码"', '```', '',
      '<svg><text>不计入图形代码</text></svg>', '', '> 引用', '', '- 列表'].join('\n');
    expect(await countPostWords(body)).toBe(6);
  });

  it('handles empty content and keeps concurrent articles independent', async () => {
    expect(await Promise.all([countPostWords(''), countPostWords('中文'), countPostWords('hello world')])).toEqual([0, 2, 2]);
  });
});
