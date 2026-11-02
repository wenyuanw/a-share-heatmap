import Link from "next/link";
import { ArrowUpRight, Mail } from "lucide-react";

import { GitHubMark } from "@/components/heatmap/github-mark";
import { SiteMark } from "@/components/marketing/site-mark";
import { marketScopes } from "@/data/markets";
import { marketingNav, siteConfig } from "@/lib/site";

const authorLinks = [
  {
    href: siteConfig.author.github,
    label: "GitHub @wenyuanw",
    external: true,
    icon: <GitHubMark className="size-3.5 opacity-70" />,
  },
  {
    href: siteConfig.author.site,
    label: "wenyuanw.me 个人站",
    external: true,
    icon: <ArrowUpRight className="size-3.5 opacity-70" />,
  },
  {
    href: `mailto:${siteConfig.author.email}`,
    label: siteConfig.author.email,
    external: false,
    icon: <Mail className="size-3.5 opacity-70" />,
  },
] as const;

export function MarketingFooter() {
  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
              <SiteMark className="shrink-0" size={26} />
              {siteConfig.name}
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              {siteConfig.tagline}。开源免费，支持自部署。
            </p>
            <p className="mt-4 text-xs text-muted-foreground">开源项目 · MIT License</p>
          </div>

          <nav aria-label="页脚导航">
            <h3 className="text-sm font-semibold">站点</h3>
            <ul className="mt-3 space-y-2.5 text-sm">
              <li>
                <Link
                  href="/"
                  prefetch={false}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  打开热力图
                </Link>
              </li>
              {marketingNav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {item.href === "/guide" ? "使用教程" : item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/self-host"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  自部署指南
                </Link>
              </li>
              <li>
                <Link
                  href="/embed"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  嵌入指南
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="市场热力图">
            <h3 className="text-sm font-semibold">市场热力图</h3>
            <ul className="mt-3 space-y-2.5 text-sm">
              {marketScopes.slice(0, 4).map((scope) => (
                <li key={scope.slug}>
                  <Link
                    href={`/market/${scope.slug}`}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {scope.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/market"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  全部市场范围
                </Link>
              </li>
            </ul>
          </nav>

          <div>
            <h3 className="text-sm font-semibold">作者</h3>
            <ul className="mt-3 space-y-2.5 text-sm">
              {authorLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.icon}
                    {link.label}
                  </a>
                </li>
              ))}
              <li>
                <Link
                  href="/sponsors"
                  className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ArrowUpRight className="size-3.5 opacity-70" />
                  赞赏与赞助
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-2 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>
            © {new Date().getFullYear()} {siteConfig.author.name} · {siteConfig.name}
          </p>
          <p>行情数据仅供参考，不构成任何投资建议</p>
        </div>
      </div>
    </footer>
  );
}
