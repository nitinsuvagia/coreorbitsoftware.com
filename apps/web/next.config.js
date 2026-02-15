/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Enable standalone output for Docker (commented out for local development)
  // output: 'standalone',
  
  // Optimize file watching to prevent EMFILE errors
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000, // Check for changes every second
        aggregateTimeout: 300, // Delay rebuild after change
        ignored: [
          '**/node_modules/**',
          '**/.next/**',
          '**/.git/**',
          '**/logs/**',
          '**/coverage/**',
          '**/dist/**',
          '**/.turbo/**',
          '**/build/**',
        ],
      };
      
      // Reduce number of file watchers
      config.snapshot = {
        managedPaths: [],
        buildDependencies: {
          hash: true,
          timestamp: false,
        },
        module: {
          hash: true,
          timestamp: false,
        },
      };
    }
    
    return config;
  },
  
  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },
  
  // Rewrites for API proxy (development)
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const employeeServiceUrl = process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:3002';
    
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${employeeServiceUrl}/uploads/:path*`,
      },
    ];
  },
  
  // Headers for security
  async headers() {
    return [
      {
        source: '/:path*',
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
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
