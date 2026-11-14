import type { Metadata } from "next";
import { ArrowUpRight, Coffee, Globe, Heart, Mail, Megaphone, Sparkles, Star, type LucideIcon } from "lucide-react";

import { ButtonLink } from "@/components/marketing/button-link";
import { JsonLd } from "@/components/marketing/json-ld";
import { PageTransition } from "@/components/marketing/page-transition";
import { Reveal } from "@/components/marketing/reveal";
import { RewardQr } from "@/components/marketing/reward-qr";
import { SupporterAvatar } from "@/components/marketing/supporter-avatar";
import supporters from "@/lib/data/supporters.json";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: `赞助与致谢：请作者喝杯咖啡 | ${siteConfig.name}`,
  description:
    "A 股市场热力图永久免费、开源、无广告。如果它对你的复盘有过帮助，欢迎通过 GitHub Sponsors 或微信赞赏码请作者喝杯咖啡——所有支持者都会出现在致谢名单里。",
  alternates: {
    canonical: "/sponsors",
  },
  openGraph: {
    title: `赞助与致谢 | ${siteConfig.name}`,
    description: "永久免费、开源、无广告。你的每一杯咖啡，都是持续维护的动力。",
    url: "/sponsors",
    images: [{ url: siteConfig.ogImage, width: 1200, height: 630 }],
  },
  twitter: {
    title: `赞助与致谢 | ${siteConfig.name}`,
    description: "永久免费、开源、无广告。你的每一杯咖啡，都是持续维护的动力。",
    images: [siteConfig.ogImage],
  },
};

const promises = ["永久免费", "没有广告", "无需注册", "开源可自部署"];

const usageItems = [
  {
    icon: Heart,
    title: "日常维护",
    description: "行情源波动的应急修复、每个工作日的股票名册校验、依赖升级与兼容，都是看不见但离不开的活。",
  },
  {
    icon: Sparkles,
    title: "新的功能",
    description: "更顺手的筛选与复盘工具、更流畅的移动端体验——这些都需要下班后和周末的时间。",
  },
  {
    icon: Megaphone,
    title: "教程与内容",
    description: "把使用心得写成教程和博客，让更多人学会用这张图看市场，而不是只用过它。",
  },
];

type FreeSupportItem = {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  external?: boolean;
  action: string;
};

const freeSupportItems: FreeSupportItem[] = [
  {
    icon: Star,
    title: "给个 Star",
    description: "Star 是开源作者最直接的动力来源，也是让更多人发现这个项目的方式。",
    href: siteConfig.repoUrl,
    external: true,
    action: "前往 GitHub",
  },
  {
    icon: Globe,
    title: "分享给朋友",
    description: "把 dapan.app 发给同样看盘的朋友，比任何推广都有效。",
    href: siteConfig.url,
    action: "打开 dapan.app",
  },
  {
    icon: Megaphone,
    title: "提反馈",
    description: "Bug、体验问题、大胆的想法，都是下一步改进的方向。",
    href: `${siteConfig.repoUrl}/issues`,
    external: true,
    action: "提交 Issue",
  },
  {
    icon: Sparkles,
    title: "写下你的用法",
    description: "文章、视频、复盘截图，欢迎发邮件给我，好的内容会出现在博客里。",
    href: `mailto:${siteConfig.author.email}?subject=${encodeURIComponent("分享我的热力图用法")}`,
    action: "发邮件聊聊",
  },
];

type Supporter = {
  name: string;
  url?: string;
  icon?: string;
};

export default function SponsorsPage() {
  const supporterList: Supporter[] = supporters;

  return (
    <PageTransition>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: `赞助与致谢 | ${siteConfig.name}`,
          url: `${siteConfig.url}/sponsors`,
          description:
            "A 股市场热力图永久免费、开源、无广告。欢迎通过 GitHub Sponsors 或微信赞赏码支持作者。",
          author: {
            "@type": "Person",
            name: siteConfig.author.name,
            url: siteConfig.author.github,
          },
        }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="marketing-grid-bg absolute inset-0" />
        <div aria-hidden className="marketing-glow-warm absolute inset-0" />
        <div className="relative mx-auto w-full max-w-3xl px-4 pt-16 pb-10 text-center sm:px-6 sm:pt-24 sm:pb-14">
          <p className="marketing-fade-up inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/60 px-3.5 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
            <Heart className="heart-beat size-3.5 text-brand" aria-hidden />
            SUPPORT · 一杯咖啡的时间
          </p>
          <h1
            className="marketing-fade-up mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-5xl"
            style={{ animationDelay: "80ms" }}
          >
            请作者喝杯咖啡
          </h1>
          <p
            className="marketing-fade-up mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg"
            style={{ animationDelay: "160ms" }}
          >
            这张热力图免费、开源、没有广告，也不需要注册。如果它曾在某个收盘后帮你看清过市场，
            欢迎请作者喝杯咖啡——不方便也没关系，图照常用。
          </p>
          <ul
            className="marketing-fade-up mt-8 flex flex-wrap items-center justify-center gap-2"
            style={{ animationDelay: "240ms" }}
          >
            {promises.map((promise) => (
              <li
                key={promise}
                className="rounded-full border border-border/60 bg-card/50 px-3 py-1 text-xs text-muted-foreground"
              >
                {promise}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Support channels */}
      <section
        aria-labelledby="channels-heading"
        className="mx-auto mt-16 w-full max-w-4xl px-4 sm:px-6"
      >
        <Reveal>
          <h2 id="channels-heading" className="text-center text-xl font-semibold tracking-tight sm:text-2xl">
            两种支持方式
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            支持完全自愿，金额随意，不影响任何功能。
          </p>
        </Reveal>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Reveal>
            <a
              href={siteConfig.sponsorsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="marketing-card group flex h-full flex-col rounded-2xl border border-border/70 bg-card/60 p-6 sm:p-7"
            >
              <span className="inline-flex size-11 items-center justify-center rounded-xl border border-border/60 bg-muted/50">
                <Heart className="heart-beat size-5 text-brand" aria-hidden />
              </span>
              <h3 className="mt-5 text-lg font-semibold">GitHub Sponsors</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                支持信用卡与 PayPal，可以一次性赞助，也可以按月订阅。适合海外朋友和习惯用
                GitHub 的开发者。
              </p>
              <span className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition-colors group-hover:bg-brand/90">
                <Heart className="size-4" aria-hidden />
                前往 GitHub Sponsors
              </span>
            </a>
          </Reveal>

          <Reveal delay={80}>
            <div className="flex h-full flex-col rounded-2xl border border-border/70 bg-card/60 p-6 sm:p-7">
              <div className="flex flex-1 gap-5">
                <div className="flex-1">
                  <span className="inline-flex size-11 items-center justify-center rounded-xl border border-border/60 bg-muted/50">
                    <Coffee className="size-5 text-brand" aria-hidden />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold">微信赞赏码</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    用微信扫一扫右侧二维码，请作者喝杯咖啡，金额随意。
                    赞赏过的朋友可以登记到下方致谢名单。
                  </p>
                </div>
                <div className="flex items-center">
                  <RewardQr />
                </div>
              </div>
              <p className="mt-5 text-xs text-muted-foreground sm:hidden">点击二维码可放大查看。</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Where support goes */}
      <section
        aria-labelledby="usage-heading"
        className="mx-auto mt-16 w-full max-w-4xl px-4 sm:px-6"
      >
        <Reveal>
          <h2 id="usage-heading" className="text-xl font-semibold tracking-tight sm:text-2xl">
            咖啡会花在哪里
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            说实话，它换不来服务器——但每一杯都会变成继续维护的动力。
          </p>
        </Reveal>
        <ul className="mt-6 grid gap-4 sm:grid-cols-3">
          {usageItems.map((item, index) => (
            <Reveal key={item.title} delay={index * 70} className="h-full">
              <li className="marketing-card group h-full rounded-xl border border-border/70 bg-card/60 p-5">
                <span className="inline-flex size-9 items-center justify-center rounded-lg border border-border/60 bg-muted/50 transition-colors duration-300 group-hover:border-brand/30 group-hover:bg-brand/10">
                  <item.icon className="size-4.5 text-brand" aria-hidden />
                </span>
                <h3 className="mt-4 text-[15px] font-semibold">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
              </li>
            </Reveal>
          ))}
        </ul>
      </section>

      {/* Supporters wall */}
      <section
        aria-labelledby="supporters-heading"
        className="mx-auto mt-16 w-full max-w-4xl px-4 sm:px-6"
      >
        <Reveal>
          <h2 id="supporters-heading" className="text-xl font-semibold tracking-tight sm:text-2xl">
            致谢名单
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            感谢每一位朋友的支持（排名不分先后）。你们的鼓励，就是这张图还会继续变好的原因。
          </p>
        </Reveal>
        <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {supporterList.map((supporter, index) => (
            <Reveal key={supporter.name} delay={Math.min(index, 4) * 60}>
              <li
                className={cn(
                  "marketing-card flex items-center gap-3.5 rounded-xl border border-border/70 bg-card/60 px-5 py-4",
                  !supporter.url && "justify-start",
                )}
              >
                <SupporterAvatar name={supporter.name} url={supporter.url} icon={supporter.icon} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{supporter.name}</p>
                  {supporter.url ? (
                    <a
                      href={supporter.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-brand"
                    >
                      访问站点
                      <ArrowUpRight className="size-3" aria-hidden />
                    </a>
                  ) : (
                    <p className="mt-0.5 text-xs text-muted-foreground">支持者</p>
                  )}
                </div>
                <Heart className="size-4 shrink-0 text-brand/40" aria-hidden />
              </li>
            </Reveal>
          ))}
        </ul>
        <Reveal className="mt-4">
          <div className="rounded-xl border border-dashed border-border/70 bg-card/40 px-5 py-4 text-sm leading-relaxed text-muted-foreground">
            想出现在这里？任意金额赞赏后，
            <a
              href={`mailto:${siteConfig.author.email}?subject=${encodeURIComponent("支持者登记")}`}
              className="font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-brand"
            >
              发邮件告诉我
            </a>
            ，可以附上你的名字和站点链接，我会尽快把友链加进来。
          </div>
        </Reveal>
      </section>

      {/* Free support */}
      <section
        aria-labelledby="free-support-heading"
        className="mx-auto mt-16 w-full max-w-4xl px-4 sm:px-6"
      >
        <Reveal>
          <h2 id="free-support-heading" className="text-xl font-semibold tracking-tight sm:text-2xl">
            不花钱，也一样是支持
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            开源项目的生命力从来不只靠钱，下面这些同样珍贵。
          </p>
        </Reveal>
        <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {freeSupportItems.map((item, index) => {
            const card = (
              <>
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/50 transition-colors duration-300 group-hover:border-brand/30 group-hover:bg-brand/10 group-hover:text-brand">
                  <item.icon className="size-4.5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[15px] font-semibold">{item.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 self-center text-xs font-medium text-brand">
                  {item.action}
                  <ArrowUpRight className="size-3.5" aria-hidden />
                </span>
              </>
            );
            return (
              <Reveal key={item.title} delay={(index % 2) * 70} className="h-full">
                <li className="h-full">
                  <a
                    href={item.href}
                    {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="marketing-card group flex h-full items-center gap-3.5 rounded-xl border border-border/70 bg-card/60 p-4 sm:p-5"
                  >
                    {card}
                  </a>
                </li>
              </Reveal>
            );
          })}
        </ul>
      </section>

      {/* Final thanks */}
      <section aria-labelledby="thanks-heading" className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
        <Reveal>
          <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/60 px-6 py-12 text-center sm:px-12">
            <div aria-hidden className="marketing-glow-warm absolute inset-0" />
            <div className="relative">
              <h2 id="thanks-heading" className="text-xl font-semibold tracking-tight sm:text-2xl">
                不管是否支持，都谢谢你
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
                谢谢你用这张图看市场。每一次打开、每一次分享，都是这个项目存在的意义。
              </p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <ButtonLink href="/" prefetch={false} className="h-10 px-5 text-[15px]">
                  打开热力图
                </ButtonLink>
                <a
                  href={`mailto:${siteConfig.author.email}`}
                  className="inline-flex h-10 items-center gap-1.5 px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Mail className="size-4" aria-hidden />
                  或者只是打个招呼
                </a>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </PageTransition>
  );
}
