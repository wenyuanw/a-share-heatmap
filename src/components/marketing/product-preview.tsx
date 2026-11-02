import Image from "next/image";
import { Maximize2, Monitor, Smartphone } from "lucide-react";

import desktopScreenshot from "../../../public/screenshots/heatmap-desktop.jpg";
import mobileScreenshot from "../../../public/screenshots/heatmap-mobile.jpg";

export function ProductPreview() {
  return (
    <figure className="relative isolate rounded-3xl border border-border/70 bg-card/70 p-4 shadow-[0_24px_80px_-40px_rgba(0,0,0,0.5)] sm:p-6 lg:p-8">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-3xl">
        <div className="absolute -top-24 left-1/4 h-64 w-96 rounded-full bg-brand/8 blur-3xl" />
        <div className="absolute -bottom-32 right-0 h-64 w-96 rounded-full bg-emerald-500/5 blur-3xl" />
      </div>

      <div className="grid items-stretch gap-6 md:grid-cols-[minmax(0,3.2fr)_minmax(0,1fr)] lg:gap-7">
        <div className="hidden min-w-0 flex-col md:flex">
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
            className="group block overflow-hidden rounded-xl border border-white/15 bg-[#151a21] shadow-xl outline-offset-4 focus-visible:outline-brand"
          >
            <div className="flex h-9 items-center justify-between border-b border-white/10 px-3 text-[10px] text-slate-400">
              <span aria-hidden className="flex gap-1.5">
                <span className="size-1.5 rounded-full bg-white/25" />
                <span className="size-1.5 rounded-full bg-white/25" />
                <span className="size-1.5 rounded-full bg-white/25" />
              </span>
              <span>dapan.app</span>
              <Maximize2 className="size-3 transition-colors group-hover:text-white" aria-hidden />
            </div>
            <Image
              src={desktopScreenshot}
              alt="经典红绿配色的桌面端 A 股全市场热力图，包含市场菜单、行业板块和个股涨跌"
              unoptimized
              className="block h-auto w-full"
            />
            <div aria-hidden className="h-4" />
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
            className="flex flex-1 flex-col overflow-hidden rounded-[1.5rem] border border-white/20 bg-[#151a21] shadow-xl outline-offset-4 focus-visible:outline-brand"
          >
            <div className="flex h-9 shrink-0 items-center justify-center border-b border-white/10 text-[10px] tracking-wide text-slate-400" aria-hidden>dapan.app</div>
            <div className="relative aspect-[1/2] md:aspect-auto md:min-h-0 md:flex-1">
              <Image
                src={mobileScreenshot}
                alt="经典红绿配色的手机端 A 股热力图，竖屏展示板块与个股分布"
                fill
                sizes="(min-width: 1152px) 240px, (min-width: 768px) 24vw, 280px"
                unoptimized
                className="object-contain"
              />
            </div>
            <div aria-hidden className="flex h-4 shrink-0 items-center justify-center">
              <span className="h-0.5 w-10 rounded-full bg-white/30" />
            </div>
          </a>
        </div>
      </div>
      <figcaption className="mt-4 text-center text-xs leading-relaxed text-balance text-muted-foreground">
        市场全景，随手可见。桌面纵览全局，手机随时查看。
      </figcaption>
    </figure>
  );
}
