import type { MetadataRoute } from 'next';
import { getAllProjects } from '@/lib/projects';
import { CATEGORIES } from '@/lib/categoryMeta';
import { ARCHIVES } from '@/app/health/archive/data';

const BASE_URL = 'https://arnavchandra.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, changeFrequency: 'monthly', priority: 1.0 },
    { url: `${BASE_URL}/projects`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/books`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/health`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/health/archive`, changeFrequency: 'yearly', priority: 0.3 },
  ];

  const projectRoutes: MetadataRoute.Sitemap = getAllProjects().map((project) => ({
    url: `${BASE_URL}/projects/${project.slug}`,
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  // The discipline pages (/projects/creative etc.) are real, indexable pages,
  // but a discipline with no published project 404s (see [slug]/page.tsx),
  // so only list the ones that exist.
  const publishedCategories = new Set(
    getAllProjects().filter((p) => p.frontmatter.status === 'published').map((p) => p.frontmatter.category),
  );
  const categoryRoutes: MetadataRoute.Sitemap = CATEGORIES.filter((c) => publishedCategories.has(c.label)).map((c) => ({
    url: `${BASE_URL}/projects/${c.slug}`,
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  const archiveRoutes: MetadataRoute.Sitemap = ARCHIVES.map((a) => ({
    url: `${BASE_URL}/health/archive/${a.slug}`,
    changeFrequency: 'yearly',
    priority: 0.2,
  }));

  return [...staticRoutes, ...categoryRoutes, ...projectRoutes, ...archiveRoutes];
}
