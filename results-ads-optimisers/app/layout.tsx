import './globals.css';
import './auth.css';
import './opteo.css';
import type { Metadata } from 'next';
import { MarketingAuthLinks } from '@/components/MarketingAuthLinks';

export const metadata: Metadata = {
  title: 'Pilot Ads | Google Ads optimisation for agencies',
  description: 'Pilot Ads helps agencies find Google Ads opportunities, monitor performance and turn account data into prioritised actions.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en-AU"><body><MarketingAuthLinks />{children}</body></html>;
}
