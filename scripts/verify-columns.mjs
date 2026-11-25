// Created by weixi on 2026/11/18.

import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'astro';
import { JSDOM } from 'jsdom';

// Exercise the production static routes even when the author's catalog is empty.
const configPath = fileURLToPath(new URL('../src/features/columns/columns.json', import.meta.url));
const fixture = {
  slug: 'death-of-the-author', title: '压缩阅读顺序', intro: '两篇文章',
  cover: '/images/wicompress-2-architecture.webp',
  articles: ['ios-image-compression', 'image-compression-fundamentals'],
};
const outDir = await mkdtemp(join(tmpdir(), 'weixi-column-routes-'));
async function readPage(href) {
  const html = await readFile(join(outDir, href, 'index.html'), 'utf8');
  return new JSDOM(html).window.document;
}

try {
  await build({
    outDir,
    logLevel: 'error',
    vite: { plugins: [{
      name: 'column-test-config',
      enforce: 'pre',
      load(id) {
        if (id === configPath) return JSON.stringify([fixture]);
      },
    }] },
  });

  const home = await readPage('/');
  const entry = home.querySelector('nav[aria-label="主导航"] a[href="/columns/"]');
  assert.ok(entry, 'Missing navigation to the catalog');
  const catalog = await readPage(entry.getAttribute('href'));
  const card = catalog.querySelector('.column-card');
  assert.equal(card?.querySelector('h2')?.textContent, fixture.title);
  assert.equal(card.querySelector('.column-count')?.textContent, '2 篇文章');

  const detail = await readPage(card.getAttribute('href'));
  assert.equal(detail.querySelector('main h1')?.textContent, fixture.title);
  assert.match(detail.querySelector('.column-reading-count')?.textContent ?? '', /^2 篇文章 · 共 [1-9]\d{0,2}(?:,\d{3})* 字$/u);
  assert.equal(detail.querySelector('.page-hero__summary')?.textContent, fixture.intro);
  const scene = detail.querySelector('.site-banner__scene');
  assert.equal(scene?.style.getPropertyValue('--banner-image-light'), `url("${fixture.cover}")`);
  assert.ok(detail.querySelector('nav[aria-label="主导航"] a[href="/columns/"]'));
  const articles = [...detail.querySelectorAll('.column-reading-list a')];
  assert.deepEqual(articles.map(link => link.getAttribute('href')), [
    '/posts/image-compression-fundamentals/',
    '/posts/ios-image-compression/',
  ]);
  const featured = home.querySelector('.home-columns');
  const sections = home.querySelectorAll('.home-sections > :is(.home-recent-posts, .home-columns, .home-notes)');
  assert.deepEqual([...sections].map(section => section.className), ['home-recent-posts', 'home-columns', 'home-notes']);
  assert.equal(featured.querySelector('.row').getAttribute('href'), card.getAttribute('href'));
  assert.deepEqual([...featured.querySelectorAll('.contents a')].map(a => a.getAttribute('href')),
    articles.map(a => a.getAttribute('href')));
  for (const link of articles) {
    const post = await readPage(link.getAttribute('href'));
    assert.ok(post.querySelector('article.prose')?.textContent.trim(), 'Missing article body');
    const membership = post.querySelector('.post-columns');
    assert.equal(membership?.querySelector('a')?.getAttribute('href'), card.getAttribute('href'));
    assert.equal(membership?.nextElementSibling?.className, 'post-navigation');
  }
  console.log('Verified the static navigation → catalog → column → published articles reading path.');
} finally {
  await rm(outDir, { recursive: true, force: true });
}
