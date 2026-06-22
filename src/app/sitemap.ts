import type { MetadataRoute } from 'next';
import { getAllProjects } from '@/lib/projects';

const BASE_URL = 'https://arnavchandra.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, changeFrequency: 'monthly', priority: 1.0 },
    { url: `${BASE_URL}/projects`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/books`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/health`, changeFrequency: 'monthly', priority: 0.7 },
  ];

  const projectRoutes: MetadataRoute.Sitemap = getAllProjects().map((project) => ({
    url: `${BASE_URL}/projects/${project.slug}`,
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [...staticRoutes, ...projectRoutes];
}
