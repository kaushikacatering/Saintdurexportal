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
}

module.exports = nextConfig
