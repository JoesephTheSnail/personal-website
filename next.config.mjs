/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next 16 auto-writes AGENTS.md/CLAUDE.md into the project root by
  // default — an uninvited addition to a repo that already has its own
  // conventions, so it's opted out here rather than left to accumulate.
  agentRules: false,
  experimental: {
    optimizePackageImports: ['react-icons', 'recharts'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'm.media-amazon.com',
      },
    ],
  },
};

export default nextConfig;
