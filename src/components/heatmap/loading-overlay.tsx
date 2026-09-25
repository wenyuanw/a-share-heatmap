
import { useEffect, useState } from "react";
import { Loader2, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { type HeatmapMessages } from "@/lib/i18n";
import { type DisplayMode } from "./types";

export const heatmapLoadingBlocks = [
  {
    className: "col-span-4 row-span-3",
    darkTone: "bg-emerald-500/[0.22]",
    lightTone: "bg-emerald-100/85",
    delay: "0ms",
  },
  {
    className: "col-span-2 row-span-2 col-start-5",
    darkTone: "bg-red-500/[0.2]",
    lightTone: "bg-red-100/85",
    delay: "120ms",
  },
  {
    className: "col-span-2 row-start-3 col-start-5",
    darkTone: "bg-slate-500/[0.18]",
    lightTone: "bg-slate-200/85",
    delay: "240ms",
  },
  {
    className: "col-span-2 row-start-4",
    darkTone: "bg-red-500/[0.16]",
    lightTone: "bg-red-100/75",
    delay: "180ms",
  },
  {
    className: "col-span-2 row-start-4 col-start-3",
    darkTone: "bg-emerald-500/[0.18]",
    lightTone: "bg-emerald-100/80",
    delay: "300ms",
  },
  {
    className: "col-span-2 row-start-4 col-start-5",
    darkTone: "bg-amber-500/[0.12]",
    lightTone: "bg-amber-100/80",
    delay: "90ms",
  },
] as const;

export function HeatmapLoadingOverlay({ displayMode, messages }: { displayMode: DisplayMode; messages: HeatmapMessages }) {
  // Deterministic on SSR + first client paint (index 0); randomize after mount to avoid hydration mismatch.
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const n = messages.loadingTips.length;
    if (n < 2) {
      return;
    }
    const timer = window.setTimeout(() => {
      setTipIndex(Math.floor(Math.random() * n));
    }, 0);

    return () => window.clearTimeout(timer);
  }, [messages.loadingTips]);

  const loadingTip = messages.loadingTips[tipIndex] ?? "";
  const isLightMode = displayMode === "light";

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        "absolute inset-0 z-40 flex flex-col items-center justify-center gap-6 px-4 py-8 text-center backdrop-blur-[10px]",
        isLightMode ? "bg-[#f3f6fa]/94" : "bg-[#0a0d12]/92"
      )}
    >
      <div className="pointer-events-none w-full max-w-[min(92vw,420px)] select-none">
        <div className="mb-4 flex items-center justify-center gap-2 opacity-90">
          <TrendingDown className="size-3.5 shrink-0 text-emerald-400/90" aria-hidden />
          <div
            className="h-2 w-[min(220px,55vw)] rounded-full shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
            style={{
              background:
                "linear-gradient(90deg, rgb(5 150 105 / 0.75) 0%, rgb(71 85 105 / 0.35) 50%, rgb(220 38 38 / 0.75) 100%)",
            }}
          />
          <TrendingUp className="size-3.5 shrink-0 text-red-400/90" aria-hidden />
        </div>

        <div
          className={cn(
            "grid h-[min(34vh,260px)] grid-cols-6 grid-rows-4 gap-1.5 rounded-md border p-2 shadow-[0_24px_80px_rgba(0,0,0,0.18)]",
            isLightMode ? "border-slate-200/90 bg-white/92 shadow-[0_16px_48px_rgba(15,23,42,0.08)]" : "border-white/[0.07] bg-[#10141b]/90"
          )}
        >
          {heatmapLoadingBlocks.map((block, index) => (
            <div
              key={index}
              className={cn(
                "rounded-[3px] animate-pulse",
                isLightMode
                  ? "shadow-[inset_0_0_0_1px_rgba(100,116,139,0.1)]"
                  : "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]",
                block.className,
                isLightMode ? block.lightTone : block.darkTone
              )}
              style={{ animationDelay: block.delay }}
            />
          ))}
        </div>
      </div>

      <div className="flex max-w-sm flex-col items-center gap-2.5">
        <div className={cn("flex items-center gap-3", isLightMode ? "text-slate-900" : "text-slate-100")}>
          <Loader2 className="size-5 shrink-0 animate-spin text-brand" aria-hidden />
          <span className="text-[15px] font-semibold tracking-tight sm:text-base">{messages.loading}</span>
        </div>
        <div className="max-w-[min(92vw,26rem)] space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {messages.loadingTipLabel}
          </p>
          <p className="text-[12px] leading-relaxed text-muted-foreground sm:text-[13px]">{loadingTip}</p>
        </div>
      </div>
    </div>
  );
}

