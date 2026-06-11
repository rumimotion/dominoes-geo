import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'დომინო — ქართული ეზოს თამაში',
  description: 'ქართული მულტიპლეიერ დომინო. 2 vs 2, ჩოთქი, 355 ქულა.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#1a3320',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ka">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
