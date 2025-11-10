/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@consentire/shared'],
  
  // Production optimizations
  output: 'standalone',
  compress: true,
  poweredByHeader: false,
  
  // Environment variables
  env: {
    API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    METAGRAPH_URL: process.env.NEXT_PUBLIC_METAGRAPH_URL || 'http://localhost:9200',
  },
  
  // Railway deployment optimizations
  experimental: {
    outputFileTracingRoot: undefined,
  },
  
  // Image optimization for Railway
  images: {
    unoptimized: true,
  },
  
  // Headers for security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig
