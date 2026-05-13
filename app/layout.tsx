import type {Metadata, Viewport} from 'next';
import './globals.css'; // Global styles
import {PwaRegister} from './pwa-register';
import {ToastProvider} from '@/components/ui/toast';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'SheetStock',
  description: 'Mobile inventory dashboard powered by Google Sheets',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SheetStock',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: '/icons/favicon.svg',
    shortcut: '/icons/favicon.svg',
    apple: [
      { url: '/icons/icon-152x152.png', sizes: '152x152' },
      { url: '/icons/icon-192x192.png', sizes: '192x192' },
    ],
  },
  openGraph: {
    title: 'SheetStock',
    description: 'ระบบจัดการสต็อกสินค้าผ่าน Google Sheets',
    siteName: 'SheetStock',
    images: [{ url: '/icons/icon-512x512.png', width: 512, height: 512 }],
    type: 'website',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#f99109',
  viewportFit: 'cover',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  const shouldEnablePwa = process.env.NODE_ENV === 'production';

  return (
    <html lang="th" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {shouldEnablePwa ? <PwaRegister /> : null}
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
