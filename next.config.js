/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    return [
      {
        source: "/api/backend/:path*",
        destination: `${apiUrl}/:path*`,
      },
      {
        source: "/api/selfclaw/:path*",
        destination: "https://selfclaw.ai/api/selfclaw/:path*",
      },
    ];
  },
};

module.exports = nextConfig;
