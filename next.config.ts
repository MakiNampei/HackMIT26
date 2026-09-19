import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Codex preview uses 127.0.0.1 while Next.js starts on localhost.
  // Allow both hostnames to share development-only HMR resources.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
