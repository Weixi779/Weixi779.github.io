// Created by weixi on 2026/07/10.

import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import subsetFont from 'subset-font';

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDirectory = path.join(rootDirectory, 'src');
const outputDirectory = path.join(rootDirectory, 'public/fonts');
const cacheDirectory = path.join(rootDirectory, 'node_modules/.cache/site-fonts');

const lxgwVersion = 'v1.522';
const jetBrainsMonoVersion = 'v2.304';

const lxgwFonts = [
  {
    sourceName: 'LXGWWenKaiGB-Regular.ttf',
    outputName: 'lxgw-wenkai-gb-regular-subset.woff2',
    sha256: '295568c131648062107543aa159c97dd49564be791136c2abf74cad83eba3f7f',
  },
  {
    sourceName: 'LXGWWenKaiGB-Medium.ttf',
    outputName: 'lxgw-wenkai-gb-medium-subset.woff2',
    sha256: 'b885c51ec0d3f325974013801dfcefda1a9ba0bf385c607cf5f2582dafa2e5ab',
  },
  {
    sourceName: 'LXGWWenKaiMonoGB-Regular.ttf',
    outputName: 'lxgw-wenkai-mono-gb-regular-subset.woff2',
    sha256: 'fb82a0d6b9c0a1a3c83ad303eab1cc998e6a52c1028027fc3527455bdadb4ecb',
  },
];

const jetBrainsMonoFonts = [
  'JetBrainsMono-Regular.woff2',
  'JetBrainsMono-Bold.woff2',
  'JetBrainsMono-Italic.woff2',
  'JetBrainsMono-BoldItalic.woff2',
];

async function listSourceTextFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return listSourceTextFiles(entryPath);
      return /\.(?:astro|js|json|md|mdx|mjs|ts)$/.test(entry.name) ? [entryPath] : [];
    }),
  );

  return files.flat().sort();
}

async function buildCharacterSet() {
  const sourceFiles = await listSourceTextFiles(sourceDirectory);
  const contents = await Promise.all(sourceFiles.map((file) => readFile(file, 'utf8')));
  const baseline = '中文标点，“”‘’：；！？（）【】《》—…·「」『』';
  const characters = new Set((baseline + contents.join('\n')).normalize('NFC'));

  return [...characters]
    .filter((character) => character === ' ' || !/[\p{Cc}\p{Cs}]/u.test(character))
    .sort((lhs, rhs) => lhs.codePointAt(0) - rhs.codePointAt(0))
    .join('');
}

function digest(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

async function download(url) {
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) throw new Error(`Download failed (${response.status}): ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

async function cachedDownload(font) {
  const cachePath = path.join(cacheDirectory, `${lxgwVersion}-${font.sourceName}`);

  try {
    const cached = await readFile(cachePath);
    if (digest(cached) === font.sha256) return cached;
  } catch {
    // A missing cache is expected on the first run.
  }

  const url = `https://github.com/lxgw/LxgwWenkaiGB/releases/download/${lxgwVersion}/${font.sourceName}`;
  const source = await download(url);
  const actualDigest = digest(source);
  if (actualDigest !== font.sha256) {
    throw new Error(`Checksum mismatch for ${font.sourceName}: ${actualDigest}`);
  }

  await writeFile(cachePath, source);
  return source;
}

async function updateLxgwFonts(characters) {
  for (const font of lxgwFonts) {
    const source = await cachedDownload(font);
    const subset = await subsetFont(source, characters, {
      targetFormat: 'woff2',
      preserveNameIds: [0, 1, 2, 3, 4, 5, 6],
    });
    await writeFile(path.join(outputDirectory, font.outputName), subset);
    console.log(`${font.outputName}: ${(subset.byteLength / 1024).toFixed(1)} KiB`);
  }
}

async function updateJetBrainsMonoFonts() {
  for (const fontName of jetBrainsMonoFonts) {
    const url = `https://raw.githubusercontent.com/JetBrains/JetBrainsMono/${jetBrainsMonoVersion}/fonts/webfonts/${fontName}`;
    const font = await download(url);
    await writeFile(path.join(outputDirectory, fontName), font);
    console.log(`${fontName}: ${(font.byteLength / 1024).toFixed(1)} KiB`);
  }
}

async function updateLicenses() {
  const licenses = [
    {
      name: 'LXGW-WenKai-GB-OFL-1.1.txt',
      url: `https://raw.githubusercontent.com/lxgw/LxgwWenkaiGB/${lxgwVersion}/OFL.txt`,
    },
    {
      name: 'JetBrains-Mono-OFL-1.1.txt',
      url: `https://raw.githubusercontent.com/JetBrains/JetBrainsMono/${jetBrainsMonoVersion}/OFL.txt`,
    },
  ];

  for (const license of licenses) {
    await writeFile(path.join(outputDirectory, 'licenses', license.name), await download(license.url));
  }
}

async function main() {
  await Promise.all([
    mkdir(outputDirectory, { recursive: true }),
    mkdir(path.join(outputDirectory, 'licenses'), { recursive: true }),
    mkdir(cacheDirectory, { recursive: true }),
  ]);

  const characters = await buildCharacterSet();
  console.log(`Subsetting LXGW WenKai GB for ${[...characters].length} unique characters.`);

  await updateLxgwFonts(characters);
  await Promise.all([updateJetBrainsMonoFonts(), updateLicenses()]);
}

await main();
