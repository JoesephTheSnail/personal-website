// The disciplines projects are filed under. Order is the order the filter and
// the discipline pages list them in. Colour is not per-category on purpose:
// the whole site uses one accent (--accent in globals.css).
export interface CategoryMeta {
  label: string;
  slug: string;
  order: number;
}

export const CATEGORIES: CategoryMeta[] = [
  { label: 'Creative',    slug: 'creative',    order: 1 },
  { label: 'Product',     slug: 'product',     order: 2 },
  { label: 'Research',    slug: 'research',    order: 3 },
  { label: 'Pitch Deck',  slug: 'pitch-deck',  order: 4 },
  { label: 'Film',        slug: 'film',        order: 5 },
  { label: 'Engineering', slug: 'engineering', order: 6 },
  { label: 'Training',    slug: 'training',    order: 7 },
];

export function getCategoryBySlug(slug: string): CategoryMeta | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

export function getCategoryByLabel(label: string): CategoryMeta | undefined {
  return CATEGORIES.find((c) => c.label === label);
}
