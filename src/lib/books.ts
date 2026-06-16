import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const booksDir = path.join(process.cwd(), 'content', 'books');

export interface BookFrontmatter {
  title: string;
  author: string;
  cover: string;
  date: string;
  rating: number;
  slug: string;
  order: number;
  genre?: string[];
  status?: 'reading' | 'read';
}

export interface Book {
  slug: string;
  frontmatter: BookFrontmatter;
  content: string;
}

export function getAllBooks(): Book[] {
  const files = fs.readdirSync(booksDir).filter(
    (f) => f.endsWith('.mdx') && !f.startsWith('_')
  );

  const books = files.map((filename) => {
    const slug = filename.replace('.mdx', '');
    const filePath = path.join(booksDir, filename);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(raw);

    return {
      slug,
      frontmatter: { ...data, slug } as BookFrontmatter,
      content,
    };
  });

  return books.sort((a, b) => (a.frontmatter.order ?? 99) - (b.frontmatter.order ?? 99));
}
