import type { MetadataRoute } from 'next';

// Lets the site be added to a home screen with the right name, colours and icon.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Arnav Chandra',
    short_name: 'Arnav',
    description: 'Writer, student, and builder working on health and technology.',
    start_url: '/',
    display: 'browser',
    background_color: '#121211',
    theme_color: '#121211',
    icons: [
      { src: '/icon.png', sizes: '192x192', type: 'image/png' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  };
}
