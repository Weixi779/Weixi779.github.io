import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, '..');
const distRoot = join(projectRoot, 'dist');
const translatedPostRoute = '/en/posts/wicompress-2-architecture-ai/';
const requiredRoutes = [
  '/',
  '/404.html',
  '/about/',
  '/archive/',
  '/fonts/',
  '/page/2/',
  '/page/3/',
  translatedPostRoute,
];
const requiredFontAssets = [
  'Allura-Regular.ttf',
  'SourceSans3-Regular.ttf',
  'licenses/Allura-OFL.txt',
  'licenses/SourceSans3-OFL.txt',
  'JetBrainsMono-Regular.woff2',
  'JetBrainsMono-Bold.woff2',
  'JetBrainsMono-Italic.woff2',
  'JetBrainsMono-BoldItalic.woff2',
  'weixi-sans-subset.woff2',
  'lxgw-wenkai-mono-gb-regular-subset.woff2',
  'licenses/IPA-Font-License-1.0.md',
];

function fail(message) {
  console.error(`Build verification failed: ${message}`);
  process.exitCode = 1;
}

function routeOutputPath(route) {
  if (route === '/') return join(distRoot, 'index.html');
  if (route.endsWith('.html')) return join(distRoot, route.slice(1));
  return join(distRoot, route.slice(1), 'index.html');
}

function collectPostPages() {
  const postsRoot = join(distRoot, 'posts');
  if (!existsSync(postsRoot)) return [];
  return readdirSync(postsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(postsRoot, entry.name, 'index.html')))
    .map((entry) => join(postsRoot, entry.name, 'index.html'));
}

function collectHtmlPages(directory) {
  const results = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) results.push(...collectHtmlPages(entryPath));
    if (entry.isFile() && entry.name.endsWith('.html')) results.push(entryPath);
  }
  return results;
}

function localUrlOutputPath(url) {
  const normalized = url
    .replaceAll('&amp;', '&')
    .split('#')[0]
    .split('?')[0];
  const pathname = decodeURIComponent(normalized);
  if (pathname === '/') return join(distRoot, 'index.html');
  if (pathname.endsWith('/')) return join(distRoot, pathname.slice(1), 'index.html');
  return join(distRoot, pathname.slice(1));
}

if (!existsSync(distRoot)) {
  fail('dist does not exist. Run astro build first.');
} else {
  const legacyYearDirectories = readdirSync(distRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d{4}$/u.test(entry.name))
    .map((entry) => entry.name);
  if (legacyYearDirectories.length > 0) {
    fail(`unexpected legacy year routes: ${legacyYearDirectories.join(', ')}`);
  }

  for (const route of requiredRoutes) {
    if (!existsSync(routeOutputPath(route))) fail(`missing required route ${route}`);
  }

  const homeHtml = readFileSync(routeOutputPath('/'), 'utf8');
  for (const marker of [
    'data-theme-picker',
    'data-theme-mode-input',
  ]) {
    if (!homeHtml.includes(marker)) fail(`home page is missing ${marker}`);
  }
  for (const mode of ['light', 'dark', 'system']) {
    if (!homeHtml.includes(`value="${mode}"`)) fail(`appearance picker is missing ${mode}`);
  }

  const archiveHtml = readFileSync(routeOutputPath('/archive/'), 'utf8');
  for (const marker of [
    'data-archive-search-input',
    'data-archive-result-count',
    'data-archive-item',
    'data-search=',
    'data-category=',
  ]) {
    if (!archiveHtml.includes(marker)) fail(`archive is missing ${marker}`);
  }

  for (const fontAsset of requiredFontAssets) {
    if (!existsSync(join(distRoot, 'fonts', fontAsset))) fail(`missing font asset ${fontAsset}`);
  }

  const postPages = collectPostPages();
  if (postPages.length === 0) fail('no published post pages were generated');

  for (const postPage of postPages) {
    const html = readFileSync(postPage, 'utf8');
    if (!html.includes('class="page-hero__summary"')) {
      fail(`post summary is missing from the banner in ${postPage}`);
    }
    if (!html.includes('data-mapping="pathname"')) fail(`Giscus is missing from ${postPage}`);
    if (!html.includes('class="post-navigation"')) fail(`post navigation is missing from ${postPage}`);
  }

  const translatedPostPath = routeOutputPath(translatedPostRoute);
  if (existsSync(translatedPostPath)) {
    const translatedPostHtml = readFileSync(translatedPostPath, 'utf8');
    for (const marker of [
      '<html lang="en"',
      'hreflang="zh-CN"',
      'hreflang="en"',
      'hreflang="x-default"',
      'class="post-language-switch"',
    ]) {
      if (!translatedPostHtml.includes(marker)) {
        fail(`translated post is missing ${marker}`);
      }
    }
  }

  const rssPath = join(distRoot, 'rss.xml');
  if (!existsSync(rssPath)) {
    fail('missing RSS feed /rss.xml');
  } else {
    const rss = readFileSync(rssPath, 'utf8');
    const rssItemCount = Array.from(rss.matchAll(/<item>/gu)).length;
    if (rssItemCount !== postPages.length) {
      fail(`expected ${postPages.length} RSS items, found ${rssItemCount}`);
    }
  }

  const htmlPages = collectHtmlPages(distRoot);
  for (const htmlPage of htmlPages) {
    const html = readFileSync(htmlPage, 'utf8');
    const page = new JSDOM(html);
    const document = page.window.document;
    const headers = document.querySelectorAll('header.site-header');
    const header = headers[0];
    if (headers.length !== 1 || !header?.closest('astro-island[client="load"]')) {
      fail(`expected one shared React header in ${htmlPage}`);
    }
    const navigationLinks = Array.from(header?.querySelectorAll('nav[aria-label="主导航"] a') ?? [], (link) => link.getAttribute('href'));
    if (navigationLinks.join(',') !== '/,/archive/,/about/') {
      fail(`shared header navigation is incomplete in ${htmlPage}`);
    }
    const footers = document.querySelectorAll('footer.site-footer');
    const footer = footers[0];
    if (footers.length !== 1 || !footer?.closest('astro-island[client="load"]')) {
      fail(`expected one shared React footer in ${htmlPage}`);
    }
    const footerLinks = Array.from(footer?.querySelectorAll('nav a') ?? [], (link) => link.getAttribute('href'));
    if (footerLinks.join(',') !== 'https://github.com/Weixi779,https://leetcode.cn/u/wei-xi-d/,https://space.bilibili.com/6450245,mailto:sunshiwei418@126.com,/rss.xml') {
      fail(`shared footer destinations are incomplete before hydration in ${htmlPage}`);
    }
    if (!footer?.textContent.includes(`© 2021–${new Date().getFullYear()} Weixi All Rights Reserved`)
      || footer.querySelector('a[href="/fonts/"]')?.textContent !== 'Font Licenses'
      || !footer.textContent.includes('Stay hungry. Stay foolish.')) {
      fail(`shared footer copyright or license is missing in ${htmlPage}`);
    }
    page.window.close();
    const themeScript = html.match(/<script\b[^>]*data-theme-bootstrap[^>]*>[\s\S]*?<\/script>/u);
    if (!themeScript || !html.slice(0, html.indexOf('</head>')).includes(themeScript[0])) {
      fail(`synchronous theme bootstrap is missing from the head in ${htmlPage}`);
    }
    const localUrls = Array.from(html.matchAll(/(?:href|src)="(\/[^"\s]*)"/gu), (match) => match[1]);
    for (const url of localUrls) {
      if (!existsSync(localUrlOutputPath(url))) fail(`broken internal URL ${url} in ${htmlPage}`);
    }
  }

  if (process.exitCode !== 1) {
    console.log(
      `Verified ${postPages.length} post pages, ${requiredRoutes.length} required routes, ${requiredFontAssets.length} font assets, the RSS feed, and internal links across ${htmlPages.length} HTML pages.`,
    );
  }
}
