/** @type {import('next').NextConfig} */
const nextConfig = {
  // Traces a minimal server bundle (only the deps actually used at runtime)
  // into .next/standalone — what the Docker image runs, so it doesn't need
  // the full node_modules copied in.
  output: "standalone",
  // Normally .next. Set NEXT_DIST_DIR (e.g. `.next-build`) to build into a
  // separate folder so `next build` doesn't collide with a running `next dev`
  // server that's holding .next — otherwise the dev server's hot-reload can
  // delete a page's compiled module mid-build ("Cannot find module for page").
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "evolutecomsolutions.com" },
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
};

export default nextConfig;
