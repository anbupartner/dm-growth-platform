import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // data/benchmarks/*.json is read at runtime with plain fs calls (not
  // `import`), so Next's dependency tracing can't see it and would
  // otherwise leave it out of the deployed serverless function bundle —
  // that's the "data/ folder missing on Netlify" half of the DB self-heal
  // silently no-op'ing in production. This forces it to be included.
  outputFileTracingIncludes: {
    "/api/**": ["./data/**"],
  },
};

export default nextConfig;
