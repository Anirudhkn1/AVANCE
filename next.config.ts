import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb", // school timetable / announcement uploads are capped at 5MB
    },
    // Reuse a page visited in the last 30s on Back / return visits instead of
    // another round trip — matters on slow connections. Safe because every
    // mutating server action calls revalidatePath/redirect, which clears this
    // cache, so your own changes always show immediately.
    staleTimes: {
      dynamic: 30,
    },
  },
};

export default nextConfig;
