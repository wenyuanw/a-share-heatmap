import type { Metadata } from "next";
import Link from "next/link";

import { ButtonLink } from "@/components/marketing/button-link";
import { PageHero } from "@/components/marketing/page-hero";
import { PageTransition } from "@/components/marketing/page-transition";
import { Reveal } from "@/components/marketing/reveal";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: `使用教程：热力图怎么看 | ${siteConfig.name}`,
  description:
    "A 股市场热力图完整使用教程：怎么读图、市场范围、涨跌周期、板块筛选、自选热力图、快捷键与 URL 参数，从入门到熟练只要五分钟。",
  alternates: {
    canonical: "/guide",
  },
  openGraph: {
    title: `使用教程：热力图怎么看 | ${siteConfig.name}`,
    description: "从读图方法到进阶玩法，五分钟学会用热力图看盘与复盘。",
    url: "/guide",
    images: [{ url: siteConfig.ogImage, width: 1200, height: 630 }],
  },
};

const toc = [
  { id: "reading", label: "怎么读图" },
  { id: "markets", label: "市场范围" },
  { id: "periods", label: "涨跌周期" },
  { id: "filters", label: "筛选与聚焦" },
  { id: "watchlist", label: "自选热力图" },
  { id: "appearance", label: "外观与快捷键" },
  { id: "params", label: "URL 参数" },
  { id: "share", label: "截图分享" },
  { id: "webmcp", label: "WebMCP" },
  { id: "faq", label: "常见问题" },
];

/** Section wrapper: hairline break + anchor offset, chapters 2+ get the rule. */
function GuideSection({
  id,
  index,
  title,
  children,
}: {
  id: string;
  index: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn("scroll-mt-24", index > 0 && "mt-12 border-t border-border/50 pt-10")}
    >
      <Reveal>
        <h2 className="group flex items-baseline gap-3 text-2xl font-semibold tracking-tight">
          <span
            aria-hidden
            className="font-mono text-sm font-medium text-brand/70 tabular-nums transition-colors group-hover:text-brand"
          >
            {String(index + 1).padStart(2, "0")}
          </span>
          {title}
        </h2>
        <div className="mdx-content mt-4">{children}</div>
      </Reveal>
    </section>
  );
}

export default function GuidePage() {
  return (
    <PageTransition>
      <PageHero
        eyebrow="GUIDE"
        title="使用教程：热力图怎么看"
        description="从打开页面到熟练复盘，这篇教程覆盖热力图的全部功能。大部分操作一试就会，建议边读边在热力图里操作。"
        size="lg"
      />

      <div className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 sm:pb-20">
        <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
          {/* TOC */}
          <aside className="hidden lg:block">
            <nav aria-label="目录" className="sticky top-20">
              <div className="rounded-xl border border-border/70 bg-card/60 p-4">
                <p className="px-2.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  目录
                </p>
                <ul className="mt-2.5 space-y-0.5 text-sm">
                  {toc.map((item, index) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className="group flex items-baseline gap-2.5 rounded-lg px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                      >
                        <span
                          aria-hidden
                          className="font-mono text-[11px] text-muted-foreground/60 tabular-nums transition-colors group-hover:text-brand"
                        >
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </nav>
          </aside>

          <article className="min-w-0 max-w-3xl">
            <GuideSection id="reading" index={0} title="怎么读图">
              <p>
                热力图把整个市场压缩成一屏，三个维度就够了：
              </p>
              <ul>
                <li>
                  <strong>面积 = 市值权重</strong>
                  ：色块越大，代表流通市值越高。工商银行、贵州茅台这样的大色块，基本决定了指数的走向。
                </li>
                <li>
                  <strong>颜色 = 涨跌幅</strong>
                  ：红涨绿跌（可在设置中对调），颜色越深涨跌越大。一眼扫过去，市场情绪就有数了。
                </li>
                <li>
                  <strong>分组 = 行业板块</strong>
                  ：色块按一级行业聚合，板块标题显示整体涨跌。某个板块整体泛红，说明资金正在向这个方向集中。
                </li>
              </ul>
              <p>
                鼠标悬浮查看个股详情，滚轮缩放、拖拽平移；双击板块标题可以聚焦该板块，再点面包屑返回全市场。
              </p>
            </GuideSection>

            <GuideSection id="markets" index={1} title="市场范围">
              <p>
                左侧边栏可以随时切换市场范围：A 股全图、上证 A 股、深证 A 股、沪深 300、中证 A50、中证
                A500、A 股主板、创业板、科创板，以及你的自选列表。
              </p>
              <p>
                每个范围都有独立的落地页，附带该范围的看点说明，可以从
                <Link href="/market" className="mx-1 font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-brand">
                  市场热力图大全
                </Link>
                进入。
              </p>
            </GuideSection>

            <GuideSection id="periods" index={2} title="涨跌周期">
              <p>
                底部或侧栏可切换涨跌区间：<strong>当日</strong>
                看情绪，<strong>近 5 日</strong>、<strong>近 20 日</strong>
                看趋势，<strong>今年以来</strong>
                看全年结构。同一个市场换一个周期，经常能看到完全不同的故事——今天跌的板块，放到近 20
                日里可能一直在走强。
              </p>
            </GuideSection>

            <GuideSection id="filters" index={3} title="筛选与聚焦">
              <ul>
                <li>
                  <strong>一级板块筛选</strong>
                  ：支持同时多选，聚焦几个行业的内部结构；双击板块标题也可以快速聚焦。
                </li>
                <li>
                  <strong>趋势筛选</strong>
                  ：只看上涨或只看下跌，配合板块筛选定位强势方向。
                </li>
                <li>
                  <strong>涨跌幅区间</strong>
                  ：比如 5%~10%，把平淡的股票过滤掉，只留下真正在动的标的。
                </li>
              </ul>
            </GuideSection>

            <GuideSection id="watchlist" index={4} title="自选热力图">
              <ul>
                <li>
                  在设置 → 自选中按<strong>名称或代码</strong>添加股票，切到「自选」范围即可查看个人热力图。
                </li>
                <li>
                  <strong>截图 AI 识股</strong>
                  ：看到榜单截图？浏览器直连视觉模型，识别股票并批量加入自选，截图不离开本地。
                </li>
                <li>
                  <strong>JSON 导入导出</strong>
                  ：自选列表可以在设备之间迁移与备份。
                </li>
                <li>自选数据只保存在本地浏览器，不上传服务器。更多玩法见博客文章。</li>
              </ul>
            </GuideSection>

            <GuideSection id="appearance" index={5} title="外观与快捷键">
              <ul>
                <li>
                  <strong>配色主题</strong>
                  ：红涨绿跌 / 绿涨红跌一键对调，也可以用三个色值创建自定义主题。
                </li>
                <li>
                  <strong>快捷键</strong>
                  ：切换市场、切换周期等高频操作都绑定了快捷键，可在设置中重映射。
                </li>
                <li>
                  <strong>边框开关</strong>
                  ：关掉实线边框，色块更干净；深浅模式底栏一键切换。
                </li>
              </ul>
            </GuideSection>

            <GuideSection id="params" index={6} title="URL 参数">
              <p>
                用 URL 参数可以直接打开指定状态，适合加入书签或分享给朋友。参数优先于本地保存的偏好：
              </p>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>参数</th>
                      <th>取值</th>
                      <th>示例</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><code>market</code></td>
                      <td>all / sse / szse / hs300 / zza50 / zza500 / main / cyb / kcb / watchlist</td>
                      <td><code>/?market=hs300</code></td>
                    </tr>
                    <tr>
                      <td><code>period</code></td>
                      <td>day / week / month / year</td>
                      <td><code>/?market=cyb&period=month</code></td>
                    </tr>
                    <tr>
                      <td><code>borders</code></td>
                      <td>on / off</td>
                      <td><code>/?borders=off</code></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>在页面内手动切换范围或周期后，对应的 URL 参数会被移除，恢复本地偏好。</p>
            </GuideSection>

            <GuideSection id="share" index={7} title="截图分享">
              <p>
                底栏「分享」一键生成热力图快照，支持下载、复制到剪贴板与系统分享。复盘观点配上这张图，讨论起来直观得多。
              </p>
            </GuideSection>

            <GuideSection id="webmcp" index={8} title="WebMCP">
              <p>
                热力图内置了一组 WebMCP 工具，浏览器 AI 可以直接读取市场状态、切换视图、查询排行与管理自选股。在
                ChatGPT 桌面版内置浏览器中打开本站即可体验，详见
                <Link
                  href="/whats-new/2026-10-30-webmcp-ai"
                  className="mx-1 font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-brand"
                >
                  博客文章
                </Link>
                与
                <a
                  href={`${siteConfig.repoUrl}#webmcp-实验支持`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mx-1 font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-brand"
                >
                  README
                </a>
                。
              </p>
            </GuideSection>

            <GuideSection id="faq" index={9} title="常见问题">
              <ul>
                <li>
                  <strong>要付费吗？需要注册吗？</strong>
                  ：完全免费，无需注册，打开即用，代码开源（MIT）。
                </li>
                <li>
                  <strong>数据从哪来？</strong>
                  ：公开行情快照，服务端做了秒级缓存；远端不可用时自动切换内置快照，页面始终可用。
                </li>
                <li>
                  <strong>自选数据安全吗？</strong>
                  ：只保存在你本地浏览器的 localStorage 中，不上传、不同步。
                </li>
                <li>
                  <strong>可以商用或嵌入吗？</strong>
                  ：代码 MIT 协议，嵌入方式见
                  <Link
                    href="/embed"
                    className="mx-1 font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-brand"
                  >
                    嵌入指南
                  </Link>
                  。行情数据仅供研究参考，不构成投资建议。
                </li>
              </ul>
            </GuideSection>

            <Reveal className="mt-14">
              <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/60 px-6 py-8 text-center sm:px-12">
                <div aria-hidden className="marketing-glow absolute inset-0" />
                <div className="relative">
                  <h2 className="text-lg font-semibold tracking-tight">还有疑问？</h2>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                    欢迎在 GitHub Issues 提问，或直接打开热力图试一试——大部分操作一试就会。
                  </p>
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                    <ButtonLink
                      href={`${siteConfig.repoUrl}/issues`}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="outline"
                    >
                      GitHub Issues
                    </ButtonLink>
                    <ButtonLink href="/" prefetch={false}>
                      打开热力图
                    </ButtonLink>
                  </div>
                </div>
              </div>
            </Reveal>
          </article>
        </div>
      </div>
    </PageTransition>
  );
}
