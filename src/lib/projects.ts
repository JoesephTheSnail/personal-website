import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { stripHighlight } from './highlight';

const projectsDir = path.join(process.cwd(), 'content', 'projects');

export interface ProjectFrontmatter {
  title: string;
  date: string;
  description: string;
  /** Shorter title for the browser tab and search results, when the on-page title is too long (about 45 characters or fewer). */
  seoTitle?: string;
  thumbnail?: string;
  link?: string;
  links?: { label: string; url: string }[];
  status: 'published' | 'upcoming';
  /** A standout project: gets a star in the projects lists. */
  featured?: boolean;
  category?: string;
  order?: number;
  /** What kind of artifact this actually is, when it diverges from what the category implies (e.g. a "Creative" project that's really a pitch deck). */
  artifactType?: string;
  /** Set by getAllProjects, not authored: the description with its **highlight** markers intact, for the category lists. `description` itself is always marker-free. */
  descriptionRich?: string;
  /** Concrete tools named in the write-up — never inferred, only what's explicitly stated. */
  tools?: string[];
  /** An in-site interactive page for this project. Shown as a prominent button above the write-up. */
  demoHref?: string;
  demoLabel?: string;
  /** One short line under the demo button, e.g. what device it works best on. */
  demoNote?: string;
}

export interface Project {
  slug: string;
  frontmatter: ProjectFrontmatter;
  content: string;
}

export function getAllProjects(): Project[] {
  const files = fs.readdirSync(projectsDir).filter(
    (f) => f.endsWith('.mdx') && !f.startsWith('_')
  );

  const projects = files.map((filename) => {
    const slug = filename.replace('.mdx', '');
    const filePath = path.join(projectsDir, filename);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(raw);
    // Copied, not mutated: gray-matter caches parse results by file content,
    // so editing `data` in place would corrupt the cached object and the
    // second getAllProjects() call would see already-stripped text.
    const frontmatter = { ...data } as ProjectFrontmatter;
    // Authors mark a standout result inline as **bold**; only the category
    // lists show it (highlighted), everything else gets the description
    // without that phrase.
    // `?? ''`: a draft with no description yet must not take the whole site down.
    frontmatter.descriptionRich = frontmatter.description ?? '';
    frontmatter.description = stripHighlight(frontmatter.description ?? '');

    return {
      slug,
      frontmatter,
      content,
    };
  });

  return projects.sort((a, b) => (a.frontmatter.order ?? 99) - (b.frontmatter.order ?? 99));
}
