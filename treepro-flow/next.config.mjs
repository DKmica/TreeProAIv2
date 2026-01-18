/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevHosts: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
