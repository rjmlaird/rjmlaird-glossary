// Category metadata lives outside content.config.ts so pages and the schema
// can both import it without pulling in the content layer.
export const categories = [
  'space',
  'earth-observation',
  'climate-science',
  'sustainability',
  'science-communication',
  'marketing',
  'web-architecture',
] as const;

export type Category = (typeof categories)[number];

export const categoryMeta: Record<Category, { label: string; colour: string }> = {
  space: { label: 'Space', colour: 'var(--sky)' },
  'earth-observation': { label: 'Earth observation', colour: 'var(--teal)' },
  'climate-science': { label: 'Climate science', colour: 'var(--coral)' },
  sustainability: { label: 'Sustainability', colour: 'var(--green)' },
  'science-communication': { label: 'Science communication', colour: 'var(--amber)' },
  marketing: { label: 'Marketing', colour: 'var(--amber)' },
  'web-architecture': { label: 'Web architecture', colour: 'var(--violet)' },
};
