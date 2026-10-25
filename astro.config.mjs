import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import { satteri } from '@astrojs/markdown-satteri';
import { themeBootstrapPlugin } from './scripts/theme-bootstrap-plugin.mjs';

const proseTables = {
  name: 'prose-tables',
  element: {
    filter: ['table'],
    visit(node, context) {
      context.wrapNode(node, {
        type: 'element',
        tagName: 'div',
        properties: { className: ['prose-table'], tabIndex: 0 },
        children: [],
      });
    },
  },
};

export default defineConfig({
  site: 'https://weixi779.github.io',
  output: 'static',
  integrations: [react()],
  vite: { plugins: [themeBootstrapPlugin()] },
  trailingSlash: 'always',
  build: {
    assets: 'assets',
  },
  markdown: {
    processor: satteri({ hastPlugins: [proseTables] }),
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      langAlias: {
        objectivec: 'objective-c',
      },
    },
  },
});
