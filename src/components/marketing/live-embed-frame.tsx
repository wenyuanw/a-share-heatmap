"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

type LiveEmbedFrameProps = {
  src: string;
  title: string;
  /** Height classes for the iframe, e.g. "h-[480px] sm:h-[560px]". */
  className?: string;
};

/**
 * Lazy iframe with a pulsing skeleton overlay: the heatmap fades in once the
 * frame finishes loading instead of popping in over a blank box.
 */
export function LiveEmbedFrame({ src, title, className }: LiveEmbedFrameProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative">
      {!loaded ? (
        <div
          aria-hidden
          className="absolute inset-0 z-10 flex animate-pulse flex-col items-center justify-center gap-2 bg-muted/60"
        >
          <span className="size-1.5 animate-pulse rounded-full bg-brand" />
          <span className="text-xs text-muted-foreground">热力图加载中…</span>
        </div>
      ) : null}
      <iframe
        src={src}
        title={title}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className={cn(
          "block w-full transition-opacity duration-700 ease-out",
          loaded ? "opacity-100" : "opacity-0",
          className,
        )}
      />
    </div>
  );
}
