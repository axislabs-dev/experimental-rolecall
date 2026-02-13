import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@jobflow/database', '@jobflow/shared'],
};

export default nextConfig;
