import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, '..');
const distRoot = join(projectRoot, 'dist');
const translatedPostRoute = '/en/posts/wicompress-2-architecture-ai/';
const legacyPaginationRoutes = ['/page/2/', '/page/3/'];
const requiredRoutes = [
  '/',
  '/404.html',
  '/about/',
  '/archive/',
  '/fonts/',
  ...legacyPaginationRoutes,
  translatedPostRoute,
];
const requiredFontAssets = [
  'Allura-Regular.woff2',
  'SourceSans3-Regular.woff2',
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

  for (const route of legacyPaginationRoutes) {
    if (!existsSync(routeOutputPath(route))) continue;
    const document = new JSDOM(readFileSync(routeOutputPath(route), 'utf8')).window.document;
    const refresh = document.querySelector('meta[http-equiv="refresh"]')?.getAttribute('content');
    if (!refresh || !/^0;\s*url=\/archive\/$/iu.test(refresh)) fail(`${route} must redirect immediately to the archive`);
    if (document.querySelector('link[rel="canonical"]')?.getAttribute('href') !== 'https://weixi779.github.io/archive/') {
      fail(`${route} must canonicalize to the archive`);
    }
    if (document.querySelector('.post-card, .pager')) fail(`${route} must not render the retired pagination`);
  }

  const homeHtml = readFileSync(routeOutputPath('/'), 'utf8');
  // Homepage is a short, server-rendered introduction to the published archive.
  const homeDocument = new JSDOM(homeHtml).window.document;
  const homePosts = [...homeDocument.querySelectorAll('.home-recent-posts article')];
  const feedDocument = new JSDOM(readFileSync(join(distRoot, 'rss.xml'), 'utf8'), { contentType: 'text/xml' }).window.document;
  const recentFeedItems = [...feedDocument.querySelectorAll('item')].slice(0, 5);
  const expectedHomePaths = recentFeedItems.map(item => new URL(item.querySelector('link').textContent).pathname);
  const actualHomePaths = homePosts.map(post => post.querySelector('h3 a')?.getAttribute('href'));
  if (JSON.stringify(actualHomePaths) !== JSON.stringify(expectedHomePaths)) {
    fail('home page must show only the five newest published articles, in feed order');
  }
  homePosts.forEach((post, index) => {
    if (post.querySelector('p')?.textContent !== recentFeedItems[index]?.querySelector('description')?.textContent) {
      fail('home article introductions must match the complete published summaries');
    }
  });
  if (homeDocument.querySelector('.home-recent-posts__archive a')?.getAttribute('href') !== '/archive/') {
    fail('home page must link to the full archive');
  }
  if (homeDocument.querySelector('.pager, .post-card')) fail('home page must not retain the old cards or pagination');
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
    'id="archive-search-input"',
    'id="archive-result-status"',
    'class="archive-item"',
    'class="archive-categories"',
    '<astro-island',
    'client="load"',
  ]) {
    if (!archiveHtml.includes(marker)) fail(`archive is missing ${marker}`);
  }

  for (const fontAsset of requiredFontAssets) {
    if (!existsSync(join(distRoot, 'fonts', fontAsset))) fail(`missing font asset ${fontAsset}`);
  }

  const postPages = collectPostPages();
  if (postPages.length === 0) fail('no published post pages were generated');

  const archivePostLinks = [...archiveHtml.matchAll(/class="archive-item__link" href="([^"]+)"/gu)];
  if (archivePostLinks.length !== postPages.length) {
    fail('archive must render all published post links before React loads');
  }
  const archiveDocument = new JSDOM(archiveHtml).window.document;
  const archiveTotals = archiveDocument.querySelectorAll('.archive-stats strong');
  if (Number(archiveTotals[0]?.textContent) !== postPages.length || !(Number(archiveTotals[1]?.textContent) > 0)) {
    fail('archive banner must server-render published article and word totals');
  }
  for (const group of archiveDocument.querySelectorAll('.archive-year')) {
    const count = Number(group.querySelector('.archive-year__count')?.textContent.replace(/\D/gu, ''));
    if (count !== group.querySelectorAll('.archive-item').length) fail('archive year count must match its articles');
    if (!archiveDocument.querySelector(`.archive-year-nav a[href="#${group.id}"]`)) fail('archive year must have an anchor destination');
  }
  if (/<astro-island\b[^>]*component-url="[^"]*ArchiveBrowser\./u.test(homeHtml)) {
    fail('home page should not load the archive React island');
  }

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
    if (legacyPaginationRoutes.some(route => htmlPage === routeOutputPath(route))) continue;
    const page = new JSDOM(html);
    const document = page.window.document;
    const utilityPage = htmlPage === routeOutputPath('/fonts/') || htmlPage === routeOutputPath('/404.html');
    const banners = document.querySelectorAll('main .site-banner');
    if (banners.length !== (utilityPage ? 0 : 1)) {
      fail(`expected ${utilityPage ? 'no' : 'one shared'} banner in ${htmlPage}`);
    }
    const banner = banners[0];
    if (banner) {
      if (banner.querySelectorAll('h1').length !== 1 || !banner.querySelector('h1')?.textContent.trim()) {
        fail(`banner must expose one complete heading before JavaScript in ${htmlPage}`);
      }
      const category = banner.querySelector('.site-banner__category')?.textContent;
      if (category && banner.querySelector('h1')?.textContent.startsWith(`「${category}」`)) {
        fail(`banner repeats its category in the heading in ${htmlPage}`);
      }
      if (postPages.includes(htmlPage) || htmlPage === translatedPostPath) {
        if (!category || !banner.querySelector('time[datetime]')) {
          fail(`article banner lost its category or date in ${htmlPage}`);
        }
      }
      const scene = banner.querySelector('.site-banner__scene');
      for (const property of ['--banner-image-light', '--banner-image-dark']) {
        const image = scene?.style.getPropertyValue(property).match(/^url\("([^"]+)"\)$/u)?.[1];
        if (scene && (!image || !existsSync(localUrlOutputPath(image)))) {
          fail(`banner image is missing for ${property} in ${htmlPage}`);
        }
      }
      if (banner.classList.contains('home-hero')) {
        if (!banner.closest('astro-island[client="load"]') || !banner.querySelector('.site-banner__quote-text')?.textContent) {
          fail(`home banner must retain its quote before hydrating the typewriter in ${htmlPage}`);
        }
      }
    }
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
