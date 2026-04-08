import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SheetStock Inventory',
    short_name: 'SheetStock',
    description: 'Inventory app for warehouse and sales teams',
    id: '/',
    scope: '/',
    lang: 'th',
    orientation: 'portrait',
    start_url: '/',
    display: 'standalone',
    background_color: '#F2F2F7',
    theme_color: '#f99109',
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
