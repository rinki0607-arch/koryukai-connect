/** @type {import('next').NextConfig} */
const nextConfig = {
  // next.config.js と next.config.mjs の両方が存在していたため、
  // どちらが読み込まれても同じ設定になるよう内容を揃えてある(下の next.config.js 参照)。
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
