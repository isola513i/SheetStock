import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  headers: async () => [
    {
      source: '/_next/static/:path*',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
      ],
    },
    {
      source: '/icons/:path*',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=86400' },
      ],
    },
    {
      source: '/api/inventory/stream',
      headers: [
        { key: 'Cache-Control', value: 'no-cache, no-transform' },
        { key: 'X-Accel-Buffering', value: 'no' },
      ],
    },
    {
      source: '/api/:path*',
      headers: [
        { key: 'Cache-Control', value: 'private, no-cache, no-store' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
      ],
    },
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'drive.google.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 's3.amazonaws.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.openfoodfacts.org',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.openbeautyfacts.org',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.appsheet.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'appsheet.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  allowedDevOrigins: ['ais-dev-mn33coyyccwqvarzdzrq55-820762866280.asia-southeast1.run.app'],
  output: 'standalone',
  transpilePackages: ['motion'],
  webpack: (config, {dev}) => {
    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    return config;
  },
};

export default nextConfig;
