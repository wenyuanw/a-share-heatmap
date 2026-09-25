"use client";

import { cn } from "@/lib/utils";
import { type HeatmapMessages } from "@/lib/i18n";
import { getInspectorSortLabel, getSparklineUrl } from "./format";
import { inspectorSortKeys, type InspectorSortKey, type PriceColorMode } from "./types";

export function InspectorHeaderSparkline({
  code,
  changePct,
  priceColorMode,
  className,
}: {
  code: string;
  changePct: number | null;
  priceColorMode: PriceColorMode;
  className?: string;
}) {
  const isFlat = changePct === null || Math.abs(changePct) < 0.1;
  // 原图已是涨红跌绿；仅在「绿涨红跌」模式下交换 R/G，灰网格几乎不变。
  const shouldSwapRg = !isFlat && priceColorMode === "green-rise";

  return (
    <span className={cn("relative flex min-w-0 items-center justify-center", className)}>
      {shouldSwapRg && (
        <svg aria-hidden className="pointer-events-none absolute h-0 w-0 overflow-hidden">
          <filter id="sparkline-rg-swap" colorInterpolationFilters="sRGB">
            <feColorMatrix
              type="matrix"
              values="0 1 0 0 0
                      1 0 0 0 0
                      0 0 1 0 0
                      0 0 0 1 0"
            />
          </filter>
        </svg>
      )}
      <img
        src={getSparklineUrl(code)}
        alt=""
        className="h-full w-auto max-w-full object-contain"
        style={{
          // screen 消掉黑底，保留白/灰虚线与原有线色
          mixBlendMode: "screen",
          filter: isFlat
            ? "brightness(1.15) grayscale(0.55)"
            : shouldSwapRg
              ? "url(#sparkline-rg-swap) brightness(1.12)"
              : "brightness(1.12)",
          imageRendering: "pixelated",
        }}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
      />
    </span>
  );
}

export function InspectorSortControls({
  sortKey,
  messages,
  tone = "light",
  showShortcutHint = false,
  watchlistHint,
  onChange,
}: {
  sortKey: InspectorSortKey;
  messages: HeatmapMessages;
  tone?: "light" | "dark";
  showShortcutHint?: boolean;
  watchlistHint?: string;
  onChange: (next: InspectorSortKey) => void;
}) {
  const isDark = tone === "dark";

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <span
        className={cn(
          "shrink-0 text-[10px] font-medium tracking-[0.06em]",
          isDark ? "text-slate-400" : "text-slate-500"
        )}
      >
        {messages.inspectorSortLabel}
      </span>
      <div className="flex min-w-0 flex-wrap items-center gap-1">
        {inspectorSortKeys.map((key) => {
          const active = sortKey === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              aria-pressed={active}
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors",
                active
                  ? isDark
                    ? "bg-slate-100 text-slate-900"
                    : "bg-slate-800 text-white"
                  : isDark
                    ? "bg-slate-800/80 text-slate-300 hover:bg-slate-700/80"
                    : "bg-white text-slate-600 hover:bg-slate-200/80"
              )}
            >
              {getInspectorSortLabel(messages, key)}
            </button>
          );
        })}
      </div>
      {showShortcutHint && (
        <span
          className={cn(
            "ml-auto shrink-0 truncate text-[10px]",
            isDark ? "text-slate-500" : "text-slate-400"
          )}
        >
          {[watchlistHint, messages.inspectorSortHint].filter(Boolean).join(" · ")}
        </span>
      )}
    </div>
  );
}

