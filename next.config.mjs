// next.config.mjs
import createNextIntlPlugin from "next-intl/plugin";
import nextra from "nextra";

const withNextIntl = createNextIntlPlugin();
const withNextra = nextra({
  theme: "nextra-theme-docs",
  themeConfig: "./theme.config.tsx",
});

const nextConfig = {
  output: "standalone",               // optional but recommended on small VPS
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  eslint: { ignoreDuringBuilds: true },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/en",
        permanent: false,
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "api.lorem.space" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "a0.muscache.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "i.pravatar.cc" },
    ],
  },
};

export default withNextIntl(withNextra(nextConfig));
