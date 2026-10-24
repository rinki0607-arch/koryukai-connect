/** @type {import('next').NextConfig} */
const nextConfig = {
  // レスポンスヘッダーを少しでも軽くする(動作に影響なし)。
  poweredByHeader: false,
  images: {
    // next/image を使っている箇所で、対応ブラウザには軽量なAVIF/WebPを優先的に配信する。
    formats: ["image/avif", "image/webp"],
  },
};

module.exports = nextConfig;
