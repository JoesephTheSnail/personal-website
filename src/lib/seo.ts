import type { Metadata } from 'next';

const BASE = 'https://arnavchandra.com';

/**
 * Metadata for a top-level page. A page's own `openGraph` replaces the layout's wholesale, so this
 * restates the share image; without it /books, /projects and /health shared the home page's title.
 */
export function pageMetadata(path: string, title: string, description: string): Metadata {
  const url = `${BASE}${path}`;
  const image = { url: '/opengraph-image', width: 1200, height: 630, alt: 'Arnav Chandra' };
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title: `${title} | Arnav Chandra`, description, url, siteName: 'Arnav Chandra', type: 'website', locale: 'en_US', images: [image] },
    twitter: { card: 'summary_large_image', title: `${title} | Arnav Chandra`, description, images: [image.url] },
  };
}
