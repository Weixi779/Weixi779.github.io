import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://weixi779.github.io',
  output: 'static',
  trailingSlash: 'always',
  build: {
    assets: 'assets',
  },
  markdown: {
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
