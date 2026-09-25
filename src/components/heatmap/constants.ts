import { heatmapPeriodKeys, marketKeys, type HeatmapPeriodKey, type MarketKey } from "@/lib/market-heatmap";

import type { ChangeRangeFilter, DisplayMode, QuoteMap, ThemeColorKey } from "./types";

export const marketOptions: MarketKey[] = [...marketKeys];
export const periodOptions: HeatmapPeriodKey[] = [...heatmapPeriodKeys];

export const allBoardsValue = "__all__";
export const allTrendsValue = "__all__";
export const risingOnlyValue = "__rising__";
export const fallingOnlyValue = "__falling__";
export const marketStorageKey = "heatmap-market";
export const periodStorageKey = "heatmap-period";
export const boardFilterStorageKey = "heatmap-board-filter";
export const trendFilterStorageKey = "heatmap-trend-filter";
export const changeRangeFilterStorageKey = "heatmap-change-range-filter";
export const filterOpenModeStorageKey = "heatmap-filter-open-mode";
export const thumbnailModeStorageKey = "heatmap-thumbnail-mode";
export const headerTrendStatsStorageKey = "heatmap-header-trend-stats";
export const heatmapBordersStorageKey = "heatmap-borders";
export const heatmapBordersQueryKey = "borders";
export const refreshIntervalStorageKey = "heatmap-refresh-interval";
export const defaultRefreshIntervalSeconds = 8;
export const minRefreshIntervalSeconds = 3;
export const maxRefreshIntervalSeconds = 600;
export const progressiveQuoteCommitIntervalMs = 500;
export const emptyQuoteMap: QuoteMap = {};

export const filterHoverOpenDelayMs = 180;
export const filterHoverCloseDelayMs = 160;
export const changeRangeSliderMin = -20;
export const changeRangeSliderMax = 20;
export const changeRangeSliderStep = 1;
export const changeRangeSliderTicks = [-20, -10, 0, 10, 20] as const;
export const changeRangeSpanPresets = [
  { min: -3, max: 3, label: "±3%" },
  { min: -5, max: 5, label: "±5%" },
  { min: 0, max: 5, label: "0~5%" },
  { min: 5, max: 10, label: "5~10%" },
  { min: -5, max: 0, label: "-5~0%" },
  { min: -10, max: -5, label: "-10~-5%" },
] as const;

export const emptyChangeRangeFilter: ChangeRangeFilter = { min: null, max: null };

export const colorLegendSteps = [-4, -3, -2, -1, 0, 1, 2, 3, 4] as const;
export const legendTicks = [-4, -2, 0, 2, 4] as const;
export const minZoom = 1;
export const desktopMaxZoom = 8;
export const mobileMaxZoom = 12;
export const flatThreshold = 0.1;
export const githubProjectUrl = "https://github.com/wenyuanw/a-share-heatmap";
export const authorEmail = "hi@wenyuanw.me";
export const authorMailto = `mailto:${authorEmail}`;

export const themeColors: Record<
  ThemeColorKey,
  {
    swatch: string;
    foreground: string;
  }
> = {
  green: { swatch: "#22c55e", foreground: "#041108" },
  red: { swatch: "#ef4444", foreground: "#ffffff" },
  blue: { swatch: "#38bdf8", foreground: "#031018" },
  violet: { swatch: "#a78bfa", foreground: "#13091f" },
};

export const heatmapCanvasThemes: Record<
  DisplayMode,
  {
    backgroundStart: string;
    backgroundEnd: string;
    boardFill: string;
    subBoardFill: string;
    subBoardBorder: string;
    activeSubBoardStroke: string;
    activeSubBoardInner: string;
    boardBorder: string;
    activeBoardStroke: string;
    highlightOuter: string;
    highlightInner: string;
    chrome: string;
  }
> = {
  dark: {
    backgroundStart: "#171b22",
    backgroundEnd: "#10141b",
    boardFill: "#20252d",
    subBoardFill: "rgba(18, 23, 31, 0.62)",
    subBoardBorder: "rgba(148, 163, 184, 0.3)",
    activeSubBoardStroke: "#5eead4",
    activeSubBoardInner: "rgba(8, 47, 73, 0.92)",
    boardBorder: "rgba(148, 163, 184, 0.48)",
    activeBoardStroke: "#f6d36d",
    highlightOuter: "rgba(2, 6, 23, 0.92)",
    highlightInner: "#f8fafc",
    chrome: "#10141b",
  },
  light: {
    backgroundStart: "#f6f8fb",
    backgroundEnd: "#e8eef6",
    boardFill: "#d8e0eb",
    subBoardFill: "rgba(255, 255, 255, 0.82)",
    subBoardBorder: "rgba(100, 116, 139, 0.26)",
    activeSubBoardStroke: "#0f766e",
    activeSubBoardInner: "rgba(15, 118, 110, 0.28)",
    boardBorder: "rgba(71, 85, 105, 0.34)",
    activeBoardStroke: "#b45309",
    highlightOuter: "rgba(15, 23, 42, 0.42)",
    highlightInner: "#ffffff",
    chrome: "#e8eef6",
  },
};
