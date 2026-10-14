// Created by weixi on 2026/10/14.

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
    environment: 'node',
    environmentOptions: {
      jsdom: { url: 'https://example.com/archive/' },
    },
    restoreMocks: true,
  },
});
