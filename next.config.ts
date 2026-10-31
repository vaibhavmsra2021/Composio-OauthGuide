import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
  // Guide JSON and the schema source are read from disk at runtime; make sure they ship.
  outputFileTracingIncludes: {
    "/**": ["./data/guides/**/*", "./lib/schema.ts"],
  },
};

export default nextConfig;
