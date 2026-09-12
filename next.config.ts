import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Vehicle document uploads are sent as base64 data URIs through a
    // server action for this mock-storage demo (see lib/actions/vehicles.ts),
    // which inflates file size ~33% - raise the default 1mb limit to fit.
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
