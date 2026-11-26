import type { Metadata, Viewport } from 'next';
import { Instrument_Sans } from 'next/font/google';
import './globals.css';
import SiteWrapper from '@/components/SiteWrapper';
import { LINKS } from '@/lib/links';
import CustomCursor from '@/components/CustomCursor';
import AccessibilityMenu from '@/components/AccessibilityMenu';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

// The site's single typeface. Hierarchy comes from size, weight and tracking
// rather than from pairing two families.
const sans = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
});

// Colours the phone's browser bar to match the page and tells browsers the site is dark.
export const viewport: Viewport = {
  themeColor: '#121211',
  colorScheme: 'dark',
};

export const metadata: Metadata = {
  metadataBase: new URL('https://arnavchandra.com'),
  title: {
    default: 'Arnav Chandra | Writer, Student & Builder in Toronto',
    template: '%s | Arnav Chandra',
  },
  description: 'Arnav Chandra is a Toronto-based writer, student, and builder working on health and technology.',
  alternates: {
    canonical: 'https://arnavchandra.com',
    types: { 'application/rss+xml': [{ url: '/feed.xml', title: 'Arnav Chandra: projects' }] },
  },
  verification: {
    google: 'ocP8iI0FKeqb7YIA9l5V4VuVT7XtnyL6_zW6So3njV0',
  },
  openGraph: {
    title: 'Arnav Chandra | Writer, Student & Builder in Toronto',
    description: 'Writer, student, and builder working on health and technology.',
    siteName: 'Arnav Chandra',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Arnav Chandra' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Arnav Chandra | Writer, Student & Builder in Toronto',
    description: 'Writer, student, and builder working on health and technology.',
    images: ['/opengraph-image'],
  },
};

const personJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: 'Arnav Chandra',
  url: 'https://arnavchandra.com',
  image: 'https://arnavchandra.com/arnav-chandra.jpg',
  jobTitle: 'Writer, student, and builder',
  description: 'Writer, student, and builder based in Toronto.',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Toronto',
    addressRegion: 'Ontario',
    addressCountry: 'CA',
  },
  sameAs: [
    LINKS.substack,
    LINKS.medium,
    LINKS.linkedin,
    LINKS.tiktok,
  ],
};

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Arnav Chandra',
  url: 'https://arnavchandra.com',
  inLanguage: 'en',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable}`} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="bg-[var(--bg)] text-[var(--fg)] font-sans" suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <CustomCursor />
        {/* After SiteWrapper, not before — the skip-link inside it must be
            the very first Tab stop on the page, and DOM order is what
            determines that for elements with no explicit tabindex. */}
        <SiteWrapper>{children}</SiteWrapper>
        <AccessibilityMenu />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
