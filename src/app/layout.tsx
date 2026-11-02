import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "sonner";

import "./globals.css";

export const metadata: Metadata = {
  title: "A 股热力图与大盘云图：板块涨跌、自选股与市场全景",
  description: "免费开源的 A 股市场热力图，按行业和流通市值展示个股涨跌，支持沪深 300、中证 A500、创业板等市场切换，以及自选股、板块筛选、多周期表现和截图分享，帮助快速观察市场结构与板块轮动。",
  keywords: ["A 股热力图", "A 股大盘云图", "A股图表", "行情地图", "板块热力图", "A-share heatmap", "A-share market heatmap"],
  metadataBase: new URL("https://dapan.app"),
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
  },
  openGraph: {
    title: "A 股热力图与大盘云图：板块涨跌、自选股与市场全景",
    description: "免费开源的 A 股市场热力图，按行业和流通市值展示个股涨跌，支持沪深 300、中证 A500、创业板等市场切换，以及自选股、板块筛选、多周期表现和截图分享，帮助快速观察市场结构与板块轮动。",
    url: "/",
    siteName: "A 股市场热力图 | A 股大盘云图",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "A 股市场热力图|A 股大盘云图 - 开源免费",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "A 股热力图与大盘云图：板块涨跌、自选股与市场全景",
    description: "免费开源的 A 股市场热力图，按行业和流通市值展示个股涨跌，支持沪深 300、中证 A500、创业板等市场切换，以及自选股、板块筛选、多周期表现和截图分享，帮助快速观察市场结构与板块轮动。",
    images: ["/og-image.png"],
  },
};

const themeInitScript = `
  try {
    const displayMode = window.localStorage.getItem("heatmap-display-mode");
    const isDark = displayMode !== "light";
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  } catch {
    document.documentElement.classList.add("dark");
    document.documentElement.style.colorScheme = "dark";
  }
  try {
    if (window.location.pathname === "/") {
      document.documentElement.classList.add("heatmap-page-active");
    }
  } catch {}
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className="min-h-dvh antialiased dark"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script
          defer
          src="https://vibeloft.ai/telemetry/v1.js"
          data-vl-product-id="8b8a5508-0aeb-4917-83a4-c8d6f5ece702"
          data-vl-auth-key="vl_web.YE4bgecRx9HGPM3CglWnBzMiindBvSnCiLq3EG4SPoc"
        />
      </head>
      <body className="flex min-h-dvh flex-col">
        {children}
        <Toaster richColors position="top-center" />
        <Analytics />
      </body>
    </html>
  );
}
