import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { PageHeader } from "@/components/marketing/page-header";
import { Reveal } from "@/components/marketing/reveal";
import { changelog, changelogTagMeta, type ChangelogTag } from "@/data/changelog";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: `更新日志 | ${siteConfig.name}`,
  description:
    "A 股市场热力图的迭代记录：新功能、优化与修复按时间倒序整理，持续更新中。",
  alternates: {
    canonical: "/changelog",
  },
  openGraph: {
    title: `更新日志 | ${siteConfig.name}`,
    description: "新功能、优化与修复按时间倒序整理，持续更新中。",
    url: "/changelog",
    images: [{ url: siteConfig.ogImage, width: 1200, height: 630 }],
  },
  twitter: {
    title: `更新日志 | ${siteConfig.name}`,
    description: "新功能、优化与修复按时间倒序整理，持续更新中。",
    images: [siteConfig.ogImage],
  },
};

const tagBadgeClasses: Record<ChangelogTag, string> = {
  feat: "border-brand/30 bg-brand/10 text-brand",
  improve: "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400",
  fix: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

function formatDate(date: string) {
  const [year, month, day] = date.split("-");
  return `${year} 年 ${Number(month)} 月 ${Number(day)} 日`;
}

export default function ChangelogPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
      <PageHeader
        eyebrow="CHANGELOG"
        title="更新日志"
        description="每一次迭代都会记录在这里：新功能、体验优化与问题修复，按时间倒序排列。"
      />

      <ol className="mt-14 space-y-12">
        {changelog.map((entry, index) => (
          <li
            key={`${entry.date}-${entry.title}`}
            className="grid gap-3 sm:grid-cols-[150px_1fr] sm:gap-8"
          >
            <Reveal>
              <time
                dateTime={entry.date}
                className="block pt-0.5 text-sm font-medium text-muted-foreground sm:sticky sm:top-20"
              >
                {formatDate(entry.date)}
              </time>
            </Reveal>
            <Reveal className="relative pl-6">
              {/* Timeline rail and dot */}
              <span
                aria-hidden
                className="absolute top-1.5 left-0 size-2.5 rounded-full bg-brand ring-4 ring-brand/15"
              />
              {index < changelog.length - 1 ? (
                <span
                  aria-hidden
                  className="absolute top-6 -bottom-12 left-[4.5px] w-px bg-border"
                />
              ) : null}
              <article>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                    tagBadgeClasses[entry.tag],
                  )}
                >
                  {changelogTagMeta[entry.tag].label}
                </span>
                <h2 className="mt-3 text-lg font-semibold tracking-tight">{entry.title}</h2>
                <ul className="mt-2.5 space-y-1.5">
                  {entry.items.map((item) => (
                    <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
                      <span aria-hidden className="mt-[0.55em] size-1 shrink-0 rounded-full bg-border" />
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>
          </li>
        ))}
      </ol>

      <Reveal className="mt-16">
        <div className="rounded-xl border border-border/70 bg-card/60 px-5 py-4 text-sm text-muted-foreground">
          更早的迭代记录可以在
          <a
            href={`${siteConfig.repoUrl}/commits/main`}
            target="_blank"
            rel="noopener noreferrer"
            className="mx-1 font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-brand"
          >
            GitHub 提交历史
          </a>
          中查看。想了解某个功能的用法？欢迎阅读
          <Link
            href="/whats-new"
            className="mx-1 inline-flex items-center gap-0.5 font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-brand"
          >
            博客
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
          。
        </div>
      </Reveal>
    </div>
  );
}
