// Created by weixi on 2026/10/14.

import { defineConfig } from 'vitest/config';
import { themeBootstrapPlugin } from './scripts/theme-bootstrap-plugin.mjs';

export default defineConfig({
  plugins: [themeBootstrapPlugin()],
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
    environment: 'node',
    environmentOptions: {
      jsdom: { url: 'https://example.com/archive/' },
    },
    restoreMocks: true,
  },
});
