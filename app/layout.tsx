import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const title = "七夕オンライン短冊";
const description = "みんなで短冊を書いて笹に飾ろう";

// next/font/google の Yuji_Boku は "japanese" サブセットに対応していないため
// (latin/latin-ext/cyrillicのみ)、日本語グリフを読み込むためにGoogle Fonts
// のスタイルシートを直接読み込む方式にしている。
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  openGraph: {
    title,
    description,
    url: siteUrl,
    siteName: title,
    images: [{ url: "/ogp.png", width: 501, height: 532 }],
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/ogp.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* ルートlayoutに置いているため全ページに適用される(ルールはPages Routerの_document.js向けの誤検知) */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Yuji+Boku&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
