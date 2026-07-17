/** @type {import('next').NextConfig} */
// Static export: the whole app is client-rendered over a committed data snapshot,
// so it builds to plain files in out/ and can be hosted anywhere (Vercel, GitHub
// Pages, Cloudflare, a plain file server). Set NEXT_PUBLIC_BASE_PATH when hosting
// under a sub-path, e.g. "/gridsight" for a GitHub project page.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig = {
  output: "export",
  reactStrictMode: true,
  images: { unoptimized: true },
  basePath,
  assetPrefix: basePath || undefined,
  trailingSlash: true,
};

export default nextConfig;
