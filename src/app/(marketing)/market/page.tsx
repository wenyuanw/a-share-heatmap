import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { PageHeader } from "@/components/marketing/page-header";
import { Reveal } from "@/components/marketing/reveal";
import { marketScopes } from "@/data/markets";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: `市场热力图大全：沪深 300、中证 A50、创业板、科创板 | ${siteConfig.name}`,
  description:
    "按市场范围浏览 A 股热力图：沪深 300、中证 A50、中证 A500、上证 A 股、深证 A 股、A 股主板、创业板、科创板大盘云图，点击即可直接查看对应的可交互热力图。",
  alternates: {
    canonical: "/market",
  },
  openGraph: {
    title: `市场热力图大全 | ${siteConfig.name}`,
    description: "沪深 300、中证 A50、中证 A500、创业板、科创板…… 每个市场范围一张可交互的大盘云图。",
    url: "/market",
    images: [{ url: siteConfig.ogImage, width: 1200, height: 630 }],
  },
};

export default function MarketIndexPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <PageHeader
        eyebrow="MARKETS"
        title="市场热力图大全"
        description="同一个热力图引擎，不同的观察口径。选择一个市场范围，直接查看对应的可交互大盘云图，无需注册、无需安装。"
      />

      <ul className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {marketScopes.map((scope, index) => (
          <Reveal key={scope.slug} delay={(index % 3) * 70} className="h-full">
            <li className="h-full">
              <Link
                href={`/market/${scope.slug}`}
                className="marketing-card group flex h-full flex-col rounded-xl border border-border/70 bg-card/60 p-5"
              >
                <h2 className="text-lg font-semibold tracking-tight">
                  {scope.name}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">热力图</span>
                </h2>
                <p className="mt-1 text-sm text-brand">{scope.tagline}</p>
                <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {scope.description}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-foreground/80 transition-colors group-hover:text-brand">
                  查看{scope.name}热力图
                  <ArrowRight
                    className="size-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </span>
              </Link>
            </li>
          </Reveal>
        ))}
      </ul>

      <Reveal className="mt-10">
        <div className="rounded-xl border border-border/70 bg-card/60 px-5 py-4 text-sm text-muted-foreground">
          除了固定范围，你还可以在
          <Link
            href="/"
            prefetch={false}
            className="mx-1 font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-brand"
          >
            热力图
          </Link>
          中创建个人自选股热力图，或阅读
          <Link
            href="/guide"
            className="mx-1 font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-brand"
          >
            使用教程
          </Link>
          了解全部玩法。
        </div>
      </Reveal>
    </div>
  );
}
