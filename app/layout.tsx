import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "ARKIVE",
  description:
    "アーク起業塾の交流会 参加登録・運営データ蓄積・参加者マッチング・QR受付をまとめて管理",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ARKIVE",
  },
};

export const viewport = {
  themeColor: "#10192f",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="icon" href="/icons/icon-192.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;700&family=Noto+Sans+JP:wght@400;500;700&display=swap"
        />
      </head>
      <body className="min-h-screen">
        <NavBar />
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
