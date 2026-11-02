"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";

import { ButtonLink } from "@/components/marketing/button-link";
import { SiteMark } from "@/components/marketing/site-mark";
import { ThemeToggle } from "@/components/marketing/theme-toggle";
import { marketingNav, siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

export function MarketingHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 font-semibold tracking-tight whitespace-nowrap"
          onClick={() => setOpen(false)}
        >
          <SiteMark size={26} priority />
          <span className="text-[15px]">{siteConfig.name}</span>
        </Link>

        <nav aria-label="主导航" className="hidden items-center gap-1 md:flex">
          {marketingNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm transition-colors",
                isActive(item.href)
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <ButtonLink href="/" className="hidden sm:inline-flex" prefetch={false}>
            打开热力图
          </ButtonLink>
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
            aria-expanded={open}
            aria-label={open ? "关闭菜单" : "打开菜单"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <nav
          aria-label="移动端导航"
          className="border-t border-border/60 bg-background/95 backdrop-blur-xl md:hidden"
        >
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-3 sm:px-6">
            {marketingNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3 py-2.5 text-sm",
                  isActive(item.href)
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <ButtonLink href="/" className="mt-2 justify-center" prefetch={false}>
              打开热力图
            </ButtonLink>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
