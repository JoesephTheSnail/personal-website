/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next 16 auto-writes AGENTS.md/CLAUDE.md into the project root by
  // default — an uninvited addition to a repo that already has its own
  // conventions, so it's opted out here rather than left to accumulate.
  agentRules: false,
  // Lets phones/iPads on the home Wi-Fi load the dev server by LAN IP.
  // Next 16 otherwise 403s every /_next/* dev request from a non-localhost origin.
  allowedDevOrigins: ['192.168.*.*'],
  experimental: {
    optimizePackageImports: ['react-icons', 'recharts'],
  },
  // The project and its 3D model used to live under /projects/truck-exhaust-carbon-capture.
  // Permanent redirects keep links that were already shared working.
  async redirects() {
    return [
      {
        source: '/projects/truck-exhaust-carbon-capture',
        destination: '/projects/carbon-capture-model',
        permanent: true,
      },
      {
        source: '/projects/truck-exhaust-carbon-capture/demo',
        destination: '/projects/carbon-capture-model/demo',
        permanent: true,
      },
      // The portrait was renamed from profile.jpg; older share cards and search results still point at it.
      {
        source: '/profile.jpg',
        destination: '/arnav-chandra.jpg',
        permanent: true,
      },
    ];
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
