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
  title: 'Arnav Chandra',
  description: 'Personal website of Arnav Chandra — writer, thinker, builder.',
  alternates: {
    canonical: 'https://arnavchandra.com',
  },
  openGraph: {
    title: 'Arnav Chandra',
    description: 'Writer, student, and builder based in Toronto.',
    siteName: 'Arnav Chandra',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Arnav Chandra' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Arnav Chandra',
    description: 'Writer, student, and builder based in Toronto.',
    images: ['/opengraph-image'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="bg-[#0D0D0D] text-white font-sans" suppressHydrationWarning>
        <CustomCursor />
        <SiteWrapper>{children}</SiteWrapper>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
