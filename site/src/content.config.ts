import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const optionalString = z.preprocess(
  (value) => (value === null || value === '' ? undefined : value),
  z.string().optional(),
);

const stringList = z.preprocess(
  (value) => (value === null || value === undefined ? [] : value),
  z.array(z.string()),
);

const posts = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: '../server/source/_posts',
  }),
  schema: z.object({
    title: z.string(),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
    date: z.coerce.date(),
    summary: optionalString,
    tags: stringList,
    categories: stringList,
    catalog: z.boolean().optional().default(false),
    toc: z.boolean().optional(),
    top: z.boolean().optional().default(false),
    mathjax: z.boolean().optional().default(false),
    cover: z.union([z.boolean(), z.string()]).optional(),
    'header-img': optionalString,
    layout: optionalString,
    password: z.preprocess(
      (value) => (value === null || value === '' ? undefined : value),
      z.union([z.string(), z.number()]).optional(),
    ),
  }),
});

const pages = defineCollection({
  loader: glob({
    pattern: 'about/index.md',
    base: '../server/source',
  }),
  schema: z.object({
    title: z.string(),
    layout: optionalString,
    date: z.coerce.date().optional(),
    description: optionalString,
    'header-img': optionalString,
    comments: z.boolean().optional().default(false),
  }),
});

export const collections = { pages, posts };
