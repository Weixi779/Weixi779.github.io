import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, '..');
const distRoot = join(projectRoot, 'dist');
const requiredRoutes = ['/', '/404.html', '/about/', '/archive/', '/page/2/', '/page/3/'];

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

  const postPages = collectPostPages();
  if (postPages.length === 0) fail('no published post pages were generated');

  for (const postPage of postPages) {
    const html = readFileSync(postPage, 'utf8');
    if (!html.includes('data-mapping="pathname"')) fail(`Giscus is missing from ${postPage}`);
    if (!html.includes('class="post-navigation"')) fail(`post navigation is missing from ${postPage}`);
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
    const localUrls = Array.from(html.matchAll(/(?:href|src)="(\/[^"\s]*)"/gu), (match) => match[1]);
    for (const url of localUrls) {
      if (!existsSync(localUrlOutputPath(url))) fail(`broken internal URL ${url} in ${htmlPage}`);
    }
  }

  if (process.exitCode !== 1) {
    console.log(
      `Verified ${postPages.length} post pages, ${requiredRoutes.length} required routes, the RSS feed, and internal links across ${htmlPages.length} HTML pages.`,
    );
  }
}
