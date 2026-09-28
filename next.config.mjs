/** @type {import('next').NextConfig} */
const nextConfig = {
  // Traces a minimal server bundle (only the deps actually used at runtime)
  // into .next/standalone — what the Docker image runs, so it doesn't need
  // the full node_modules copied in.
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "evolutecomsolutions.com" },
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
  experimental: {
    // Default is 1mb — too small for uploading desktop app installers
    // (uploaded here, then relayed to B2). 150mb gives headroom above a
    // ~110MB build.
    serverActions: {
      bodySizeLimit: "150mb",
    },
  },
};

export default nextConfig;
