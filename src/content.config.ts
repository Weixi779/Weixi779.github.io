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
    base: './src/content/posts',
  }),
  schema: z.object({
    title: z.string(),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
    publishedAt: z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/u),
    summary: optionalString,
    tags: stringList,
    category: z.string(),
    hero: optionalString,
    toc: z.boolean().default(false),
    math: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

const pages = defineCollection({
  loader: glob({
    pattern: '*.md',
    base: './src/content/pages',
  }),
  schema: z.object({
    title: z.string(),
    description: optionalString,
    hero: optionalString,
  }),
});

export const collections = { pages, posts };
