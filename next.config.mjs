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
    // Default is 1mb — too small for uploading desktop app installers.
    // The project's Supabase Storage plan caps individual files at ~50MB
    // regardless, so this just makes sure Next itself isn't the bottleneck.
    serverActions: {
      bodySizeLimit: "60mb",
    },
  },
};

export default nextConfig;
