import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // Only needed if we switch avatars/photos to next/image. Today they render
      // via plain <img> (see PlayerAvatar / AvatarUpload), so this stays off.
      // Hostname must match the R2 custom domain in wrangler.jsonc / PHOTOS_BASE_URL.
      // { protocol: "https", hostname: "photos.realitydn.com" },
    ],
  },
};

export default withNextIntl(nextConfig);
