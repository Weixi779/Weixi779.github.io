import { defineConfig } from 'astro/config';
import { satteri } from '@astrojs/markdown-satteri';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import { unified } from '@astrojs/markdown-remark';
import { themeBootstrapPlugin } from './scripts/theme-bootstrap-plugin.mjs';

import { satteriProseTables, rehypeProseTables } from './scripts/prose-tables.mjs';

export default defineConfig({
  site: 'https://weixi779.github.io',
  output: 'static',
  integrations: [react(), mdx({ processor: unified({ rehypePlugins: [rehypeProseTables] }) })],
  vite: { plugins: [themeBootstrapPlugin()] },
  trailingSlash: 'always',
  // Preserve published pagination URLs after moving the full list to the archive.
  redirects: {
    '/page/2/': '/archive/',
    '/page/3/': '/archive/',
  },
  build: {
    assets: 'assets',
  },
  markdown: {
    processor: satteri({ hastPlugins: [satteriProseTables] }),
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
