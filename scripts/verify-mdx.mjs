// Created by weixi on 2026/10/25.
import assert from 'node:assert/strict';
import { dev } from 'astro';
import { existsSync, readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const server = await dev({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
try {
  for (const { slug, draft } of [
    { slug: 'ios-performance-unnecessary-work', draft: false },
    { slug: 'mdx-playground', draft: true },
  ]) {
    if (existsSync('dist')) {
      assert.equal(existsSync(`dist/posts/${slug}/index.html`), !draft, `${slug}: incorrect publication state`);
      for (const file of ['dist/rss.xml', 'dist/archive/index.html']) {
        assert.ok(existsSync(file), `missing ${file}; build before verification`);
        assert.equal(readFileSync(file, 'utf8').includes(`/posts/${slug}/`), !draft, `${slug}: incorrect visibility in ${file}`);
      }
    }
    const response = await fetch(`http://127.0.0.1:${server.address.port}/posts/${slug}/`);
    assert.equal(response.status, 200, slug);
    const dom = new JSDOM(await response.text());
    const document = dom.window.document;
    const article = document.querySelector('article.prose');
    assert.ok(article, `${slug}: missing article`);
    if (slug === 'ios-performance-unnecessary-work') assert.ok(article.querySelector('table'), 'missing article tables');
    for (const table of article.querySelectorAll('table')) {
      assert.ok(table.parentElement.matches('.prose-table[tabindex="0"]'), `${slug}: table needs a focusable scroll container`);
      assert.ok(!table.parentElement.parentElement.matches('.prose-table'), 'nested table wrappers');
    }
    for (const pre of article.querySelectorAll('pre')) {
      assert.ok(pre.matches('.astro-code[tabindex="0"]'), `${slug}: code highlighting/focus missing`);
      assert.ok(!pre.textContent.includes('<span class="line">'), 'escaped highlighting markup');
    }
    const components = slug === 'ios-performance-unnecessary-work'
      ? ['ReuseTimeline', 'HitchExplorer'] : ['ReuseTimeline'];
    for (const name of components) {
      const island = [...article.querySelectorAll('astro-island[client="load"]')]
        .find(node => node.getAttribute('component-url')?.includes(`${name}.tsx`));
      assert.ok(island, `${slug}: missing ${name}`);
      assert.ok(island.querySelector('section button'), `${slug}: ${name} has no rendered controls`);
    }
    for (const link of article.querySelectorAll('a[href^="#"]')) {
      assert.ok(document.getElementById(decodeURIComponent(link.hash.slice(1))), `${slug}: broken anchor ${link.hash}`);
    }
    dom.window.close();
  }
  console.log('Verified published and draft MDX routes: tables, code, anchors and server-rendered controls (browser interaction requires a separate check).');
} finally {
  await server.stop();
}
