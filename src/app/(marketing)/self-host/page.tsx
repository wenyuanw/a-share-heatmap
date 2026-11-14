import type { Metadata } from "next";
import Link from "next/link";
import { Rocket } from "lucide-react";

import { ButtonLink } from "@/components/marketing/button-link";
import { CodeBlock } from "@/components/marketing/code-block";
import { PageHero } from "@/components/marketing/page-hero";
import { PageTransition } from "@/components/marketing/page-transition";
import { Reveal } from "@/components/marketing/reveal";
import { GitHubMark } from "@/components/heatmap/github-mark";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: `自部署指南：一分钟拥有自己的大盘云图 | ${siteConfig.name}`,
  description:
    "A 股市场热力图开源免费、支持自部署：一键部署到 Vercel，或本地运行。无需配置环境变量，行情数据自动刷新，MIT 协议。",
  alternates: {
    canonical: "/self-host",
  },
  openGraph: {
    title: `自部署指南 | ${siteConfig.name}`,
    description: "一分钟部署你自己的 A 股大盘云图，开源免费、无需环境变量。",
    url: "/self-host",
    images: [{ url: siteConfig.ogImage, width: 1200, height: 630 }],
  },
};

export default function SelfHostPage() {
  return (
    <PageTransition>
      <PageHero
        eyebrow="SELF-HOST"
        title="一分钟部署你自己的大盘云图"
        description="项目完全开源（MIT 协议），基于 Next.js 构建，无需数据库、无需环境变量。部署到你自己的域名，就是你的私人看盘工具。"
        align="center"
        size="sm"
      />

      <div className="mx-auto w-full max-w-3xl px-4 pb-16 sm:px-6 sm:pb-20">
        <Reveal className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <ButtonLink
            href={`https://vercel.com/new/clone?repository-url=${siteConfig.repoUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="h-10 px-5 text-[15px]"
          >
            <Rocket aria-hidden />
            一键部署到 Vercel
          </ButtonLink>
          <ButtonLink
            href={siteConfig.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="outline"
            className="h-10 px-5 text-[15px]"
          >
            <GitHubMark />
            查看源码
          </ButtonLink>
        </Reveal>

        <Reveal className="mdx-content mt-14 text-[15px]">
          <h2>部署到 Vercel</h2>
          <ol>
            <li>
              点击上方「一键部署到 Vercel」，授权后 Vercel 会基于仓库自动创建项目并开始构建。
            </li>
            <li>
              构建完成后即可通过 Vercel 分配的域名访问，也可以绑定你自己的域名。
            </li>
            <li>
              之后每次向仓库推送代码，Vercel 会自动重新部署。
            </li>
          </ol>
          <blockquote>
            项目无需配置任何环境变量，所有偏好都保存在访问者本地浏览器中。
          </blockquote>

          <h2>本地运行</h2>
          <p>想在本地跑起来也很简单，装好 Node.js 与 pnpm 后：</p>
          <CodeBlock
            label="终端"
            code={`pnpm install
pnpm dev        # http://localhost:3000
pnpm build      # 生产构建
pnpm start      # 运行生产构建`}
          />
          <p>
            技术栈是 Next.js（App Router）+ Canvas 2D + Tailwind CSS，任何能跑 Node.js
            的平台都可以部署，不限于 Vercel。
          </p>

          <h2>行情数据</h2>
          <ul>
            <li>
              页面通过 Next.js API Routes 获取公开行情快照，服务端做了秒级缓存，避免频繁刷新打爆接口。
            </li>
            <li>
              仓库内置了「刷新 A 股股票池」的 GitHub Action，每个工作日北京时间 18:30
              自动校验并更新股票名册，新股无需手工维护。
            </li>
            <li>
              主数据源不可用时自动切换腾讯行情备用源；远端全部失败时回退到内置快照，保证页面始终能打开。
            </li>
          </ul>
          <p>
            本地也可以手动维护内置快照：
          </p>
          <CodeBlock
            label="终端"
            code={`pnpm check:data    # 只拉取并校验，不写文件
pnpm refresh:data  # 校验通过后更新内置快照`}
          />

          <h2>常见问题</h2>
          <ul>
            <li>
              <strong>要配置环境变量吗？</strong>
              ：不需要。克隆、构建、访问，三步完成。
            </li>
            <li>
              <strong>会存储用户数据吗？</strong>
              ：不会。自选股、配色、快捷键等全部保存在访问者本地浏览器。
            </li>
            <li>
              <strong>可以商用吗？</strong>
              ：代码遵循 MIT 协议，可自由使用与修改；请自行遵守数据源的服务条款，行情数据仅供研究参考。
            </li>
            <li>
              <strong>部署后想给别人用？</strong>
              ：欢迎。也可以直接
              <Link
                href="/embed"
                className="mx-1 font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-brand"
              >
                嵌入 iframe
              </Link>
              到你已有的站点。
            </li>
          </ul>
        </Reveal>

        <Reveal className="mt-14">
          <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/60 px-6 py-10 text-center sm:px-12">
            <div aria-hidden className="marketing-glow absolute inset-0" />
            <div className="relative">
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">部署好了？打开看看</h2>
              <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
                也可以先在官方站点体验完整功能，再决定要不要部署自己的版本。
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <ButtonLink href="/" prefetch={false} className="h-10 px-5 text-[15px]">
                  打开热力图
                </ButtonLink>
                <Link
                  href="/guide"
                  className="inline-flex h-10 items-center px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  阅读使用教程
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </PageTransition>
  );
}
