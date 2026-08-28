"use client";

import { useEffect, useRef } from "react";

import { createHeatmapThemeWebMcpTools } from "@/lib/heatmap-webmcp";
import { createHeatmapViewWebMcpTools } from "@/lib/heatmap-webmcp-view";
import { createHeatmapWatchlistWebMcpTools } from "@/lib/heatmap-webmcp-watchlist";
import type {
  HeatmapChangeRange,
  HeatmapSizeMode,
  HeatmapTrendFilter,
  HeatmapWebMcpActions,
  HeatmapWebMcpState,
} from "@/lib/heatmap-webmcp-types";
import type { HeatTheme } from "@/lib/heatmap-themes";
import type { HeatmapPeriodKey, HeatmapUniverse } from "@/lib/market-heatmap";
import type { WatchlistItem } from "@/lib/watchlist";

type UseHeatmapWebMcpOptions = HeatmapWebMcpState & {
  enabled: boolean;
  onHeatThemeIdChange: (id: string) => void;
  onCustomHeatThemesChange: (themes: HeatTheme[]) => void;
  onMarketChange: (market: HeatmapUniverse) => void;
  onPeriodChange: (period: HeatmapPeriodKey) => void;
  onBoardFilterChange: (boardNames: string[]) => void;
  onTrendFilterChange: (filter: HeatmapTrendFilter) => void;
  onChangeRangeFilterChange: (range: HeatmapChangeRange) => void;
  onSizeModeChange: (mode: HeatmapSizeMode) => void;
  onThumbnailModeChange: (enabled: boolean) => void;
  onViewChange: (view: { scale: number; x: number; y: number }) => void;
  onSelectStock: (code: string | null) => void;
  onSelectBoard: (name: string | null) => void;
  onSelectSubBoard: (name: string | null) => void;
  onRetryDataLoad: () => void;
  onResetView: () => void;
  onCreateSharePreview: () => Promise<void>;
  onAddWatchlistItem: (item: WatchlistItem) => boolean;
  onRemoveWatchlistItem: (code: string) => void;
  onClearWatchlist: () => void;
};

export function useHeatmapWebMcp({
  enabled,
  onHeatThemeIdChange,
  onCustomHeatThemesChange,
  onMarketChange,
  onPeriodChange,
  onBoardFilterChange,
  onTrendFilterChange,
  onChangeRangeFilterChange,
  onSizeModeChange,
  onThumbnailModeChange,
  onViewChange,
  onSelectStock,
  onSelectBoard,
  onSelectSubBoard,
  onRetryDataLoad,
  onResetView,
  onCreateSharePreview,
  onAddWatchlistItem,
  onRemoveWatchlistItem,
  onClearWatchlist,
  ...state
}: UseHeatmapWebMcpOptions) {
  const stateRef = useRef<HeatmapWebMcpState>(state);
  const actionsRef = useRef<HeatmapWebMcpActions>({
    setMarket: onMarketChange,
    setPeriod: onPeriodChange,
    setBoardFilter: onBoardFilterChange,
    setTrendFilter: onTrendFilterChange,
    setChangeRangeFilter: onChangeRangeFilterChange,
    setSizeMode: onSizeModeChange,
    setThumbnailMode: onThumbnailModeChange,
    setView: onViewChange,
    selectStock: onSelectStock,
    selectBoard: onSelectBoard,
    selectSubBoard: onSelectSubBoard,
    retryDataLoad: onRetryDataLoad,
    resetView: onResetView,
    createSharePreview: onCreateSharePreview,
    addWatchlistItem: onAddWatchlistItem,
    removeWatchlistItem: onRemoveWatchlistItem,
    clearWatchlist: onClearWatchlist,
    selectTheme: (theme) => onHeatThemeIdChange(theme.id),
    createTheme: (theme) => {
      const nextCustomThemes = [...stateRef.current.customHeatThemes, theme];
      stateRef.current.customHeatThemes = nextCustomThemes;
      stateRef.current.heatThemeId = theme.id;
      onCustomHeatThemesChange(nextCustomThemes);
      onHeatThemeIdChange(theme.id);
    },
  });

  useEffect(() => {
    stateRef.current = state;
    actionsRef.current = {
      ...actionsRef.current,
      setMarket: onMarketChange,
      setPeriod: onPeriodChange,
      setBoardFilter: onBoardFilterChange,
      setTrendFilter: onTrendFilterChange,
      setChangeRangeFilter: onChangeRangeFilterChange,
      setSizeMode: onSizeModeChange,
      setThumbnailMode: onThumbnailModeChange,
      setView: onViewChange,
      selectStock: onSelectStock,
      selectBoard: onSelectBoard,
      selectSubBoard: onSelectSubBoard,
      retryDataLoad: onRetryDataLoad,
      resetView: onResetView,
      createSharePreview: onCreateSharePreview,
      addWatchlistItem: onAddWatchlistItem,
      removeWatchlistItem: onRemoveWatchlistItem,
      clearWatchlist: onClearWatchlist,
      selectTheme: (theme) => onHeatThemeIdChange(theme.id),
      createTheme: (theme) => {
        const nextCustomThemes = [...stateRef.current.customHeatThemes, theme];
        stateRef.current.customHeatThemes = nextCustomThemes;
        stateRef.current.heatThemeId = theme.id;
        onCustomHeatThemesChange(nextCustomThemes);
        onHeatThemeIdChange(theme.id);
      },
    };
  }, [
    onAddWatchlistItem,
    onBoardFilterChange,
    onChangeRangeFilterChange,
    onClearWatchlist,
    onCreateSharePreview,
    onCustomHeatThemesChange,
    onHeatThemeIdChange,
    onMarketChange,
    onPeriodChange,
    onRemoveWatchlistItem,
    onResetView,
    onRetryDataLoad,
    onSelectBoard,
    onSelectStock,
    onSelectSubBoard,
    onSizeModeChange,
    onThumbnailModeChange,
    onTrendFilterChange,
    onViewChange,
    state,
  ]);

  useEffect(() => {
    if (!enabled || typeof document === "undefined" || !document.modelContext) return;

    const controller = new AbortController();
    const context = { stateRef, actionsRef };
    const tools = [
      ...createHeatmapThemeWebMcpTools(context),
      ...createHeatmapViewWebMcpTools(context),
      ...createHeatmapWatchlistWebMcpTools(context),
    ];

    void Promise.all(
      tools.map((tool) => document.modelContext!.registerTool(tool, { signal: controller.signal }))
    ).catch((error: unknown) => {
      if (!controller.signal.aborted) console.warn("Unable to register WebMCP heatmap tools", error);
    });

    return () => controller.abort();
  }, [enabled]);
}
