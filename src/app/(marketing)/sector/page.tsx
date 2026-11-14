import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { PageHero } from "@/components/marketing/page-hero";
import { PageTransition } from "@/components/marketing/page-transition";
import { Reveal } from "@/components/marketing/reveal";
import { boardScopes } from "@/data/boards";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: `行业板块热力图大全：银行、电子、医药、白酒 | ${siteConfig.name}`,
  description:
    "按一级行业浏览 A 股板块热力图：银行、电子、医药生物、食品饮料、电力设备、计算机、汽车、非银金融，每个板块一张可交互热力图，聚焦板块内部的个股涨跌分布。",
  alternates: {
    canonical: "/sector",
  },
  openGraph: {
    title: "行业板块热力图大全 | A 股市场热力图",
    description: "银行、电子、医药、白酒…… 每个一级行业一张可交互的板块热力图。",
    url: "/sector",
    images: [{ url: siteConfig.ogImage, width: 1200, height: 630 }],
  },
};

export default function SectorIndexPage() {
  return (
    <PageTransition>
      <PageHero
        eyebrow="SECTORS"
        title="行业板块热力图大全"
        description="从全市场下钻到单个一级行业：每个板块一张可交互热力图，聚焦板块内部的个股涨跌分布与权重结构，点击即可直达。"
        size="lg"
      />

      <div className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 sm:pb-20">
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boardScopes.map((board, index) => (
            <Reveal key={board.slug} delay={(index % 3) * 70} className="h-full">
              <li className="h-full">
                <Link
                  href={`/sector/${board.slug}`}
                  className="marketing-card group flex h-full flex-col rounded-xl border border-border/70 bg-card/60 p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-lg font-semibold tracking-tight">
                      {board.name}
                      <span className="ml-2 text-sm font-normal text-muted-foreground">板块热力图</span>
                    </h2>
                    <span
                      aria-hidden
                      className="shrink-0 rounded-md border border-border/60 bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-muted-foreground uppercase transition-colors group-hover:border-brand/30 group-hover:text-brand"
                    >
                      {board.slug}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-brand">{board.tagline}</p>
                  <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {board.description}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-foreground/80 transition-colors group-hover:text-brand">
                    查看{board.name}板块
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
            想同时对比多个板块？打开
            <Link
              href="/"
              prefetch={false}
              className="mx-1 font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-brand"
            >
              热力图
            </Link>
            用筛选面板勾选板块，或在板块图里双击标题快速聚焦。全部 31 个一级行业都支持筛选与下钻。
          </div>
        </Reveal>
      </div>
    </PageTransition>
  );
}
