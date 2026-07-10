import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const siteRoot = resolve(scriptDirectory, '..');
const repositoryRoot = resolve(siteRoot, '..');
const distRoot = join(siteRoot, 'dist');
const sourcePostsRoot = join(repositoryRoot, 'server/source/_posts');
const legacyRoutesPath = join(repositoryRoot, 'docs/legacy-routes.txt');

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
  fail('site/dist does not exist. Run astro build first.');
} else {
  const legacyRoutes = readFileSync(legacyRoutesPath, 'utf8')
    .split('\n')
    .map((route) => route.trim())
    .filter(Boolean);
  const requiredLegacyRoutes = legacyRoutes.filter(
    (route) =>
      route === '/' ||
      route === '/404.html' ||
      route === '/about/' ||
      route === '/archive/' ||
      route.startsWith('/page/') ||
      /^\/\d{4}\//u.test(route),
  );

  for (const route of requiredLegacyRoutes) {
    if (!existsSync(routeOutputPath(route))) fail(`missing required route ${route}`);
  }

  const sourcePostFiles = readdirSync(sourcePostsRoot).filter((file) => file.endsWith('.md'));
  const sourcePostCount = sourcePostFiles.length;
  const postPages = collectPostPages();
  if (postPages.length !== sourcePostCount) {
    fail(`expected ${sourcePostCount} post pages, found ${postPages.length}`);
  }

  for (const postPage of postPages) {
    const html = readFileSync(postPage, 'utf8');
    if (!html.includes('data-mapping="pathname"')) fail(`Giscus is missing from ${postPage}`);
    if (!html.includes('class="post-navigation"')) fail(`post navigation is missing from ${postPage}`);
  }

  for (const sourcePostFile of sourcePostFiles) {
    const source = readFileSync(join(sourcePostsRoot, sourcePostFile), 'utf8');
    const dateMatch = source.match(/^date:\s*(\d{4})-(\d{2})-(\d{2})/mu);
    const slugMatch = source.match(/^slug:\s*([a-z0-9]+(?:-[a-z0-9]+)*)\s*$/mu);
    if (!dateMatch || !slugMatch) {
      fail(`missing date or valid slug in ${sourcePostFile}`);
      continue;
    }

    const legacySlug = sourcePostFile.replace(/\.md$/u, '');
    const legacyPage = join(distRoot, dateMatch[1], dateMatch[2], dateMatch[3], legacySlug, 'index.html');
    const targetPath = `/posts/${slugMatch[1]}/`;
    if (!existsSync(legacyPage)) {
      fail(`missing legacy redirect page for ${sourcePostFile}`);
      continue;
    }

    const redirectHtml = readFileSync(legacyPage, 'utf8');
    if (!redirectHtml.includes('http-equiv="refresh"') || !redirectHtml.includes(`href="${targetPath}"`)) {
      fail(`legacy route for ${sourcePostFile} does not redirect to ${targetPath}`);
    }
  }

  const rssPath = join(distRoot, 'rss.xml');
  if (!existsSync(rssPath)) {
    fail('missing RSS feed /rss.xml');
  } else {
    const rss = readFileSync(rssPath, 'utf8');
    const rssItemCount = Array.from(rss.matchAll(/<item>/gu)).length;
    if (rssItemCount !== sourcePostCount) {
      fail(`expected ${sourcePostCount} RSS items, found ${rssItemCount}`);
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
      `Verified ${postPages.length} canonical post pages, ${sourcePostCount} legacy redirects, ${requiredLegacyRoutes.length} required legacy routes, and internal links across ${htmlPages.length} HTML pages.`,
    );
  }
}
