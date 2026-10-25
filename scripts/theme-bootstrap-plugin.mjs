// Created by weixi on 2026/10/25.

import { buildSync } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

// Bundle the tested modules into one synchronous head script, with no network
// or React hydration dependency. This is build integration, not theme logic.
export function themeBootstrapPlugin() {
  const id = 'virtual:theme-bootstrap';
  const root = fileURLToPath(new URL('../', import.meta.url));
  return {
    name: 'theme-bootstrap',
    resolveId(source) { if (source === id) return `\0${id}`; },
    load(source) {
      if (source !== `\0${id}`) return;
      const result = buildSync({
        absWorkingDir: root,
        entryPoints: ['src/theme/bootstrap.ts'],
        bundle: true,
        write: false,
        format: 'iife',
        target: 'es2022',
        minify: true,
        metafile: true,
      });
      for (const input of Object.keys(result.metafile.inputs)) this.addWatchFile(resolve(root, input));
      return `export default ${JSON.stringify(result.outputFiles[0].text)};`;
    },
  };
}
