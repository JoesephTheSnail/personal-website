import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const projectsDir = path.join(process.cwd(), 'content', 'projects');

export interface ProjectFrontmatter {
  title: string;
  date: string;
  description: string;
  thumbnail?: string;
  link?: string;
  links?: { label: string; url: string }[];
  status: 'published' | 'upcoming';
  category?: string;
  order?: number;
  /** What kind of artifact this actually is, when it diverges from what the category implies (e.g. a "Creative" project that's really a pitch deck). */
  artifactType?: string;
  /** Concrete tools named in the write-up — never inferred, only what's explicitly stated. */
  tools?: string[];
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

    return {
      slug,
      frontmatter: data as ProjectFrontmatter,
      content,
    };
  });

  return projects.sort((a, b) => (a.frontmatter.order ?? 99) - (b.frontmatter.order ?? 99));
}
