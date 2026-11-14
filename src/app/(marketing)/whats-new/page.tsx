import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { PageHero } from "@/components/marketing/page-hero";
import { PageTransition } from "@/components/marketing/page-transition";
import { Reveal } from "@/components/marketing/reveal";
import { getPosts } from "@/lib/blog";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: `热力图使用心得、复盘方法与功能介绍 | ${siteConfig.name}`,
  description:
    "分享 A 股市场热力图的使用心得与盘后复盘方法，涵盖读图入门、自选股管理、板块观察、自定义配色及 WebMCP 浏览器 AI 功能，结合操作示例帮助你用大盘云图观察市场、整理复盘思路。",
  alternates: {
    canonical: "/whats-new",
  },
  openGraph: {
    title: `热力图使用心得、复盘方法与功能介绍 | ${siteConfig.name}`,
    description: "分享 A 股市场热力图的使用心得与盘后复盘方法，涵盖读图入门、自选股管理、板块观察、自定义配色及 WebMCP 浏览器 AI 功能，结合操作示例帮助你用大盘云图观察市场、整理复盘思路。",
    url: "/whats-new",
    images: [{ url: siteConfig.ogImage, width: 1200, height: 630 }],
  },
  twitter: {
    title: `热力图使用心得、复盘方法与功能介绍 | ${siteConfig.name}`,
    description: "分享 A 股市场热力图的使用心得与盘后复盘方法，涵盖读图入门、自选股管理、板块观察、自定义配色及 WebMCP 浏览器 AI 功能，结合操作示例帮助你用大盘云图观察市场、整理复盘思路。",
    images: [siteConfig.ogImage],
  },
};

function formatDate(date: string) {
  const [year, month, day] = date.split("-");
  return `${year} 年 ${Number(month)} 月 ${Number(day)} 日`;
}

export default async function WhatsNewPage() {
  const posts = await getPosts();

  return (
    <PageTransition>
      <PageHero
        eyebrow="BLOG"
        title="博客"
        description="介绍热力图的功能与用法，聊聊产品背后的思考。新功能上线时，这里会第一时间更新。"
        size="md"
      />

      <div className="mx-auto w-full max-w-4xl px-4 pb-16 sm:px-6 sm:pb-20">
        <div className="mt-2 grid gap-4">
          {posts.map((post, index) => (
            <Reveal key={post.slug} delay={Math.min(index, 3) * 70}>
              <article className="marketing-card rounded-xl border border-border/70 bg-card/60 p-6">
                <Link href={`/whats-new/${post.slug}`} className="group block">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
                    <time dateTime={post.date} className="tabular-nums">
                      {formatDate(post.date)}
                    </time>
                    {post.tags.length > 0 ? (
                      <span className="flex flex-wrap gap-1.5">
                        {post.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-border/60 bg-muted/50 px-2 py-0.5 transition-colors group-hover:border-border group-hover:text-foreground/80"
                          >
                            {tag}
                          </span>
                        ))}
                      </span>
                    ) : null}
                  </div>
                  <h2 className="mt-3 text-lg font-semibold tracking-tight transition-colors group-hover:text-brand sm:text-xl">
                    {post.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{post.summary}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-foreground/80 transition-colors group-hover:text-brand">
                    阅读全文
                    <ArrowRight
                      className="size-4 transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </span>
                </Link>
              </article>
            </Reveal>
          ))}

          {posts.length === 0 ? (
            <div className="rounded-xl border border-border/70 bg-card/60 p-8 text-center text-sm text-muted-foreground">
              第一篇文章正在路上，敬请期待。
            </div>
          ) : null}
        </div>
      </div>
    </PageTransition>
  );
}
