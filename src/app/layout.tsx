import type { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';
import './globals.css';
import SiteWrapper from '@/components/SiteWrapper';
import CustomCursor from '@/components/CustomCursor';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-poppins',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://arnavchandra.com'),
  title: {
    default: 'Arnav Chandra — Writer, Student & Builder in Toronto',
    template: '%s — Arnav Chandra',
  },
  description: 'Arnav Chandra is a Toronto-based writer, student, and builder working at the intersection of health and technology.',
  alternates: {
    canonical: 'https://arnavchandra.com',
  },
  openGraph: {
    title: 'Arnav Chandra — Writer, Student & Builder in Toronto',
    description: 'Writer, student, and builder working at the intersection of health and technology.',
    siteName: 'Arnav Chandra',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Arnav Chandra' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Arnav Chandra — Writer, Student & Builder in Toronto',
    description: 'Writer, student, and builder working at the intersection of health and technology.',
    images: ['/opengraph-image'],
  },
};

const personJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: 'Arnav Chandra',
  url: 'https://arnavchandra.com',
  image: 'https://arnavchandra.com/profile.jpg',
  jobTitle: 'Writer, student, and builder',
  description: 'Writer, student, and builder based in Toronto.',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Toronto',
    addressRegion: 'Ontario',
    addressCountry: 'CA',
  },
  sameAs: [
    'https://arnav01.substack.com/',
    'https://medium.com/@arnav0',
    'https://www.tiktok.com/@arnav.gym',
    'https://www.linkedin.com/in/arnav-chandra-b33660293/',
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="bg-[#0D0D0D] text-white font-sans" suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
        <CustomCursor />
        <SiteWrapper>{children}</SiteWrapper>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
