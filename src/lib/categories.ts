export const categoryMeta = {
  space: {
    label: 'Space',
    colour: 'var(--sky)',
  },
  'earth-observation': {
    label: 'Earth observation',
    colour: 'var(--teal)',
  },
  'climate-science': {
    label: 'Climate science',
    colour: 'var(--coral)',
  },
  sustainability: {
    label: 'Sustainability',
    colour: 'var(--green)',
  },
  'science-communication': {
    label: 'Science communication',
    colour: 'var(--amber)',
  },
  marketing: {
    label: 'Marketing',
    colour: 'var(--amber)',
  },
  'web-architecture': {
    label: 'Web architecture',
    colour: 'var(--violet)',
  },
  reporting: {
    label: 'Reporting',
    colour: 'var(--teal)',
  },
} as const;

export type Category = keyof typeof categoryMeta;

export const categories = [
  'space',
  'earth-observation',
  'climate-science',
  'sustainability',
  'science-communication',
  'marketing',
  'web-architecture',
  'reporting',
] as const;

export function getCategory(category: Category) {
  return categoryMeta[category];
}
