import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { categories } from './lib/categories';

// File name = slug = URL (e.g. link-budget.md -> /link-budget/).
// A missing `short`, a bad category or a broken `related` slug fails the build.
const terms = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/terms' }),
  schema: z.object({
    term: z.string().min(1),
    category: z.enum(categories),
    aliases: z.array(z.string()).default([]),
    short: z.string().min(1).max(200),
    related: z.array(reference('terms')).default([]),
    updated: z.coerce.date(),
  }),
});

export const collections = { terms };
