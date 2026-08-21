/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Standalone output for lean Docker images later.
  output: 'standalone',
};

export default nextConfig;
