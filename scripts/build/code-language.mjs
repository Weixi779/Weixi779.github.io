// Created by weixi on 2026/11/25.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { bundledLanguagesInfo } from 'shiki';

const require = createRequire(import.meta.url);
const languages = new Map();
for (const language of bundledLanguagesInfo) {
  for (const id of [language.id, ...(language.aliases ?? [])]) languages.set(id, language);
}
languages.set('objectivec', languages.get('objective-c'));

const iconKey = id => id.toLowerCase().replaceAll('-', '');
const icons = new Map();
for (const entry of require('devicon/devicon.json')) {
  for (const name of [entry.name, ...entry.altnames]) icons.set(iconKey(name), entry);
}
const aliases = new Map(Object.entries({
  css: 'css3', html: 'html5', jsx: 'react', tsx: 'react', shellscript: 'bash', vue: 'vuejs',
}));
const sources = new Map();

function element(tagName, properties, children = []) {
  return { type: 'element', tagName, properties, children };
}

function languageIcon(id) {
  const entry = icons.get(iconKey(aliases.get(id) ?? id));
  const version = ['original', 'plain', 'line'].find(style => entry?.versions.svg.includes(style));
  if (!version) return element('span', { 'aria-hidden': 'true' }, [{ type: 'text', value: '‹/›' }]);
  if (!sources.has(entry.name)) {
    const path = require.resolve(`devicon/icons/${entry.name}/${entry.name}-${version}.svg`);
    sources.set(entry.name, `data:image/svg+xml;base64,${readFileSync(path).toString('base64')}`);
  }
  return element('img', { src: sources.get(entry.name), alt: '', width: 16, height: 16,
    class: /^#(?:000|000000)$/i.test(entry.color) ? 'code-language__monochrome' : undefined });
}

export const codeLanguage = {
  name: 'article-code-language',
  root(root) {
    const pre = root.children[0];
    if (pre?.tagName !== 'pre') return;
    const tag = pre.properties.dataLanguage ?? 'text';
    const language = languages.get(tag);
    const name = language?.name ?? (['text', 'txt', 'plaintext'].includes(tag) ? 'Text' : tag);
    const label = element('span', { class: 'code-language' }, [
      languageIcon(language?.id ?? tag), { type: 'text', value: name },
    ]);
    root.children[0] = element('div', { class: 'article-code' }, [
      element('div', { class: 'article-code__bar' }, [label]), pre,
    ]);
  },
};
