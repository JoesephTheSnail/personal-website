import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

// Scratch previews for local work only. They are noindex, and on Vercel (where VERCEL is set)
// they 404 so they never ship to the live site.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function DevPreviewLayout({ children }: { children: React.ReactNode }) {
  if (process.env.VERCEL) notFound();
  return children;
}
