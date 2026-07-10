// Created by weixi on 2026/07/10.

import { access, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join } from 'node:path';

const [slug, title, category = '随笔'] = process.argv.slice(2);

if (!slug || !title) {
  console.error('Usage: npm run new -- <slug> "<title>" [category]');
  process.exit(1);
}

if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slug)) {
  console.error('Slug must contain lowercase letters, numbers, and single hyphens only.');
  process.exit(1);
}

const filePath = join('src/content/posts', `${slug}.md`);

try {
  await access(filePath, constants.F_OK);
  console.error(`Post already exists: ${filePath}`);
  process.exit(1);
} catch {}

const dateParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})
  .formatToParts(new Date())
  .reduce((parts, part) => ({ ...parts, [part.type]: part.value }), {});
const publishedAt = `${dateParts.year}-${dateParts.month}-${dateParts.day} ${dateParts.hour}:${dateParts.minute}:${dateParts.second}`;
const frontmatter = `---
title: ${JSON.stringify(title)}
slug: ${slug}
publishedAt: ${JSON.stringify(publishedAt)}
tags: []
category: ${JSON.stringify(category)}
toc: true
math: false
draft: true
---

# ${title}
`;

await writeFile(filePath, frontmatter, { encoding: 'utf8', flag: 'wx' });
console.log(`Created ${filePath}`);
