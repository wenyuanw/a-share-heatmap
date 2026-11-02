"use client";

import { useState } from "react";

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
      className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-brand/25 to-brand/10 text-sm font-semibold text-brand"
    >
      {!loaded && initial}
      {source && failedSource !== source && (
        <img
          key={source}
          src={source}
          alt=""
          width={28}
          height={28}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setLoadedSource(source)}
          onError={() => {
            setLoadedSource(null);
            setFailedSource(source);
          }}
          className={`absolute size-7 object-contain ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </span>
  );
}
