// Created by weixi on 2026/11/12.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dev } from 'astro';
import { JSDOM, VirtualConsole } from 'jsdom';

const root = new URL('../', import.meta.url);
const dist = new URL('dist/', root);
const pages = readdirSync(dist, { recursive: true })
  .filter(path => path.endsWith('.html'))
  .map(path => ({ path, html: readFileSync(new URL(path, dist), 'utf8') }));
assert.ok(pages.length > 0, 'Build the site before checking its development routes.');
// Layout is checked in a real browser; jsdom does not support all dev-toolbar CSS.
const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', error => { if (error.type !== 'css-parsing') throw error; });

// Like verify-mdx, own and close a temporary server by default. An explicit URL
// checks an already-running process too, including stale configuration after a move.
const existingUrl = process.argv[2];
const server = existingUrl ? null : await dev({ root: fileURLToPath(root), server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
const base = existingUrl ?? `http://127.0.0.1:${server.address.port}`;
const failures = [];
try {
  for (const { path: page, html } of pages) {
    const route = `/${page.replace(/index\.html$/u, '')}`;
    const expected = new JSDOM(html, { virtualConsole });
    let actual;
    try {
      const response = await fetch(new URL(route, base), { redirect: 'manual', signal: AbortSignal.timeout(15000) });
      const redirect = expected.window.document.querySelector('meta[http-equiv="refresh"]')?.content.match(/url=(.*)$/iu)?.[1];
      if (redirect) {
        assert.ok([301, 302, 307, 308].includes(response.status), `expected redirect, received ${response.status}`);
        assert.equal(new URL(response.headers.get('location'), base).pathname, new URL(redirect, base).pathname);
        await response.body?.cancel();
        continue;
      }
      assert.equal(response.status, page === '404.html' ? 404 : 200, `unexpected HTTP status ${response.status}`);
      actual = new JSDOM(await response.text(), { virtualConsole });
      const document = actual.window.document;
      assert.equal(document.title, expected.window.document.title, 'page title differs from the build');
      assert.equal(document.querySelector('main h1')?.textContent, expected.window.document.querySelector('main h1')?.textContent, 'missing or incorrect page heading');
      assert.ok(document.querySelector('head script[data-theme-bootstrap]')?.textContent, 'missing theme bootstrap');
      assert.ok(document.querySelector('main'), 'missing page content');
    } catch (error) {
      failures.push(`${route}: ${error.message}`);
    } finally {
      expected.window.close();
      actual?.window.close();
    }
  }
  assert.equal(failures.length, 0, `Development route failures:\n${failures.join('\n')}`);
  console.log(`Verified ${pages.length} development routes at ${base}: status, redirects, page content and theme bootstrap.`);
} finally {
  await server?.stop();
}
