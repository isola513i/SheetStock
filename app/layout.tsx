import type {Metadata, Viewport} from 'next';
import { Sarabun } from 'next/font/google';
import './globals.css'; // Global styles
import {PwaRegister} from './pwa-register';
import {ToastProvider} from '@/components/ui/toast';

const sarabun = Sarabun({
  subsets: ['thai', 'latin'],
  weight: ['200', '300', '400', '500', '600', '700', '800'],
  variable: '--font-sarabun',
  display: 'swap',
});

export const metadata: Metadata = {
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
      <body suppressHydrationWarning className={sarabun.variable}>
        {shouldEnablePwa ? <PwaRegister /> : null}
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
