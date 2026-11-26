import { describe, expect, it } from 'vitest';
import { getAllProjects } from './projects';
import { compareProjects, nextInSequence, nextOrTop } from './projectOrder';

// "Next project" must walk the whole list once, in list order, then go back to the top: no repeats
// before that, no skipped projects, and no two-project loops.
describe('next project sequence', () => {
  const sorted = getAllProjects().filter((p) => p.frontmatter.status === 'published').sort(compareProjects);

  it('visits every published project exactly once, then returns to the top', () => {
    const visited: string[] = [];
    let current = sorted[0];
    for (let n = 0; n < sorted.length; n++) {
      visited.push(current.slug);
      const hop = nextOrTop(sorted, current.slug)!;
      expect(hop.wrapped).toBe(n === sorted.length - 1);
      current = hop.project;
    }
    expect(visited).toEqual(sorted.map((p) => p.slug));
    expect(new Set(visited).size).toBe(sorted.length);
    expect(current.slug).toBe(sorted[0].slug);
  });

  it('never sends a project to the one before it (no back-and-forth)', () => {
    sorted.forEach((p, i) => {
      const next = nextOrTop(sorted, p.slug)!.project;
      expect(sorted.indexOf(next)).toBe((i + 1) % sorted.length);
    });
  });

  it('has no link for projects that are not in the list', () => {
    expect(nextOrTop(sorted, 'not-a-project')).toBeUndefined();
    expect(nextInSequence(sorted, sorted[sorted.length - 1].slug)).toBeUndefined();
  });

  it('orders ties deterministically', () => {
    const a = { slug: 'a', frontmatter: { date: '2026', order: 1 } };
    const b = { slug: 'b', frontmatter: { date: '2026', order: 1 } };
    expect(compareProjects(a, b)).toBeLessThan(0);
    expect(compareProjects(b, a)).toBeGreaterThan(0);
  });
});
