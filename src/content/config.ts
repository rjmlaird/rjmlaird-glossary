import { defineCollection, reference, z } from 'astro:content';

export const categories = ['space', 'sustainability', 'marketing', 'web-architecture'] as const;
export type Category = (typeof categories)[number];

// Display label and brand accent per category (accent tokens come from global.css)
export const categoryMeta: Record<Category, { label: string; colour: string }> = {
  space: { label: 'Space', colour: 'var(--sky)' },
  sustainability: { label: 'Sustainability', colour: 'var(--green)' },
  marketing: { label: 'Marketing', colour: 'var(--amber)' },
  'web-architecture': { label: 'Web architecture', colour: 'var(--violet)' },
};

const terms = defineCollection({
  type: 'content',
  schema: z.object({
    term: z.string().min(1),
    category: z.enum(categories),
    aliases: z.array(z.string()).default([]),
    short: z.string().min(1).max(200),
    // reference() fails the build if a slug does not match a file in terms/
    related: z.array(reference('terms')).default([]),
    updated: z.coerce.date(),
  }),
});

export const collections = { terms };
