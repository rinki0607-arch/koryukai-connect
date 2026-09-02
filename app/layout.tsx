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
  themeColor: "#4f46e5",
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
      </head>
      <body className="min-h-screen">
        <NavBar />
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
