/** @type {import('next').NextConfig} */
const path = require("path");

const isPages = process.env.GITHUB_PAGES === "true";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:8000";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname),
  ...(isPages
    ? {
        output: "export",
        basePath,
        assetPrefix: basePath,
        images: { unoptimized: true },
        trailingSlash: true,
      }
    : {}),
};

if (!isPages) {
  nextConfig.rewrites = async () => [
    {
      source: "/api/backend/:path*",
      destination: `${backendUrl}/:path*`,
    },
  ];
}

module.exports = nextConfig;
