import type {Metadata, Viewport} from 'next';
import localFont from 'next/font/local';
import './globals.css'; // Global styles
import {PwaRegister} from './pwa-register';

const lineSeedSans = localFont({
  src: [
    {path: './fonts/LINESeedSansTH_A_Th.otf', weight: '200', style: 'normal'},
    {path: './fonts/LINESeedSansTH_A_Rg.otf', weight: '400', style: 'normal'},
    {path: './fonts/LINESeedSansTH_A_He.otf', weight: '600', style: 'normal'},
    {path: './fonts/LINESeedSansTH_A_Bd.otf', weight: '700', style: 'normal'},
    {path: './fonts/LINESeedSansTH_A_XBd.otf', weight: '800', style: 'normal'},
  ],
  variable: '--font-line-seed',
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
    apple: '/icons/icon-192x192.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#f99109',
  viewportFit: 'cover',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  const shouldEnablePwa = process.env.NODE_ENV === 'production';

  return (
    <html lang="en">
      <body suppressHydrationWarning className={lineSeedSans.variable}>
        {shouldEnablePwa ? <PwaRegister /> : null}
        {children}
      </body>
    </html>
  );
}
