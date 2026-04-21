/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',

  

  trailingSlash: false,
  experimental: {
    optimizePackageImports: ['lucide-react', '@tanstack/react-query'],
  },

  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },

  images: {
    domains: [
      'localhost',
      'via.placeholder.com',
      'caterly-uploads-unique-id.s3.ap-southeast-2.amazonaws.com',
    ],
    remotePatterns: [
      { protocol: 'https', hostname: '*.s3.ap-southeast-2.amazonaws.com' },
      { protocol: 'https', hostname: '*.s3.amazonaws.com' },
      {
        protocol: 'https',
        hostname: 'caterly-uploads-unique-id.s3.ap-southeast-2.amazonaws.com',
      },
    ],
  },

  // Prevent Engintron/Nginx from caching dynamic pages
  async headers() {
    return [
      {
        source: '/shop/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
      {
        source: '/shop',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
    ];
  },
}

module.exports = nextConfig
