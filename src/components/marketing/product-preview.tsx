import Image from "next/image";
import { Monitor, Smartphone } from "lucide-react";

import desktopScreenshot from "../../../public/screenshots/heatmap-desktop.webp";
import mobileScreenshot from "../../../public/screenshots/heatmap-mobile.webp";

export function ProductPreview() {
  return (
    <figure id="product-preview" className="relative isolate scroll-mt-20 rounded-3xl border border-border/70 bg-card/70 p-4 shadow-[0_24px_80px_-40px_rgba(0,0,0,0.5)] sm:p-6 lg:p-8">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-3xl">
        <div className="absolute -top-24 left-1/4 h-64 w-96 rounded-full bg-brand/8 blur-3xl" />
        <div className="absolute -bottom-32 right-0 h-64 w-96 rounded-full bg-emerald-500/5 blur-3xl" />
      </div>

      <div className="grid items-stretch gap-6 md:grid-cols-[minmax(0,3.2fr)_minmax(0,1fr)] lg:gap-7">
        <div className="flex min-w-0 flex-col">
          <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Monitor className="size-3.5" aria-hidden />
            桌面端
            <span className="ml-auto font-normal opacity-70">板块与个股，一屏尽览</span>
          </div>
          <a
            href={desktopScreenshot.src}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="查看桌面端高清原图（新标签页）"
            className="block overflow-hidden rounded-xl shadow-xl outline-offset-4 focus-visible:outline-brand"
          >
            <Image
              src={desktopScreenshot}
              alt="经典红绿配色的桌面端 A 股全市场热力图，包含市场菜单、行业板块和个股涨跌"
              sizes="(min-width: 1152px) 780px, (min-width: 768px) 73vw, (min-width: 640px) calc(100vw - 6rem), calc(100vw - 4rem)"
              className="block h-auto w-full"
            />
          </a>
        </div>

        <div className="mx-auto flex w-full max-w-[280px] flex-col md:max-w-none">
          <div className="mb-3 flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground">
            <Smartphone className="size-3.5" aria-hidden />
            手机端
          </div>
          <a
            href={mobileScreenshot.src}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="查看手机端高清原图（新标签页）"
            className="block overflow-hidden rounded-xl shadow-xl outline-offset-4 focus-visible:outline-brand"
          >
            <Image
              src={mobileScreenshot}
              alt="经典红绿配色的手机端 A 股热力图，竖屏展示板块与个股分布"
              sizes="(min-width: 1152px) 240px, (min-width: 768px) 24vw, 280px"
              className="block h-auto w-full"
            />
          </a>
        </div>
      </div>
      <figcaption className="mt-4 text-center text-xs leading-relaxed text-balance text-muted-foreground">
        市场全景，随手可见。桌面纵览全局，手机随时查看。
      </figcaption>
    </figure>
  );
}
