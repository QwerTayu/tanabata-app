import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "七夕オンライン短冊",
  description: "みんなで短冊を書いて笹に飾ろう",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
