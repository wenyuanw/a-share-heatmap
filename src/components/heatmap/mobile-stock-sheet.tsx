"use client";

import { ExternalLink, Star, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { type HeatmapMessages } from "@/lib/i18n";
import { type HeatTheme } from "@/lib/heatmap-themes";
import { getChangeTextColor } from "./colors";
import { formatBoardTrendCounts, formatChange, formatPrice, getDailyKlineUrl, getSparklineUrl } from "./format";
import { type DisplayMode, type InspectorSortKey, type PriceColorMode } from "./types";
import { InspectorSortControls } from "./inspector-parts";

export type MobileStockSheetStock = {
  code: string;
  name: string;
  subBoardName: string;
  price: number;
  changePct: number | null;
  active?: boolean;
};

export function MobileStockSheet({
  title,
  stock,
  stocks,
  sectorStats,
  messages,
  priceColorMode,
  heatTheme,
  displayMode,
  sortKey,
  isInWatchlist,
  onSortChange,
  onClose,
  onSelectStock,
  onToggleWatchlist,
  onOpenXueqiu,
}: {
  title: string | null;
  stock: MobileStockSheetStock | null;
  stocks: MobileStockSheetStock[];
  sectorStats: {
    advanceCount: number;
    declineCount: number;
    changePct: number | null;
  } | null;
  messages: HeatmapMessages;
  priceColorMode: PriceColorMode;
  heatTheme: HeatTheme;
  displayMode: DisplayMode;
  sortKey: InspectorSortKey;
  isInWatchlist: boolean;
  onSortChange: (next: InspectorSortKey) => void;
  onClose: () => void;
  onSelectStock: (code: string) => void;
  onToggleWatchlist: () => void;
  onOpenXueqiu: (code: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-[9998] flex flex-col justify-end" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label={messages.closeSheet}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div className="relative flex max-h-[82vh] w-full flex-col rounded-t-2xl border-t border-slate-700/80 bg-[#0f1319] text-slate-100 shadow-[0_-20px_60px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-center pt-2">
          <span className="h-1 w-10 rounded-full bg-slate-600/80" aria-hidden />
        </div>

        <div className="flex items-start justify-between gap-3 px-4 pt-2 pb-3">
          <div className="min-w-0">
            <p className="text-[12px] font-medium tracking-[0.04em] text-slate-400">{title ?? ""}</p>
            {stock ? (
              <>
                <p className="mt-1 text-[18px] font-semibold leading-tight text-white [word-break:keep-all]">
                  {stock.name}
                </p>
                <div className="mt-1 flex items-baseline gap-3 tabular-nums">
                  <span className="text-[20px] font-semibold text-white">{formatPrice(stock.price)}</span>
                  <span
                    className="text-[15px] font-semibold"
                    style={{
                      color: getChangeTextColor(heatTheme, stock.changePct, priceColorMode, displayMode),
                    }}
                  >
                    {formatChange(stock.changePct)}
                  </span>
                </div>
              </>
            ) : (
              <p className="mt-1 text-[13px] text-slate-400">{messages.mobileTapHint}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={messages.closeSheet}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-slate-700/80 bg-slate-800/60 text-slate-200 transition-colors hover:bg-slate-700/80"
          >
            <X className="size-4" />
          </button>
        </div>

        {stock && (
          <>
            <div className="mx-4 mb-3 flex justify-center overflow-hidden rounded-md border border-slate-700/80 bg-white px-2 py-1">
              <img
                src={getDailyKlineUrl(stock.code)}
                alt={`${stock.name} K-line`}
                className="h-auto w-[88%] object-contain"
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="flex items-center justify-between gap-2 px-4 pb-3">
              <button
                type="button"
                onClick={onToggleWatchlist}
                className={cn(
                  "inline-flex flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2 text-[13px] font-medium transition-colors",
                  isInWatchlist
                    ? "border-amber-400/70 bg-amber-400/15 text-amber-200 hover:bg-amber-400/25"
                    : "border-slate-600 bg-slate-800/70 text-slate-100 hover:bg-slate-700/80"
                )}
              >
                <Star className="size-3.5" fill={isInWatchlist ? "currentColor" : "none"} />
                {isInWatchlist ? messages.watchlistQuickRemove : messages.watchlistQuickAdd}
              </button>
              <button
                type="button"
                onClick={() => onOpenXueqiu(stock.code)}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-slate-600 bg-slate-800/70 px-3 py-2 text-[13px] font-medium text-slate-100 transition-colors hover:bg-slate-700/80"
              >
                <ExternalLink className="size-3.5" />
                {messages.mobileOpenInXueqiu}
              </button>
            </div>
          </>
        )}

        {stocks.length > 0 && (
          <div className="flex min-h-0 flex-1 flex-col border-t border-slate-700/80 bg-[#0b0e13]">
            <div className="space-y-1 border-b border-slate-800/80 px-4 py-1.5">
              <div className="flex items-center justify-between gap-2 text-[11px] font-medium tracking-[0.08em] text-slate-400">
                <span className="min-w-0 truncate">{title ?? ""}</span>
                {sectorStats ? (
                  <div className="flex shrink-0 items-baseline gap-2 tabular-nums">
                    <span className="font-semibold text-slate-300">
                      {formatBoardTrendCounts(messages, sectorStats.advanceCount, sectorStats.declineCount)}
                    </span>
                    <span
                      className="font-semibold"
                      style={{
                        color: getChangeTextColor(heatTheme, sectorStats.changePct, priceColorMode, displayMode),
                      }}
                    >
                      {formatChange(sectorStats.changePct)}
                    </span>
                  </div>
                ) : (
                  <span className="tabular-nums">{stocks.length}</span>
                )}
              </div>
              <InspectorSortControls
                sortKey={sortKey}
                messages={messages}
                tone="dark"
                onChange={onSortChange}
              />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
              {stock && (
                <div className="sticky top-0 z-10 flex w-full items-center gap-3 border-b border-b-slate-800/80 bg-[#1a212b] px-4 py-2.5 text-left text-[13px] shadow-[0_8px_16px_rgba(0,0,0,0.28)]">
                  <span className="min-w-0 flex-1 truncate font-semibold text-white">{stock.name}</span>
                  <img
                    src={getSparklineUrl(stock.code)}
                    alt=""
                    className="h-5 w-[72px] shrink-0 object-contain opacity-90"
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                  />
                  <span className="w-14 shrink-0 text-right text-[12px] tabular-nums text-slate-300">
                    {formatPrice(stock.price)}
                  </span>
                  <span
                    className="w-16 shrink-0 text-right text-[12px] font-semibold tabular-nums"
                    style={{
                      color: getChangeTextColor(heatTheme, stock.changePct, priceColorMode, displayMode),
                    }}
                  >
                    {formatChange(stock.changePct)}
                  </span>
                </div>
              )}
              {stocks
                .filter((item) => item.code !== stock?.code)
                .map((item) => (
                  <button
                    type="button"
                    key={item.code}
                    onClick={() => onSelectStock(item.code)}
                    className="flex w-full items-center gap-3 border-b border-b-slate-800/80 px-4 py-2.5 text-left text-[13px] text-slate-200 transition-colors hover:bg-slate-800/40"
                  >
                    <span className="min-w-0 flex-1 truncate font-medium">{item.name}</span>
                    <img
                      src={getSparklineUrl(item.code)}
                      alt=""
                      className="h-5 w-[72px] shrink-0 object-contain opacity-90"
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                    />
                    <span className="w-14 shrink-0 text-right text-[12px] tabular-nums text-slate-300">
                      {formatPrice(item.price)}
                    </span>
                    <span
                      className="w-16 shrink-0 text-right text-[12px] font-semibold tabular-nums"
                      style={{
                        color: getChangeTextColor(heatTheme, item.changePct, priceColorMode, displayMode),
                      }}
                    >
                      {formatChange(item.changePct)}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

