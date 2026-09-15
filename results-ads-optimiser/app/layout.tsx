import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Optimiser | Google Ads optimisation for agencies',
  description: 'Agency-first Google Ads optimisation with prioritised improvements, monitoring and one-click workflows.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en-AU"><body>{children}</body></html>;
}
