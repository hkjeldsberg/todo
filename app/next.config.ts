import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets several dev servers run side by side (e.g. playtests): NEXT_DIST_DIR=.next-foo
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
};

export default nextConfig;
