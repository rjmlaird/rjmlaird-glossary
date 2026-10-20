// Category metadata lives outside content.config.ts so pages and the schema
// can both import it without pulling in the content layer.
export const categories = [
  'space',
  'sustainability',
  'marketing',
  'web-architecture',
] as const;

export type Category = (typeof categories)[number];

export const categoryMeta: Record<Category, { label: string; colour: string }> = {
  space: { label: 'Space', colour: 'var(--sky)' },
  sustainability: { label: 'Sustainability', colour: 'var(--green)' },
  marketing: { label: 'Marketing', colour: 'var(--amber)' },
  'web-architecture': { label: 'Web architecture', colour: 'var(--violet)' },
};
