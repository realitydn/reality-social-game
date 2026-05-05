import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // R2 custom domain for user-uploaded avatars (enable when R2 is provisioned)
      // { protocol: "https", hostname: "images.realitydn.com" },
    ],
  },
};

export default withNextIntl(nextConfig);
