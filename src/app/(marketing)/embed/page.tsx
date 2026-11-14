import type { Metadata } from "next";
import Link from "next/link";

import { ButtonLink } from "@/components/marketing/button-link";
import { CodeBlock } from "@/components/marketing/code-block";
import { PageHero } from "@/components/marketing/page-hero";
import { PageTransition } from "@/components/marketing/page-transition";
import { Reveal } from "@/components/marketing/reveal";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: `嵌入指南：把热力图挂到你的站点 | ${siteConfig.name}`,
  description:
    "通过 iframe 把 A 股市场热力图嵌入你的财经站点、博客或投资看板：支持 market、period、borders 参数定制显示状态，免费且无需注册。",
  alternates: {
    canonical: "/embed",
  },
  openGraph: {
    title: `嵌入指南 | ${siteConfig.name}`,
    description: "一段 iframe 代码，把可交互的 A 股大盘云图挂到你的站点上。",
    url: "/embed",
    images: [{ url: siteConfig.ogImage, width: 1200, height: 630 }],
  },
};

export default function EmbedPage() {
  const embedSnippet = `<iframe
  src="https://dapan.app/?market=all&borders=off"
  width="100%"
  height="560"
  style="border:0;border-radius:12px"
  loading="lazy"
  title="A 股市场热力图">
</iframe>`;

  return (
    <PageTransition>
      <PageHero
        eyebrow="EMBED"
        title="把热力图嵌入你的站点"
        description="一段 iframe 代码，就能在财经站点、博客、投资看板里挂上一块可交互的 A 股市场热力图。免费、无需注册、无需 API Key。"
        size="sm"
      />

      <div className="mx-auto w-full max-w-3xl px-4 pb-16 sm:px-6 sm:pb-20">
        <Reveal className="mdx-content mt-2 text-[15px]">
          <h2>基本用法</h2>
          <p>把下面的代码粘贴到页面里即可，宽高按你的布局调整：</p>
          <CodeBlock code={embedSnippet} label="HTML" />
          <p>
            建议开启 <code>{`loading="lazy"`}</code>
            ，访问者滚动到热力图时才加载行情，不影响你页面的打开速度。
          </p>

          <h2>URL 参数定制</h2>
          <p>在 <code>src</code> 的查询参数里可以直接指定热力图的初始状态：</p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>参数</th>
                  <th>取值</th>
                  <th>说明</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>market</code></td>
                  <td>all / sse / szse / hs300 / zza50 / zza500 / main / cyb / kcb / watchlist</td>
                  <td>市场范围，例如 <code>?market=hs300</code> 直接打开沪深 300</td>
                </tr>
                <tr>
                  <td><code>period</code></td>
                  <td>day / week / month / year</td>
                  <td>涨跌周期：当日、近 5 日、近 20 日、今年以来</td>
                </tr>
                <tr>
                  <td><code>sector</code></td>
                  <td>bank / electronics / pharma / food-beverage 等</td>
                  <td>聚焦一级行业板块，例如 <code>?sector=bank</code> 只看银行板块，全部取值见<code>/sector</code></td>
                </tr>
                <tr>
                  <td><code>borders</code></td>
                  <td>on / off</td>
                  <td>边框开关，嵌入场景建议 <code>?borders=off</code>，色块更干净</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            例如嵌入「近 20 日创业板热力图」：<code>https://dapan.app/?market=cyb&period=month</code>
          </p>

          <h2>尺寸建议</h2>
          <ul>
            <li>
              最小可用宽度约 360px（移动端布局），推荐宽度 800px 以上以获得完整桌面布局。
            </li>
            <li>
              高度建议不低于 480px，热力图会自动适应容器尺寸。
            </li>
            <li>
              交互（缩放、拖拽、悬浮）在 iframe 内完整可用，与主站体验一致。
            </li>
          </ul>

          <h2>使用须知</h2>
          <ul>
            <li>行情数据来自公开接口，仅供研究参考，不构成任何投资建议。</li>
            <li>
              个人与非商业站点随意使用；如果方便，在热力图附近保留一个指向
              <Link
                href={siteConfig.url}
                className="mx-1 font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-brand"
              >
                dapan.app
              </Link>
              的链接就是最好的支持。
            </li>
            <li>
              请勿高频刷新或在大流量场景下滥用——数据端有秒级缓存，正常使用完全够用；有定制需求欢迎
              <a
                href={`mailto:${siteConfig.author.email}`}
                className="mx-1 font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-brand"
              >
                发邮件
              </a>
              聊聊。
            </li>
            <li>
              想要完全自托管？看
              <Link
                href="/self-host"
                className="mx-1 font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-brand"
              >
                自部署指南
              </Link>
              ，把整套热力图跑在你自己的服务器上。
            </li>
          </ul>
        </Reveal>

        <Reveal className="mt-14">
          <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/60 px-6 py-8 text-center sm:px-12">
            <div aria-hidden className="marketing-glow absolute inset-0" />
            <div className="relative">
              <h2 className="text-lg font-semibold tracking-tight">嵌入前先看看效果</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                打开官方站点感受完整的交互体验，再决定怎么把它挂到你的页面上。
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <ButtonLink href="/" prefetch={false}>
                  打开热力图
                </ButtonLink>
                <ButtonLink href="/self-host" variant="outline">
                  想自托管？看这里
                </ButtonLink>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </PageTransition>
  );
}
