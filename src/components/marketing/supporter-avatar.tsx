"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

type SupporterAvatarProps = {
  name: string;
  url?: string;
  icon?: string;
};

export function SupporterAvatar({ name, url, icon }: SupporterAvatarProps) {
  const [loadedSource, setLoadedSource] = useState<string | null>(null);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const initial = name.trim().charAt(0).toUpperCase() || "谢";
  let source: string | undefined;

  try {
    // Custom paths cover sites that do not publish a root favicon.ico.
    const imageUrl = new URL(icon || "/favicon.ico", url);
    if (imageUrl.protocol === "https:" || imageUrl.protocol === "http:") {
      source = imageUrl.href;
    }
  } catch {
    // Missing or invalid URLs keep the name initial.
  }

  const loaded = source !== undefined && loadedSource === source;

  return (
    <span
      aria-hidden
      className={cn(
        "relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border text-base font-semibold",
        loaded
          ? "border-black/10 bg-white shadow-sm dark:border-white/15"
          : "border-border/70 bg-muted/50 text-muted-foreground",
      )}
    >
      {!loaded && initial}
      {source && failedSource !== source && (
        <img
          key={source}
          src={source}
          alt=""
          width={32}
          height={32}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setLoadedSource(source)}
          onError={() => {
            setLoadedSource(null);
            setFailedSource(source);
          }}
          className={`absolute size-8 object-contain ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </span>
  );
}
