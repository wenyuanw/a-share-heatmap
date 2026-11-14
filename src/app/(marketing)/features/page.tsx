import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarRange,
  Camera,
  ChartColumn,
  ChartLine,
  Globe,
  LayoutGrid,
  Layers,
  ListFilter,
  MousePointer2,
  Palette,
  Rocket,
  ScanLine,
  Sparkles,
  Star,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { ButtonLink } from "@/components/marketing/button-link";
import { FeatureCarousel } from "@/components/marketing/feature-carousel";
import { JsonLd } from "@/components/marketing/json-ld";
import { PageTransition } from "@/components/marketing/page-transition";
import { ProductPreview } from "@/components/marketing/product-preview";
import { Reveal } from "@/components/marketing/reveal";
import { GitHubMark } from "@/components/heatmap/github-mark";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: `功能介绍：自选股、板块筛选与多周期行情 | ${siteConfig.name}`,
  description:
    "A 股市场热力图（A 股大盘云图 / Treemap）功能一览：全市场云图、多市场范围、自选热力图、板块筛选、多周期表现、截图分享、WebMCP 实验支持，开源免费并支持一键部署。",
  alternates: {
    canonical: "/features",
  },
  openGraph: {
    title: `功能介绍：自选股、板块筛选与多周期行情 | ${siteConfig.name}`,
    description:
      "全市场云图、自选热力图、板块筛选、多周期表现…… 了解这张 A 股热力图的全部能力。",
    url: "/features",
    images: [{ url: siteConfig.ogImage, width: 1200, height: 630 }],
  },
  twitter: {
    title: `功能介绍：自选股、板块筛选与多周期行情 | ${siteConfig.name}`,
    description: "全市场云图、自选热力图、板块筛选、多周期表现…… 了解这张 A 股热力图的全部能力。",
    images: [siteConfig.ogImage],
  },
};

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.url,
  },
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: siteConfig.name,
    url: `${siteConfig.url}/features`,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    description:
      "开源免费的 A 股大盘云图：按行业与流通市值权重绘制可交互热力图，支持多市场范围、自选股、板块筛选与多周期表现。",
    offers: { "@type": "Offer", price: "0", priceCurrency: "CNY" },
    author: {
      "@type": "Person",
      name: siteConfig.author.name,
      url: siteConfig.author.github,
    },
  },
];

const heroKeywords = [
  "A股热力图",
  "大盘云图",
  "Treemap 矩形树图",
  "板块热力图",
  "行业板块轮动",
  "A 股全图",
  "沪深 300",
  "中证 A500",
];

type Feature = {
  icon: LucideIcon;
  title: string;
  description: string;
  /** When set, the card links to this path. */
  href?: string;
  hrefLabel?: string;
};

const features: Feature[] = [
  {
    icon: LayoutGrid,
    title: "全市场云图",
    description: "按行业与流通市值权重绘制矩形树图，色块越大代表市场权重越高，一眼看清结构。",
  },
  {
    icon: Palette,
    title: "涨跌一眼可见",
    description: "红涨绿跌配色映射个股涨跌幅，底部图例帮助快速判断行情强弱，配色主题可自定义。",
  },
  {
    icon: Layers,
    title: "多市场范围",
    description: "A 股全图、上证、深证、沪深 300、中证 A50、中证 A500、主板、创业板、科创板自由切换。",
    href: "/market",
    hrefLabel: "查看全部市场",
  },
  {
    icon: Star,
    title: "自选热力图",
    description: "按名称或代码添加关注列表，生成个人自选股热力图，列表保存在本地浏览器。",
  },
  {
    icon: ListFilter,
    title: "一级板块筛选",
    description: "在任意市场范围内聚焦单个一级行业板块，下钻查看板块内部的个股热力分布。",
  },
  {
    icon: CalendarRange,
    title: "多周期表现",
    description: "当日、近 5 日、近 20 日、今年以来多个涨跌区间切换，从盯盘到复盘全覆盖。",
  },
  {
    icon: MousePointer2,
    title: "交互式看盘",
    description: "滚轮缩放、拖拽平移、悬浮查看个股详情、双击跳转雪球，几千只股票依然流畅。",
  },
  {
    icon: ChartColumn,
    title: "市场概览面板",
    description: "上涨、平盘、下跌家数与成交额、量能变化同步呈现，切换板块后自动重算统计。",
  },
  {
    icon: Camera,
    title: "截图分享",
    description: "一键生成热力图快照，支持下载、复制图片与系统分享，复盘观点随图传播。",
  },
  {
    icon: Sparkles,
    title: "WebMCP 实验",
    description: "浏览器 AI 可直接读取市场状态、切换视图、查询排行与管理自选股。",
  },
  {
    icon: ScanLine,
    title: "AI 识股入自选",
    description: "截图识别股票名单：浏览器直连视觉模型，从榜单截图批量识别并加入自选。",
  },
  {
    icon: Rocket,
    title: "部署友好",
    description: "Next.js API Routes 获取行情快照，无需配置环境变量，一键部署到 Vercel。",
  },
];

type Scenario = {
  icon: LucideIcon;
  title: string;
  description: string;
};

const scenarios: Scenario[] = [
  {
    icon: ChartLine,
    title: "盘前盘后复盘",
    description: "盘中随手打开，几秒钟看清当下的市场情绪、涨跌结构与板块轮动。",
  },
  {
    icon: LayoutGrid,
    title: "个人投资仪表盘",
    description: "把热力图放进你的投资看板，当日市场全景与自选股表现一屏呈现。",
  },
  {
    icon: Globe,
    title: "财经站点与量化平台",
    description: "轻量的 A 股板块热力图模块，支持从全市场快速下钻到一级行业。",
  },
  {
    icon: Zap,
    title: "Canvas 技术参考",
    description: "开源实现可供学习：几千只股票规模的矩形树图绘制、缩放与拖拽交互。",
  },
];

function FeatureCards({ duplicate = false }: { duplicate?: boolean }) {
  return features.map((feature) => {
    const cardClass =
      "marketing-card group flex h-full min-h-56 flex-col rounded-xl border border-border/70 bg-card/60 p-5";
    const card = (
      <>
        <span className="inline-flex size-9 items-center justify-center rounded-lg border border-border/60 bg-muted/50 text-foreground transition-colors duration-300 group-hover:border-brand/30 group-hover:bg-brand/10 group-hover:text-brand">
          <feature.icon className="size-4.5" aria-hidden />
        </span>
        <h3 className="mt-4 text-[15px] font-semibold">{feature.title}</h3>
        <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">
          {feature.description}
        </p>
        {feature.href ? (
          <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-brand">
            {feature.hrefLabel}
            <ArrowRight
              className="size-3.5 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </span>
        ) : null}
      </>
    );
    return (
      <li key={feature.title} className="w-[min(80vw,320px)] shrink-0 sm:w-[340px]">
        {feature.href ? (
          <Link href={feature.href} tabIndex={duplicate ? -1 : undefined} className={cn(cardClass, "group")}>
            {card}
          </Link>
        ) : (
          <div className={cardClass}>{card}</div>
        )}
      </li>
    );
  });
}

export default function FeaturesPage() {
  return (
    <PageTransition>
      <JsonLd data={jsonLd} />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="marketing-grid-bg absolute inset-0" />
        <div aria-hidden className="marketing-glow absolute inset-0" />
        <div className="relative mx-auto w-full max-w-6xl px-4 pt-16 pb-12 sm:px-6 sm:pt-24 sm:pb-16">
          <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
            <p className="marketing-fade-up inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/60 px-3.5 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
              <span className="size-1.5 rounded-full bg-brand" aria-hidden />
              开源免费 · 支持一键部署到 Vercel
            </p>
            <h1
              className="marketing-fade-up mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl"
              style={{ animationDelay: "80ms" }}
            >
              A 股市场热力图
            </h1>
            <p
              className="marketing-fade-up mt-6 max-w-3xl text-base leading-relaxed text-balance text-muted-foreground sm:text-lg"
              style={{ animationDelay: "160ms" }}
            >
              把整个 A 股市场装进一张可交互的大盘云图：色块大小代表流通市值权重，颜色深浅代表当日涨跌幅，几秒钟看清沪深两市的涨跌结构、行业板块轮动和资金分布。
            </p>
            <div
              className="marketing-fade-up mt-8 flex flex-wrap items-center justify-center gap-3"
              style={{ animationDelay: "240ms" }}
            >
              <ButtonLink href="/" prefetch={false} className="h-10 px-5 text-[15px]">
                打开热力图
              </ButtonLink>
              <ButtonLink
                href={siteConfig.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                variant="outline"
                className="h-10 px-5 text-[15px]"
              >
                <GitHubMark />
                GitHub 仓库
              </ButtonLink>
            </div>
            <ul
              className="marketing-fade-up mt-8 flex flex-wrap items-center justify-center gap-2"
              style={{ animationDelay: "320ms" }}
            >
              {heroKeywords.map((keyword) => (
                <li
                  key={keyword}
                  className="rounded-full border border-border/60 bg-card/50 px-3 py-1 text-xs text-muted-foreground"
                >
                  {keyword}
                </li>
              ))}
            </ul>
          </div>

          {/* Product preview */}
          <div
            className="marketing-fade-up relative mx-auto mt-14"
            style={{ animationDelay: "400ms" }}
          >
            <ProductPreview />
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section aria-labelledby="features-heading" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <Reveal className="max-w-2xl">
          <h2 id="features-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
            为看盘与复盘而生的功能
          </h2>
          <p className="mt-3 text-muted-foreground">
            从全市场到单只股票，从当日异动到全年趋势，每一块能力都围绕「更快看清市场」设计。
          </p>
        </Reveal>
        <FeatureCarousel duplicate={<FeatureCards duplicate />}>
          <FeatureCards />
        </FeatureCarousel>
      </section>

      {/* Scenarios */}
      <section
        aria-labelledby="scenarios-heading"
        className="border-y border-border/60 bg-muted/20"
      >
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <Reveal className="max-w-2xl">
            <h2 id="scenarios-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
              适合这些场景
            </h2>
            <p className="mt-3 text-muted-foreground">
              无论是个人看盘、搭建看板还是嵌入自己的产品，这张热力图都能派上用场。
            </p>
          </Reveal>
          <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {scenarios.map((scenario, index) => (
              <Reveal key={scenario.title} delay={(index % 2) * 70}>
                <li className="marketing-card group flex gap-4 rounded-xl border border-border/70 bg-card/60 p-5">
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/50 transition-colors duration-300 group-hover:border-brand/30 group-hover:bg-brand/10 group-hover:text-brand">
                    <scenario.icon className="size-4.5" aria-hidden />
                  </span>
                  <div>
                    <h3 className="text-[15px] font-semibold">{scenario.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {scenario.description}
                    </p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* Final CTA */}
      <section aria-labelledby="cta-heading" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <Reveal>
          <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/60 px-6 py-12 text-center sm:px-12 sm:py-16">
            <div aria-hidden className="marketing-glow absolute inset-0" />
            <div className="relative">
              <h2 id="cta-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
                现在就打开，看看今天的市场
              </h2>
              <p className="mx-auto mt-3 max-w-2xl leading-relaxed text-balance text-muted-foreground">
                无需注册、无需安装，打开浏览器即可使用。觉得有用的话，欢迎给项目点个 Star。
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <ButtonLink href="/" prefetch={false} className="h-10 px-5 text-[15px]">
                  打开热力图
                </ButtonLink>
                <Link
                  href="/whats-new"
                  className="inline-flex h-10 items-center gap-1 px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  看看最近更新了什么
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </PageTransition>
  );
}
