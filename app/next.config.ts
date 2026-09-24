import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets several dev servers run side by side (e.g. playtests): NEXT_DIST_DIR=.next-foo
  distDir: process.env.NEXT_DIST_DIR ?? ".next",

  // memo's old routes, so bookmarks from the old app still land somewhere.
  async redirects() {
    return [
      { source: "/grammar", destination: "/gramatica", permanent: true },
      { source: "/grammar/:slug", destination: "/gramatica/:slug", permanent: true },
      { source: "/diary", destination: "/diario", permanent: true },
      { source: "/diary/:day", destination: "/diario/:day", permanent: true },
      { source: "/chat", destination: "/frases/ask", permanent: true },
    ];
  },
};

export default nextConfig;
