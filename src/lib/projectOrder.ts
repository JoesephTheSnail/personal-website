// The one order projects are listed in: newest first, then the authored `order`, then slug so two
// projects can never tie. The projects list and the "Next project" link at the end of each write-up
// both use it, so clicking Next walks down the list exactly as it reads (see projectOrder.test.ts).
interface Sortable {
  slug: string;
  frontmatter: { date?: string; order?: number };
}

export function compareProjects(a: Sortable, b: Sortable): number {
  return (
    (b.frontmatter.date ?? '').localeCompare(a.frontmatter.date ?? '') ||
    (a.frontmatter.order ?? 0) - (b.frontmatter.order ?? 0) ||
    a.slug.localeCompare(b.slug)
  );
}

/** The project after `slug` in the list, or undefined at the end (and for unknown slugs). No wrap-around. */
export function nextInSequence<T extends Sortable>(sorted: T[], slug: string): T | undefined {
  const i = sorted.findIndex((p) => p.slug === slug);
  return i >= 0 ? sorted[i + 1] : undefined;
}

/**
 * What the "Next project" link at the end of a write-up points to: the following project, and after the
 * last one the first (the top of the list), so Next walks the whole list once and then starts over.
 * `wrapped` is true for that last hop so the page can say "Back to the top". Unknown slugs get nothing.
 */
export function nextOrTop<T extends Sortable>(sorted: T[], slug: string): { project: T; wrapped: boolean } | undefined {
  const i = sorted.findIndex((p) => p.slug === slug);
  if (i < 0 || sorted.length < 2) return undefined;
  return i + 1 < sorted.length ? { project: sorted[i + 1], wrapped: false } : { project: sorted[0], wrapped: true };
}
