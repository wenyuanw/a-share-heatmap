import type { Metadata } from "next";
import { Toaster } from "sonner";

import "./globals.css";

export const metadata: Metadata = {
  title: "A 股市场热力图",
  description: "单页 A 股市场热力图，支持行业权重、涨跌颜色、缩放、平移、全屏与截图分享。",
  keywords: ["A 股热力图", "A 股大盘云图", "行情地图", "板块热力图", "A-share heatmap"],
  metadataBase: new URL("https://map.wenyuanw.me"),
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
  },
  openGraph: {
    title: "A 股市场热力图",
    description: "用一张可交互热力图快速观察 A 股板块轮动与个股涨跌。",
    url: "/",
    siteName: "A 股市场热力图",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "A 股市场热力图 - 开源免费",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "A 股市场热力图",
    description: "用一张可交互热力图快速观察 A 股板块轮动与个股涨跌。",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className="min-h-dvh antialiased dark"
    >
      <body className="flex min-h-dvh flex-col">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
