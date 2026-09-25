"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { Check, ListFilter, X } from "lucide-react";
import { createPortal } from "react-dom";
import { cn, clamp } from "@/lib/utils";
import { type HeatmapMessages, type Locale } from "@/lib/i18n";
import { type HeatmapPeriodKey } from "@/lib/market-heatmap";
import { allTrendsValue, changeRangeSpanPresets, emptyChangeRangeFilter, fallingOnlyValue, periodOptions, risingOnlyValue } from "./constants";
import { getCompactPeriodLabel, getPeriodLabel } from "./format";
import { changeRangeFiltersEqual, isChangeRangeActive } from "./filters";
import { type ChangeRangeFilter, type HeatmapSizeMode } from "./types";
import { ChangeRangeSlider } from "./change-range-slider";

export function filterChipClass(active: boolean) {
  return cn(
    "h-8 border px-2 text-center text-[12px] font-semibold leading-tight transition-colors",
    active
      ? "border-brand/70 bg-brand/18 text-foreground"
      : "border-border bg-background/80 text-muted-foreground hover:bg-muted hover:text-foreground"
  );
}

export function getViewportSize() {
  const visual = typeof window !== "undefined" ? window.visualViewport : null;
  return {
    width: visual?.width ?? window.innerWidth,
    height: visual?.height ?? window.innerHeight,
    offsetLeft: visual?.offsetLeft ?? 0,
    offsetTop: visual?.offsetTop ?? 0,
  };
}

export function FilterPopover({
  open,
  isMobile,
  closeLabel,
  triggerRefs,
  layoutKey,
  onClose,
  onMouseEnter,
  onMouseLeave,
  children,
}: {
  open: boolean;
  isMobile: boolean;
  closeLabel: string;
  triggerRefs: Array<RefObject<HTMLButtonElement | null>>;
  layoutKey: string;
  onClose: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [style, setStyle] = useState<CSSProperties>({
    position: "fixed",
    left: 12,
    top: 12,
    width: 340,
    maxHeight: "calc(100dvh - 16px)",
    zIndex: 80,
  });

  useLayoutEffect(() => {
    if (!open || isMobile) {
      return;
    }

    const update = () => {
      const trigger = triggerRefs
        .map((item) => item.current)
        .find((node) => {
          if (!node) {
            return false;
          }
          const rect = node.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
      const viewport = getViewportSize();
      const margin = 8;
      const width = Math.min(340, viewport.width - margin * 2);
      const header = panelRef.current?.querySelector("header");
      const scrollContent = panelRef.current?.querySelector<HTMLElement>("[data-filter-scroll]");
      const contentHeight =
        (header?.getBoundingClientRect().height ?? 0) + (scrollContent?.scrollHeight ?? 0) + 2;
      const availableHeight = Math.max(240, viewport.height - margin * 2);
      const height = Math.min(Math.max(240, contentHeight || 560), availableHeight);
      let left = viewport.offsetLeft + margin;
      let top = viewport.offsetTop + margin;

      if (trigger) {
        const rect = trigger.getBoundingClientRect();
        left = rect.right + 8;
        top = rect.top;
        if (left + width > viewport.offsetLeft + viewport.width - margin) {
          left = Math.min(
            Math.max(viewport.offsetLeft + margin, rect.left),
            viewport.offsetLeft + viewport.width - width - margin
          );
        }
      }

      const minTop = viewport.offsetTop + margin;
      const maxTop = Math.max(minTop, viewport.offsetTop + viewport.height - height - margin);
      top = clamp(top, minTop, maxTop);

      setStyle({
        position: "fixed",
        left,
        top,
        width,
        height,
        maxHeight: availableHeight,
        zIndex: 80,
      });
    };

    update();
    const frame = window.requestAnimationFrame(update);
    const timer = window.setTimeout(update, 320);
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    document.addEventListener("scroll", update, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
      document.removeEventListener("scroll", update, true);
    };
  }, [isMobile, layoutKey, open, triggerRefs]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  if (isMobile) {
    return createPortal(
      <div className="fixed inset-0 z-[10010] flex flex-col justify-end" role="presentation">
        <button
          type="button"
          aria-label={closeLabel}
          onClick={onClose}
          className="absolute inset-0 bg-black/62 backdrop-blur-sm"
        />
        <div className="relative flex h-[min(92dvh,100%)] max-h-[92dvh] w-full flex-col pb-[env(safe-area-inset-bottom)]">
          {children}
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div
      ref={panelRef}
      style={style}
      className="flex flex-col overflow-hidden"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>,
    document.body
  );
}

export function FilterPanel({
  layout = "popover",
  messages,
  locale,
  shortcutLabel,
  boards,
  boardFilter,
  trendFilter,
  changeRangeFilter,
  changeRangeMinInput,
  changeRangeMaxInput,
  sizeMode,
  thumbnailMode,
  period,
  legendGradient,
  activeFilterCount,
  onClose,
  onToggleBoard,
  onClearBoardFilter,
  onTrendFilterChange,
  onChangeRangeMinInputChange,
  onChangeRangeMaxInputChange,
  onCommitChangeRange,
  onChangeRange,
  onClearChangeRange,
  onSizeModeChange,
  onThumbnailModeChange,
  onPeriodChange,
  onResetFilters,
}: {
  layout?: "popover" | "sheet";
  messages: HeatmapMessages;
  locale: Locale;
  shortcutLabel: string;
  boards: Array<{ code: string; name: string; stockCount: number }>;
  boardFilter: string[];
  trendFilter: string;
  changeRangeFilter: ChangeRangeFilter;
  changeRangeMinInput: string;
  changeRangeMaxInput: string;
  sizeMode: HeatmapSizeMode;
  thumbnailMode: boolean;
  period: HeatmapPeriodKey;
  legendGradient: string;
  activeFilterCount: number;
  onClose: () => void;
  onToggleBoard: (boardName: string) => void;
  onClearBoardFilter: () => void;
  onTrendFilterChange: (value: string) => void;
  onChangeRangeMinInputChange: (value: string) => void;
  onChangeRangeMaxInputChange: (value: string) => void;
  onCommitChangeRange: () => void;
  onChangeRange: (range: ChangeRangeFilter) => void;
  onClearChangeRange: () => void;
  onSizeModeChange: (mode: HeatmapSizeMode) => void;
  onThumbnailModeChange: (enabled: boolean) => void;
  onPeriodChange: (next: HeatmapPeriodKey) => void;
  onResetFilters: () => void;
}) {
  const panelRef = useRef<HTMLElement | null>(null);
  const isAllBoardsSelected = boardFilter.length === 0;
  const selectedBoardCountLabel = messages.selectedBoardCount.replace("{count}", String(boardFilter.length));

  useEffect(() => {
    if (layout === "sheet") {
      return;
    }

    function onPointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement | null;
      if (!target) {
        return;
      }
      if (panelRef.current?.contains(target) || target.closest("[data-heatmap-filter-trigger]")) {
        return;
      }
      onClose();
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [layout, onClose]);

  return (
    <section
      ref={panelRef}
      role="dialog"
      aria-labelledby="heatmap-filters-title"
      aria-modal={layout === "sheet" ? true : undefined}
      className={cn(
        "flex h-full min-h-0 w-full flex-col overflow-hidden border border-border bg-card/96 text-card-foreground backdrop-blur-sm",
        layout === "sheet"
          ? "rounded-t-lg border-b-0 shadow-[0_-24px_100px_rgba(0,0,0,0.48)]"
          : "shadow-[0_18px_48px_rgba(0,0,0,0.28)]"
      )}
    >
      {layout === "sheet" && (
        <div className="flex items-center justify-center pt-2">
          <span className="h-1 w-10 rounded-full bg-muted-foreground/40" aria-hidden />
        </div>
      )}
      <header className="flex items-center justify-between gap-2 border-b border-border px-2.5 py-2.5 sm:py-2">
        <div className="flex min-w-0 items-center gap-2">
          <ListFilter className="size-3.5 shrink-0 text-muted-foreground" />
          <h2 id="heatmap-filters-title" className="text-[13px] font-semibold leading-none">
            {messages.filtersTitle}
          </h2>
          {layout !== "sheet" && (
            <span className="font-mono text-[10px] font-semibold text-muted-foreground">{shortcutLabel}</span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={onResetFilters}
              className="px-1.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {messages.filtersReset}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label={messages.closeSheet}
            className="inline-flex size-7 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </header>

      <div
        data-filter-scroll
        className={cn(
          "min-h-0 flex-1 space-y-3.5 overflow-y-auto p-2.5",
          layout === "sheet" && "space-y-4 overscroll-contain"
        )}
      >
        <section>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <h3 className="text-[11px] font-semibold text-muted-foreground">{messages.boardFilterLabel}</h3>
            {!isAllBoardsSelected && (
              <button
                type="button"
                onClick={onClearBoardFilter}
                className="text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {messages.clearBoardFilter}
              </button>
            )}
          </div>
          <div className="overflow-hidden border border-border">
            <button
              type="button"
              onClick={onClearBoardFilter}
              className={cn(
                "flex h-8 w-full items-center px-2.5 text-left text-[12px] font-semibold transition-colors",
                isAllBoardsSelected
                  ? "bg-brand/18 text-foreground"
                  : "bg-background/70 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {isAllBoardsSelected ? messages.allBoards : selectedBoardCountLabel}
            </button>
            <div
              className={cn(
                "overflow-y-auto overscroll-contain border-t border-border",
                layout === "sheet" ? "max-h-48" : "max-h-40"
              )}
            >
              {boards.map((board) => {
                const isSelected = boardFilter.includes(board.name);
                return (
                  <button
                    key={board.code}
                    type="button"
                    onClick={() => onToggleBoard(board.name)}
                    className={cn(
                      "flex h-8 w-full min-w-0 items-center gap-2 px-2.5 text-left transition-colors",
                      isSelected ? "bg-brand/12 text-foreground" : "text-foreground hover:bg-muted"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex size-3.5 shrink-0 items-center justify-center border",
                        isSelected
                          ? "border-brand bg-brand text-brand-foreground"
                          : "border-border bg-background"
                      )}
                      aria-hidden
                    >
                      {isSelected ? <Check className="size-2.5" strokeWidth={3} /> : null}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[12px] leading-tight">{board.name}</span>
                    <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                      {board.stockCount}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <div className={layout === "sheet" ? "grid grid-cols-2 gap-3" : "space-y-3.5"}>
          <section>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <h3 className="text-[11px] font-semibold text-muted-foreground">{messages.metricLabel}</h3>
              <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
                {getPeriodLabel(messages, period)}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {periodOptions.map((option) => {
                const isActive = period === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => onPeriodChange(option)}
                    title={getPeriodLabel(messages, option)}
                    aria-pressed={isActive}
                    className={filterChipClass(isActive)}
                  >
                    {getCompactPeriodLabel(option, locale)}
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <h3 className="mb-1.5 text-[11px] font-semibold text-muted-foreground">{messages.trendFilterLabel}</h3>
            <div className="grid grid-cols-3 gap-1">
              <button
                type="button"
                onClick={() => onTrendFilterChange(allTrendsValue)}
                aria-pressed={trendFilter === allTrendsValue}
                className={filterChipClass(trendFilter === allTrendsValue)}
              >
                {messages.allTrends}
              </button>
              <button
                type="button"
                onClick={() => onTrendFilterChange(risingOnlyValue)}
                aria-pressed={trendFilter === risingOnlyValue}
                className={filterChipClass(trendFilter === risingOnlyValue)}
              >
                {messages.risingOnly}
              </button>
              <button
                type="button"
                onClick={() => onTrendFilterChange(fallingOnlyValue)}
                aria-pressed={trendFilter === fallingOnlyValue}
                className={filterChipClass(trendFilter === fallingOnlyValue)}
              >
                {messages.fallingOnly}
              </button>
            </div>
          </section>
        </div>

        <section>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <h3 className="text-[11px] font-semibold text-muted-foreground">{messages.changeRangeFilterLabel}</h3>
            {isChangeRangeActive(changeRangeFilter) && (
              <button
                type="button"
                onClick={onClearChangeRange}
                className="text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {messages.clearChangeRangeFilter}
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <div className="relative min-w-0 flex-1">
              <input
                id="filter-change-range-min"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                spellCheck={false}
                value={changeRangeMinInput}
                placeholder={messages.changeRangeUnbounded}
                aria-label={messages.changeRangeMinPlaceholder}
                onChange={(event) => onChangeRangeMinInputChange(event.target.value)}
                onBlur={onCommitChangeRange}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.currentTarget.blur();
                  }
                }}
                className="h-8 w-full border border-border bg-background/80 py-0 pl-2 pr-6 text-[12px] font-semibold tabular-nums text-foreground outline-none transition-colors placeholder:font-medium placeholder:text-muted-foreground/65 focus:border-brand/60"
              />
              <span className="pointer-events-none absolute inset-y-0 right-1.5 flex items-center text-[10px] font-semibold text-muted-foreground">
                %
              </span>
            </div>
            <span className="shrink-0 text-[11px] text-muted-foreground">~</span>
            <div className="relative min-w-0 flex-1">
              <input
                id="filter-change-range-max"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                spellCheck={false}
                value={changeRangeMaxInput}
                placeholder={messages.changeRangeUnbounded}
                aria-label={messages.changeRangeMaxPlaceholder}
                onChange={(event) => onChangeRangeMaxInputChange(event.target.value)}
                onBlur={onCommitChangeRange}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.currentTarget.blur();
                  }
                }}
                className="h-8 w-full border border-border bg-background/80 py-0 pl-2 pr-6 text-[12px] font-semibold tabular-nums text-foreground outline-none transition-colors placeholder:font-medium placeholder:text-muted-foreground/65 focus:border-brand/60"
              />
              <span className="pointer-events-none absolute inset-y-0 right-1.5 flex items-center text-[10px] font-semibold text-muted-foreground">
                %
              </span>
            </div>
          </div>
          <div className="mt-2">
            <ChangeRangeSlider
              value={changeRangeFilter}
              gradient={legendGradient}
              minAriaLabel={messages.changeRangeMinPlaceholder}
              maxAriaLabel={messages.changeRangeMaxPlaceholder}
              onChange={onChangeRange}
            />
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1">
            {changeRangeSpanPresets.map((preset) => {
              const isActive = changeRangeFiltersEqual(changeRangeFilter, preset);
              return (
                <button
                  key={preset.label}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() =>
                    onChangeRange(isActive ? emptyChangeRangeFilter : { min: preset.min, max: preset.max })
                  }
                  className={cn(
                    "h-7 border text-[11px] font-semibold tabular-nums transition-colors",
                    isActive
                      ? "border-brand/70 bg-brand/18 text-foreground"
                      : "border-border bg-background/80 text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </section>

        <div className={layout === "sheet" ? "grid grid-cols-2 gap-3" : "space-y-3.5"}>
          <section>
            <h3 className="mb-1.5 text-[11px] font-semibold text-muted-foreground">{messages.sizeModeLabel}</h3>
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => onSizeModeChange("marketCap")}
                aria-pressed={sizeMode === "marketCap"}
                className={filterChipClass(sizeMode === "marketCap")}
              >
                {messages.sizeModeMarketCap}
              </button>
              <button
                type="button"
                onClick={() => onSizeModeChange("turnover")}
                aria-pressed={sizeMode === "turnover"}
                className={filterChipClass(sizeMode === "turnover")}
              >
                {messages.sizeModeTurnover}
              </button>
            </div>
          </section>

          <section>
            <h3 className="mb-1.5 text-[11px] font-semibold text-muted-foreground">{messages.thumbnailModeLabel}</h3>
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => onThumbnailModeChange(false)}
                aria-pressed={!thumbnailMode}
                className={filterChipClass(!thumbnailMode)}
              >
                {messages.thumbnailModeOff}
              </button>
              <button
                type="button"
                onClick={() => onThumbnailModeChange(true)}
                aria-pressed={thumbnailMode}
                className={filterChipClass(thumbnailMode)}
              >
                {messages.thumbnailModeOn}
              </button>
            </div>
          </section>
        </div>
      </div>

      {layout === "sheet" && (
        <footer className="flex shrink-0 gap-2 border-t border-border bg-card/98 p-2.5">
          <button
            type="button"
            onClick={onResetFilters}
            disabled={activeFilterCount === 0}
            className="h-10 flex-1 border border-border bg-background/80 px-3 text-[12px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            {messages.filtersReset}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-10 flex-[1.35] bg-brand px-3 text-[12px] font-semibold text-brand-foreground transition-colors hover:bg-brand/90"
          >
            {messages.closeSheet}
          </button>
        </footer>
      )}
    </section>
  );
}

