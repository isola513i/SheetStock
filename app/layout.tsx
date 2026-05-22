import type {Metadata, Viewport} from 'next';
import {headers} from 'next/headers';
import './globals.css'; // Global styles
import {PwaRegister} from './pwa-register';
import {ToastProvider} from '@/components/ui/toast';

async function resolveSiteUrl() {
  const envSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (envSiteUrl) return envSiteUrl;

  const requestHeaders = await headers();
  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host');
  const protocol = requestHeaders.get('x-forwarded-proto') ?? 'https';
  if (host) return `${protocol}://${host}`;

  return 'http://localhost:3000';
}

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = await resolveSiteUrl();

  return {
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
    twitter: {
      card: 'summary_large_image',
      title: 'SheetStock',
      description: 'ระบบจัดการสต็อกสินค้าผ่าน Google Sheets',
      images: ['/icons/icon-512x512.png'],
    },
    other: {
      'mobile-web-app-capable': 'yes',
    },
  };
}

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
