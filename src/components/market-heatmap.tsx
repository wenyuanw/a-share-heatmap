"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type RefObject,
} from "react";
import {
  Camera,
  Bot,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  Info,
  Keyboard,
  LayoutGrid,
  ListFilter,
  Loader2,
  Mail,
  Menu,
  Maximize2,
  Megaphone,
  Minimize2,
  Moon,
  Palette,
  Pencil,
  Plus,
  RotateCcw,
  Settings2,
  Share2,
  Star,
  Sun,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { WatchlistManager } from "@/components/watchlist-panel";
import { cn } from "@/lib/utils";
import { getMessages, type HeatmapMessages, type Locale } from "@/lib/i18n";
import {
  boardHeaderColorFromTheme,
  buildHeatThemeExport,
  builtinHeatThemes,
  cloneHeatTheme,
  createCustomHeatTheme,
  customHeatThemesStorageKey,
  defaultHeatThemeId,
  heatStopFields,
  heatThemeStorageKey,
  legendGradientFromTheme,
  parseHeatThemeExport,
  parseStoredCustomHeatThemes,
  mergeSeedHeatThemes,
  heatThemesSeedStorageKey,
  previewGradientFromStops,
  resolveHeatTheme,
  rgbToHex,
  serializeCustomHeatThemes,
  parseHexColor,
  heatColorFromTheme,
  uiChangeTextColor,
  uiPolarityColor,
  type HeatStopField,
  type HeatTheme,
} from "@/lib/heatmap-themes";
import {
  defaultShortcutBindings,
  formatShortcutKey,
  formatShortcutLabel,
  parseStoredShortcuts,
  resolveShortcutAction,
  serializeShortcuts,
  shortcutActionIds,
  shortcutStorageKey,
  withReboundShortcut,
  type ShortcutActionId,
  type ShortcutBindings,
} from "@/lib/heatmap-shortcuts";
import {
  heatmapPeriodKeys,
  isHeatmapPeriodKey,
  isHeatmapUniverse,
  marketKeys,
  watchlistMaxCount,
  watchlistUniverseKey,
  getBundledSnapshotTreemap,
  type HeatmapPeriodKey,
  type HeatmapUniverse,
  type MarketDataSource,
  type MarketKey,
  type MarketOverviewResponse,
  type TreemapResponse,
} from "@/lib/market-heatmap";
import {
  parseStoredWatchlist,
  parseWatchlistExportPayload,
  serializeWatchlist,
  watchlistStorageKey,
  type WatchlistItem,
} from "@/lib/watchlist";
import { useHeatmapWebMcp } from "@/hooks/use-heatmap-webmcp";

type QuoteMap = Record<string, { price: number; changePct: number; turnoverAmount: number }>;

const inspectorSortKeys = ["changeDesc", "changeAsc", "changeAbs", "turnover", "name"] as const;
type InspectorSortKey = (typeof inspectorSortKeys)[number];

type InspectorStockItem = {
  code: string;
  name: string;
  subBoardName: string;
  price: number;
  changePct: number;
  turnoverAmount: number;
  marketCap: number;
};

type StockRect = {
  code: string;
  name: string;
  boardName: string;
  subBoardName: string;
  value: number;
  x: number;
  y: number;
  width: number;
  height: number;
  price: number;
  changePct: number;
};

type BoardTrendStats = {
  advanceCount: number;
  flatCount: number;
  declineCount: number;
};

type BoardRect = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  stockCount: number;
  titleHeight: number;
  changePct: number;
  advanceCount: number;
  flatCount: number;
  declineCount: number;
};

type SubBoardRect = {
  name: string;
  boardName: string;
  x: number;
  y: number;
  width: number;
  height: number;
  stockCount: number;
  titleHeight: number;
  changePct: number;
  advanceCount: number;
  flatCount: number;
  declineCount: number;
};

type TreemapInput<T> = {
  item: T;
  value: number;
};

type TreemapRect<T> = {
  item: T;
  x: number;
  y: number;
  width: number;
  height: number;
};

type Bounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type MarketSummary = {
  changePct: number;
  stockCount: number;
  updatedAt: string;
};

type MarketOverview = {
  advanceCount: number;
  flatCount: number;
  declineCount: number;
  turnoverAmount: number;
  turnoverPreviousAmount: number;
  turnoverDelta: number;
};

type ScreenshotPreview = {
  url: string;
  filename: string;
  blob: Blob;
};

type PriceColorMode = "red-rise" | "green-rise";
type ThemeColorKey = "green" | "red" | "blue" | "violet";
type DisplayMode = "dark" | "light";
type FilterOpenMode = "click" | "hover";
type SettingsTab = "appearance" | "watchlist" | "shortcuts" | "help" | "webmcp" | "project";
type HeatmapSizeMode = "marketCap" | "turnover";

const marketOptions: MarketKey[] = [...marketKeys];
const periodOptions: HeatmapPeriodKey[] = [...heatmapPeriodKeys];

function createEmptyWatchlistTreemap(period: HeatmapPeriodKey): TreemapResponse {
  return {
    market: "all",
    period,
    updatedAt: "",
    stockCount: 0,
    boardCount: 0,
    summary: {
      advanceCount: 0,
      flatCount: 0,
      declineCount: 0,
      turnoverAmount: 0,
      turnoverPreviousAmount: 0,
      turnoverDelta: 0,
      indexChangePct: 0,
    },
    nodes: [],
    source: "direct",
  };
}
const allBoardsValue = "__all__";
const allTrendsValue = "__all__";
const risingOnlyValue = "__rising__";
const fallingOnlyValue = "__falling__";
const marketStorageKey = "heatmap-market";
const periodStorageKey = "heatmap-period";
const boardFilterStorageKey = "heatmap-board-filter";
const trendFilterStorageKey = "heatmap-trend-filter";
const changeRangeFilterStorageKey = "heatmap-change-range-filter";
const filterOpenModeStorageKey = "heatmap-filter-open-mode";
const thumbnailModeStorageKey = "heatmap-thumbnail-mode";
const headerTrendStatsStorageKey = "heatmap-header-trend-stats";
const refreshIntervalStorageKey = "heatmap-refresh-interval";
const defaultRefreshIntervalSeconds = 8;
const minRefreshIntervalSeconds = 3;
const maxRefreshIntervalSeconds = 600;

function normalizeRefreshIntervalSeconds(raw: string | null): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(parsed)) {
    return defaultRefreshIntervalSeconds;
  }
  return Math.min(maxRefreshIntervalSeconds, Math.max(minRefreshIntervalSeconds, parsed));
}
const filterHoverOpenDelayMs = 180;
const filterHoverCloseDelayMs = 160;
const changeRangeSliderMin = -20;
const changeRangeSliderMax = 20;
const changeRangeSliderStep = 1;
const changeRangeSliderTicks = [-20, -10, 0, 10, 20] as const;
const changeRangeSpanPresets = [
  { min: -3, max: 3, label: "±3%" },
  { min: -5, max: 5, label: "±5%" },
  { min: 0, max: 5, label: "0~5%" },
  { min: 5, max: 10, label: "5~10%" },
  { min: -5, max: 0, label: "-5~0%" },
  { min: -10, max: -5, label: "-10~-5%" },
] as const;

type ChangeRangeFilter = {
  min: number | null;
  max: number | null;
};

const emptyChangeRangeFilter: ChangeRangeFilter = { min: null, max: null };

function parseStoredBoardFilter(raw: string | null): string[] {
  if (!raw || raw === allBoardsValue) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item): item is string => typeof item === "string" && item.length > 0 && item !== allBoardsValue
      );
    }
    if (typeof parsed === "string" && parsed.length > 0 && parsed !== allBoardsValue) {
      return [parsed];
    }
  } catch {
    /* Legacy single-board names are stored as plain strings. */
  }

  return [raw];
}

function boardFiltersEqual(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((name, index) => name === right[index]);
}

function sanitizeBoardFilter(selected: string[], availableNames: string[]) {
  const available = new Set(availableNames);
  return selected.filter((name) => available.has(name));
}

function toggleBoardInFilter(current: string[], boardName: string) {
  if (current.length === 0) {
    return [boardName];
  }

  if (current.includes(boardName)) {
    return current.filter((name) => name !== boardName);
  }

  return [...current, boardName];
}

function changeRangeFiltersEqual(left: ChangeRangeFilter, right: ChangeRangeFilter) {
  return left.min === right.min && left.max === right.max;
}

function isChangeRangeActive(range: ChangeRangeFilter) {
  return range.min !== null || range.max !== null;
}

function formatChangeRangeSummary(range: ChangeRangeFilter) {
  if (range.min !== null && range.max !== null) {
    return `${range.min}% ~ ${range.max}%`;
  }

  if (range.min !== null) {
    return `≥${range.min}%`;
  }

  if (range.max !== null) {
    return `≤${range.max}%`;
  }

  return "";
}

function countActiveViewFilters(
  boardFilter: string[],
  trendFilter: string,
  changeRangeFilter: ChangeRangeFilter
) {
  return (
    (boardFilter.length > 0 ? 1 : 0) +
    (trendFilter !== allTrendsValue ? 1 : 0) +
    (isChangeRangeActive(changeRangeFilter) ? 1 : 0)
  );
}

function formatChangeRangeInput(value: number | null) {
  return value === null ? "" : String(value);
}

function parseChangeRangeInput(raw: string, fallback: number | null) {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeChangeRangeFilter(range: ChangeRangeFilter): ChangeRangeFilter {
  if (range.min !== null && range.max !== null && range.min > range.max) {
    return { min: range.max, max: range.min };
  }

  return range;
}

function parseStoredChangeRangeFilter(raw: string | null): ChangeRangeFilter {
  if (!raw) {
    return emptyChangeRangeFilter;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return emptyChangeRangeFilter;
    }

    const record = parsed as { min?: unknown; max?: unknown };
    const min = typeof record.min === "number" && Number.isFinite(record.min) ? record.min : null;
    const max = typeof record.max === "number" && Number.isFinite(record.max) ? record.max : null;
    return normalizeChangeRangeFilter({ min, max });
  } catch {
    return emptyChangeRangeFilter;
  }
}

function snapChangeRangeValue(value: number) {
  const snapped = Math.round(value / changeRangeSliderStep) * changeRangeSliderStep;
  return Math.min(changeRangeSliderMax, Math.max(changeRangeSliderMin, snapped));
}

function filterToSliderBounds(range: ChangeRangeFilter) {
  return {
    min: range.min === null ? changeRangeSliderMin : snapChangeRangeValue(range.min),
    max: range.max === null ? changeRangeSliderMax : snapChangeRangeValue(range.max),
  };
}

function formatChangeRangeBound(value: number) {
  if (value > 0) {
    return `+${value}%`;
  }

  return `${value}%`;
}

function matchesChangeRange(changePct: number, range: ChangeRangeFilter) {
  if (range.min !== null && changePct < range.min) {
    return false;
  }

  if (range.max !== null && changePct > range.max) {
    return false;
  }

  return true;
}
const colorLegendSteps = [-4, -3, -2, -1, 0, 1, 2, 3, 4] as const;
const legendTicks = [-4, -2, 0, 2, 4] as const;
const minZoom = 1;
const desktopMaxZoom = 8;
const mobileMaxZoom = 12;
const flatThreshold = 0.1;
const githubProjectUrl = "https://github.com/wenyuanw/a-share-heatmap";
const authorEmail = "hi@wenyuanw.me";
const authorMailto = `mailto:${authorEmail}`;

const themeColors: Record<
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

const heatmapCanvasThemes: Record<
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

function GitHubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M12 .5C5.65.5.5 5.66.5 12.03c0 5.1 3.3 9.43 7.87 10.95.58.1.79-.25.79-.56l-.02-2.16c-3.2.7-3.88-1.55-3.88-1.55-.52-1.34-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.78 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.3 1.19-3.1-.12-.3-.52-1.5.11-3.13 0 0 .97-.31 3.19 1.18a10.9 10.9 0 0 1 5.8 0c2.21-1.5 3.18-1.18 3.18-1.18.64 1.63.24 2.83.12 3.13.74.8 1.18 1.84 1.18 3.1 0 4.43-2.69 5.4-5.25 5.68.41.36.78 1.08.78 2.18l-.01 3.23c0 .31.2.67.8.55A11.54 11.54 0 0 0 23.5 12.03C23.5 5.66 18.35.5 12 .5Z" />
    </svg>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function clampOffset(width: number, height: number, scale: number, x: number, y: number) {
  if (scale <= 1) {
    return { x: 0, y: 0 };
  }

  const minX = width - width * scale;
  const minY = height - height * scale;

  return {
    x: clamp(x, minX, 0),
    y: clamp(y, minY, 0),
  };
}

function trimTrailingZeros(text: string) {
  return text.replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
}

function formatPrice(value: number) {
  return value.toFixed(value >= 100 ? 1 : 2);
}

function formatChange(value: number) {
  if (value > 0) {
    return `+${value.toFixed(2)}%`;
  }

  return `${value.toFixed(2)}%`;
}

function formatCompactChange(value: number) {
  const absValue = Math.abs(value);
  const digits = absValue >= 10 ? 1 : 2;
  const text = trimTrailingZeros(value.toFixed(digits));
  return value > 0 ? `+${text}%` : `${text}%`;
}

function formatBoardTrendCounts(messages: HeatmapMessages, advanceCount: number, declineCount: number) {
  return messages.boardTrendCounts.replace("{advance}", String(advanceCount)).replace("{decline}", String(declineCount));
}

function countStockTrends(stocks: Array<{ code: string; changePct: number }>, quotes: QuoteMap): BoardTrendStats {
  let advanceCount = 0;
  let flatCount = 0;
  let declineCount = 0;

  for (const stock of stocks) {
    const changePct = quotes[stock.code]?.changePct ?? stock.changePct;

    if (changePct > flatThreshold) {
      advanceCount += 1;
    } else if (changePct < -flatThreshold) {
      declineCount += 1;
    } else {
      flatCount += 1;
    }
  }

  return { advanceCount, flatCount, declineCount };
}

function formatCount(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en-US").format(value);
}

function formatTurnoverAmount(value: number, locale: Locale) {
  if (!Number.isFinite(value) || value <= 0) {
    return "--";
  }

  if (locale === "zh") {
    const withUnit = (divisor: number, unit: string) => {
      const scaled = value / divisor;
      const digits = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
      return `${trimTrailingZeros(scaled.toFixed(digits))} ${unit}`;
    };

    if (value >= 1_0000_0000_0000) {
      return withUnit(1_0000_0000_0000, "万亿");
    }

    if (value >= 1_0000_0000) {
      return withUnit(1_0000_0000, "亿");
    }

    if (value >= 1_0000) {
      return withUnit(1_0000, "万");
    }

    return trimTrailingZeros(value.toFixed(0));
  }

  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: value >= 1_000_000_000_000 ? 1 : 2,
  }).format(value);
}

function getTurnoverTrend(delta: number) {
  if (delta > 0) {
    return "up";
  }

  if (delta < 0) {
    return "down";
  }

  return "flat";
}

function getLiveTurnoverAmount(code: string, fallback: number, quotes: QuoteMap) {
  if (code in quotes) {
    const live = quotes[code].turnoverAmount;
    return Number.isFinite(live) && live >= 0 ? live : fallback;
  }

  return fallback;
}

function filterTreemapByStockPredicate(
  data: TreemapResponse,
  quotes: QuoteMap,
  predicate: (changePct: number) => boolean
): TreemapResponse {
  const filteredNodes = data.nodes
    .map((node) => {
      const filteredChildren = node.children.filter((stock) => {
        const changePct = quotes[stock.code]?.changePct ?? stock.changePct;
        return predicate(changePct);
      });

      return {
        ...node,
        children: filteredChildren,
        stockCount: filteredChildren.length,
        value: filteredChildren.reduce((sum, stock) => sum + stock.value, 0),
      };
    })
    .filter((node) => node.children.length > 0);

  let advanceCount = 0;
  let flatCount = 0;
  let declineCount = 0;
  let turnoverAmount = 0;
  let totalStockCount = 0;

  for (const node of filteredNodes) {
    for (const stock of node.children) {
      const changePct = quotes[stock.code]?.changePct ?? stock.changePct;

      if (changePct > flatThreshold) {
        advanceCount += 1;
      } else if (changePct < -flatThreshold) {
        declineCount += 1;
      } else {
        flatCount += 1;
      }

      turnoverAmount += getLiveTurnoverAmount(stock.code, stock.turnoverAmount, quotes);
      totalStockCount += 1;
    }
  }

  return {
    ...data,
    stockCount: totalStockCount,
    boardCount: filteredNodes.length,
    summary: {
      ...data.summary,
      advanceCount,
      flatCount,
      declineCount,
      turnoverAmount,
      turnoverPreviousAmount: 0,
      turnoverDelta: 0,
    },
    nodes: filteredNodes,
  };
}

function normalizeSizeValue(value: number) {
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function getStockSizeValue(
  stock: { code: string; value: number; turnoverAmount: number },
  quotes: QuoteMap,
  sizeMode: HeatmapSizeMode
) {
  if (sizeMode === "turnover") {
    return normalizeSizeValue(getLiveTurnoverAmount(stock.code, stock.turnoverAmount, quotes));
  }

  return stock.value;
}

function applySizeModeToTreemapData(
  data: TreemapResponse,
  quotes: QuoteMap,
  sizeMode: HeatmapSizeMode
): TreemapResponse {
  if (sizeMode === "marketCap") {
    return data;
  }

  const nodes = data.nodes
    .map((board) => {
      const children = board.children
        .map((stock) => ({
          ...stock,
          value: getStockSizeValue(stock, quotes, sizeMode),
        }))
        .sort((left, right) => right.value - left.value);
      const total = children.reduce((sum, stock) => sum + stock.value, 0);

      return {
        ...board,
        children,
        value: total,
        stockCount: children.length,
      };
    })
    .sort((left, right) => right.value - left.value);

  return {
    ...data,
    nodes,
  };
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }

      reject(new Error("Failed to export canvas"));
    }, "image/png");
  });
}

type ShareLogoRaster =
  | { kind: "bitmap"; bitmap: ImageBitmap }
  | { kind: "image"; image: HTMLImageElement };

/**
 * SVG via `new Image().src = "/x.svg"` often fails to paint on canvas in WebKit
 * (`naturalWidth` 0 or empty draw). Fetch + Blob + createImageBitmap / decode() is reliable.
 */
async function loadShareLogoRaster(): Promise<ShareLogoRaster> {
  const response = await fetch("/logo-share.svg", { cache: "force-cache" });
  if (!response.ok) {
    throw new Error(`Logo fetch failed: ${response.status}`);
  }

  const blob = await response.blob();

  if (typeof createImageBitmap !== "undefined") {
    try {
      const bitmap = await createImageBitmap(blob);
      if (bitmap.width > 0 && bitmap.height > 0) {
        return { kind: "bitmap", bitmap };
      }
      bitmap.close();
    } catch {
      /* fall through to HTMLImageElement */
    }
  }

  const objectUrl = URL.createObjectURL(blob);
  const image = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Logo <img> load failed"));
      image.src = objectUrl;
    });
    await image.decode();
    if (image.naturalWidth === 0 || image.naturalHeight === 0) {
      throw new Error("Logo has zero dimensions");
    }
    return { kind: "image", image };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function drawShareLogoRaster(
  context: CanvasRenderingContext2D,
  raster: ShareLogoRaster,
  x: number,
  y: number,
  width: number,
  height: number
) {
  if (raster.kind === "bitmap") {
    context.drawImage(raster.bitmap, x, y, width, height);
    raster.bitmap.close();
    return;
  }

  context.drawImage(raster.image, x, y, width, height);
}

function toXueqiuSymbol(code: string) {
  const [symbol, market] = code.split(".");
  return `${market}${symbol}`;
}

function parseStockCode(code: string) {
  const [symbol = "", market = "SH"] = code.split(".");
  return {
    symbol,
    market: market.toUpperCase(),
  };
}

function getSparklineUrl(code: string) {
  const { symbol, market } = parseStockCode(code);
  const marketId = market === "SH" ? "1" : "0";
  // RJY 带横/竖虚线网格；线色已按 A 股涨红跌绿绘制。
  return `https://webquotepic.eastmoney.com/GetPic.aspx?nid=${marketId}.${symbol}&imageType=RJY`;
}

function InspectorHeaderSparkline({
  code,
  changePct,
  priceColorMode,
  className,
}: {
  code: string;
  changePct: number;
  priceColorMode: PriceColorMode;
  className?: string;
}) {
  const isFlat = Math.abs(changePct) < 0.1;
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

function getDailyKlineUrl(code: string) {
  const { symbol, market } = parseStockCode(code);
  const marketPrefix = market === "SH" ? "sh" : market === "SZ" ? "sz" : "bj";
  return `https://image.sinajs.cn/newchart/daily/n/${marketPrefix}${symbol}.gif`;
}

function getInspectorSortLabel(messages: HeatmapMessages, sortKey: InspectorSortKey) {
  if (sortKey === "changeAbs") return messages.inspectorSortChangeAbs;
  if (sortKey === "changeDesc") return messages.inspectorSortChangeDesc;
  if (sortKey === "changeAsc") return messages.inspectorSortChangeAsc;
  if (sortKey === "turnover") return messages.inspectorSortTurnover;
  return messages.inspectorSortName;
}

function compareInspectorStocks(left: InspectorStockItem, right: InspectorStockItem, sortKey: InspectorSortKey) {
  if (sortKey === "changeDesc") {
    return right.changePct - left.changePct;
  }

  if (sortKey === "changeAsc") {
    return left.changePct - right.changePct;
  }

  if (sortKey === "turnover") {
    return right.turnoverAmount - left.turnoverAmount;
  }

  if (sortKey === "name") {
    return left.name.localeCompare(right.name, "zh");
  }

  return Math.abs(right.changePct) - Math.abs(left.changePct);
}

function cycleInspectorSortKey(current: InspectorSortKey, direction: 1 | -1): InspectorSortKey {
  const index = inspectorSortKeys.indexOf(current);
  const nextIndex = (index + direction + inspectorSortKeys.length) % inspectorSortKeys.length;
  return inspectorSortKeys[nextIndex];
}

function InspectorSortControls({
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

function formatShareTimestamp(value: string) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function getShortcutActionLabel(messages: HeatmapMessages, action: ShortcutActionId) {
  if (action === "share") return messages.shortcutActionShare;
  if (action === "resetView") return messages.shortcutActionResetView;
  if (action === "fullscreen") return messages.shortcutActionFullscreen;
  if (action === "settings") return messages.shortcutActionSettings;
  if (action === "sidebar") return messages.shortcutActionSidebar;
  if (action === "filters") return messages.shortcutActionFilters;
  if (action === "toggleWatchlist") return messages.shortcutActionToggleWatchlist;
  return messages.shortcutActionDisplayMode;
}

function withShortcutTitle(label: string, key: string) {
  return `${label} (${formatShortcutLabel(key)})`;
}

function getMarketLabel(messages: HeatmapMessages, market: HeatmapUniverse) {
  if (market === watchlistUniverseKey) return messages.markets.watchlist;
  if (market === "all") return messages.markets.all;
  if (market === "sse") return messages.markets.sse;
  if (market === "szse") return messages.markets.szse;
  if (market === "hs300") return messages.markets.hs300;
  if (market === "zza50") return messages.markets.zza50;
  if (market === "zza500") return messages.markets.zza500;
  if (market === "main") return messages.markets.main;
  if (market === "cyb") return messages.markets.cyb;
  return messages.markets.kcb;
}

function getCompactMarketLabel(messages: HeatmapMessages, market: HeatmapUniverse, locale: Locale) {
  if (locale === "en") {
    if (market === watchlistUniverseKey) return "Watchlist";
    if (market === "all") return "A-Share";
    if (market === "sse") return "Shanghai";
    if (market === "szse") return "Shenzhen";
    if (market === "hs300") return "CSI 300";
    if (market === "zza50") return "CSI A50";
    if (market === "zza500") return "CSI A500";
    if (market === "main") return "Main Board";
    if (market === "cyb") return "ChiNext";
    return "STAR";
  }

  return getMarketLabel(messages, market);
}

function getPeriodLabel(messages: HeatmapMessages, period: HeatmapPeriodKey) {
  if (period === "day") return messages.metrics.day;
  if (period === "week") return messages.metrics.week;
  if (period === "month") return messages.metrics.month;
  return messages.metrics.year;
}

function getCompactPeriodLabel(period: HeatmapPeriodKey, locale: Locale) {
  if (locale === "en") {
    if (period === "day") return "1D";
    if (period === "week") return "1W";
    if (period === "month") return "1M";
    return "YTD";
  }

  if (period === "day") return "日";
  if (period === "week") return "周";
  if (period === "month") return "月";
  return "年";
}

function getHeatColor(
  theme: HeatTheme,
  changePct: number,
  colorMode: PriceColorMode,
  displayMode: DisplayMode = "dark"
) {
  return heatColorFromTheme(theme, changePct, colorMode === "red-rise", displayMode);
}

function getLegendGradient(theme: HeatTheme, colorMode: PriceColorMode, displayMode: DisplayMode = "dark") {
  return legendGradientFromTheme(theme, colorMode === "red-rise", displayMode, colorLegendSteps);
}

function getBoardHeaderColor(
  theme: HeatTheme,
  changePct: number,
  colorMode: PriceColorMode,
  displayMode: DisplayMode = "dark"
) {
  return boardHeaderColorFromTheme(theme, changePct, colorMode === "red-rise", displayMode);
}

function getChangeTextColor(
  theme: HeatTheme,
  changePct: number,
  colorMode: PriceColorMode,
  displayMode: DisplayMode,
  tone: "normal" | "soft" | "strong" = "normal"
) {
  return uiChangeTextColor(theme, changePct, colorMode === "red-rise", displayMode, tone);
}

function getRiseTextColor(theme: HeatTheme, colorMode: PriceColorMode, displayMode: DisplayMode) {
  return uiPolarityColor(theme, "rise", colorMode === "red-rise", displayMode, "normal");
}

function getFallTextColor(theme: HeatTheme, colorMode: PriceColorMode, displayMode: DisplayMode) {
  return uiPolarityColor(theme, "fall", colorMode === "red-rise", displayMode, "normal");
}

function weightedAverageChange(
  stocks: Array<{ code: string; value: number; changePct: number }>,
  quotes: QuoteMap
) {
  let weightedSum = 0;
  let totalValue = 0;

  for (const stock of stocks) {
    const changePct = quotes[stock.code]?.changePct ?? stock.changePct;
    weightedSum += changePct * stock.value;
    totalValue += stock.value;
  }

  if (totalValue <= 0) {
    return 0;
  }

  return weightedSum / totalValue;
}

function groupStocksBySubBoard<
  T extends {
    code: string;
    boardName: string;
    subBoardName: string;
    value: number;
    changePct: number;
  },
>(stocks: T[], quotes: QuoteMap) {
  const subBoardMap = new Map<string, T[]>();

  for (const stock of stocks) {
    const key = stock.subBoardName || stock.boardName;
    const current = subBoardMap.get(key) ?? [];
    current.push(stock);
    subBoardMap.set(key, current);
  }

  return Array.from(subBoardMap.entries())
    .map(([name, children]) => ({
      name,
      boardName: children[0]?.boardName ?? "",
      stockCount: children.length,
      value: children.reduce((sum, child) => sum + child.value, 0),
      changePct: weightedAverageChange(children, quotes),
      children: [...children].sort((left, right) => right.value - left.value),
    }))
    .sort((left, right) => right.value - left.value);
}

function sortTreemapItems<T>(items: TreemapInput<T>[]) {
  return [...items]
    .filter((entry) => entry.value > 0)
    .sort((left, right) => right.value - left.value);
}

function totalTreemapValue<T>(items: TreemapInput<T>[]) {
  let total = 0;
  for (const entry of items) {
    total += entry.value;
  }
  return total;
}

function findBalancedSplitIndex<T>(items: TreemapInput<T>[]) {
  if (items.length <= 1) {
    return items.length;
  }

  const target = totalTreemapValue(items) / 2;
  let cumulative = 0;
  let bestIndex = 1;
  let bestDiff = Number.POSITIVE_INFINITY;

  for (let index = 1; index < items.length; index += 1) {
    cumulative += items[index - 1].value;
    const diff = Math.abs(target - cumulative);

    if (diff < bestDiff) {
      bestDiff = diff;
      bestIndex = index;
    }
  }

  return bestIndex;
}

function splitBounds(bounds: Bounds, ratio: number) {
  const splitVertically = bounds.width >= bounds.height;

  if (splitVertically) {
    const leftWidth = bounds.width * ratio;
    return {
      first: { x: bounds.x, y: bounds.y, width: leftWidth, height: bounds.height },
      second: {
        x: bounds.x + leftWidth,
        y: bounds.y,
        width: Math.max(0, bounds.width - leftWidth),
        height: bounds.height,
      },
    };
  }

  const topHeight = bounds.height * ratio;
  return {
    first: { x: bounds.x, y: bounds.y, width: bounds.width, height: topHeight },
    second: {
      x: bounds.x,
      y: bounds.y + topHeight,
      width: bounds.width,
      height: Math.max(0, bounds.height - topHeight),
    },
  };
}

function insetRect<T>(rect: TreemapRect<T>, gap: number) {
  const inset = gap / 2;

  return {
    ...rect,
    x: rect.x + inset,
    y: rect.y + inset,
    width: Math.max(0, rect.width - gap),
    height: Math.max(0, rect.height - gap),
  };
}

function binaryTreemap<T>(items: TreemapInput<T>[], x: number, y: number, width: number, height: number, gap = 0) {
  const sortedItems = sortTreemapItems(items);

  function layout(entries: TreemapInput<T>[], bounds: Bounds): TreemapRect<T>[] {
    if (entries.length === 0 || bounds.width <= 1 || bounds.height <= 1) {
      return [];
    }

    if (entries.length === 1) {
      return [
        insetRect(
          {
            item: entries[0].item,
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
          },
          gap
        ),
      ];
    }

    const splitIndex = findBalancedSplitIndex(entries);
    const firstEntries = entries.slice(0, splitIndex);
    const secondEntries = entries.slice(splitIndex);

    if (firstEntries.length === 0 || secondEntries.length === 0) {
      return entries.map((entry, index) =>
        insetRect(
          {
            item: entry.item,
            x: bounds.x,
            y: bounds.y + (bounds.height / entries.length) * index,
            width: bounds.width,
            height: bounds.height / entries.length,
          },
          gap
        )
      );
    }

    const total = totalTreemapValue(entries);
    const firstRatio = totalTreemapValue(firstEntries) / total;
    const { first, second } = splitBounds(bounds, firstRatio);

    return [...layout(firstEntries, first), ...layout(secondEntries, second)];
  }

  return layout(sortedItems, { x, y, width, height }).filter((rect) => rect.width > 1 && rect.height > 1);
}

function drawClippedText(
  context: CanvasRenderingContext2D,
  text: string,
  textX: number,
  textY: number,
  clipX: number,
  clipY: number,
  clipWidth: number,
  clipHeight: number
) {
  context.save();
  context.beginPath();
  context.rect(clipX, clipY, clipWidth, clipHeight);
  context.clip();
  context.fillText(text, textX, textY);
  context.restore();
}

const heatmapFontStack = `"Avenir Next Condensed", "DIN Condensed", "PingFang SC", "Microsoft YaHei", Arial, sans-serif`;

function heatmapFont(weight: number, size: number) {
  return `${weight} ${size}px ${heatmapFontStack}`;
}

function fitTextToWidth(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (maxWidth <= 0 || text.length === 0) {
    return "";
  }

  if (context.measureText(text).width <= maxWidth) {
    return text;
  }

  let low = 1;
  let high = text.length;
  let best = "";

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const candidate = text.slice(0, mid);

    if (context.measureText(candidate).width <= maxWidth) {
      best = candidate;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  if (best) {
    return best;
  }

  const firstCharacter = text.slice(0, 1);
  return context.measureText(firstCharacter).width <= maxWidth ? firstCharacter : "";
}

function fitFontSizeToWidth(
  context: CanvasRenderingContext2D,
  text: string,
  weight: number,
  preferredSize: number,
  minSize: number,
  maxWidth: number
) {
  if (maxWidth <= 0 || text.length === 0) {
    return preferredSize;
  }

  context.font = heatmapFont(weight, preferredSize);
  const preferredWidth = context.measureText(text).width;

  if (preferredWidth <= maxWidth) {
    return preferredSize;
  }

  return clamp((preferredSize * maxWidth) / preferredWidth, minSize, preferredSize);
}

function drawSectorHeaderLabel(
  context: CanvasRenderingContext2D,
  rect: { x: number; y: number; width: number; titleHeight: number },
  options: {
    name: string;
    changePct: number;
    advanceCount: number;
    declineCount: number;
    messages: HeatmapMessages;
    showDrillHint?: boolean;
    compact?: boolean;
    showStats?: boolean;
  }
) {
  const { name, changePct, advanceCount, declineCount, messages } = options;
  const compact = Boolean(options.compact);
  const showDrillHint = Boolean(options.showDrillHint);
  const showStats = Boolean(options.showStats);

  if (rect.width <= 44 || rect.titleHeight <= 8) {
    return;
  }

  const fontSize = compact
    ? clamp(Math.floor(rect.titleHeight * 0.56), 9, 12)
    : clamp(Math.floor(rect.titleHeight * 0.52), 10, 15);
  const statsFontSize = compact
    ? clamp(Math.floor(rect.titleHeight * 0.48), 8, 11)
    : clamp(Math.floor(rect.titleHeight * 0.46), 9, 13);
  const leftPad = compact ? 5 : 8;
  const rightPad = showDrillHint ? 18 : compact ? 5 : 8;
  const available = Math.max(0, rect.width - leftPad - rightPad);
  const centerY = rect.y + rect.titleHeight / 2 + fontSize * (compact ? 0.06 : 0.08);
  const clipX = rect.x + (compact ? 3 : 4);
  const clipY = rect.y + (compact ? 1 : 2);
  const clipWidth = Math.max(0, rect.width - (compact ? 6 : 8));
  const clipHeight = Math.max(0, rect.titleHeight - (compact ? 2 : 4));
  const trendText = formatBoardTrendCounts(messages, advanceCount, declineCount);
  const changeText = compact && rect.width < 132 ? formatCompactChange(changePct) : formatChange(changePct);

  context.textBaseline = "middle";
  context.font = heatmapFont(650, statsFontSize);
  const trendWidth = context.measureText(trendText).width;
  const changeWidth = context.measureText(changeText).width;
  const statsGap = compact ? 5 : 7;
  const canShowTrend =
    showStats && available > (compact ? 108 : 148) && trendWidth + changeWidth + statsGap < available * 0.64;
  const canShowChange = showStats && available > (compact ? 72 : 96);
  const statsWidth = canShowChange ? changeWidth + (canShowTrend ? trendWidth + statsGap : 0) : 0;
  const nameMaxWidth = Math.max(0, available - (statsWidth > 0 ? statsWidth + (compact ? 6 : 8) : 0));

  context.fillStyle = "rgba(247, 250, 252, 0.96)";
  context.textAlign = "left";
  context.font = heatmapFont(700, fontSize);
  const fittedName = fitTextToWidth(context, name, nameMaxWidth);
  if (fittedName) {
    drawClippedText(context, fittedName, rect.x + leftPad, centerY, clipX, clipY, clipWidth, clipHeight);
  }

  if (!canShowChange) {
    return;
  }

  context.font = heatmapFont(650, statsFontSize);
  context.textAlign = "right";
  const statsRight = rect.x + rect.width - rightPad;
  drawClippedText(context, changeText, statsRight, centerY, clipX, clipY, clipWidth, clipHeight);

  if (canShowTrend) {
    context.fillStyle = "rgba(247, 250, 252, 0.86)";
    drawClippedText(
      context,
      trendText,
      statsRight - changeWidth - statsGap,
      centerY,
      clipX,
      clipY,
      clipWidth,
      clipHeight
    );
  }
}

function drawSectorThumbnailLabel(
  context: CanvasRenderingContext2D,
  rect: SubBoardRect,
  messages: HeatmapMessages,
  zoomScale = 1
) {
  const displayWidth = rect.width * zoomScale;
  const displayHeight = rect.height * zoomScale;
  const screenUnit = 1 / zoomScale;
  const clipPaddingPx = displayWidth > 110 ? 6 : displayWidth > 54 ? 4 : 3;
  const textInsetXPx = displayWidth > 110 ? 8 : displayWidth > 54 ? 5 : 4;
  const textInsetYPx = displayHeight > 64 ? 7 : displayHeight > 36 ? 5 : 3;
  const clipPadding = clipPaddingPx * screenUnit;
  const textInsetX = textInsetXPx * screenUnit;
  const textInsetY = textInsetYPx * screenUnit;
  const clipWidth = Math.max(0, rect.width - clipPadding * 2);
  const clipHeight = Math.max(0, rect.height - clipPadding * 2);

  if (displayWidth < 18 || displayHeight < 12 || clipWidth <= 2 || clipHeight <= 2) {
    return;
  }

  const trendText = formatBoardTrendCounts(messages, rect.advanceCount, rect.declineCount);
  const changeText = displayWidth >= 72 ? formatChange(rect.changePct) : formatCompactChange(rect.changePct);
  const hasLargeLabel = displayWidth >= 96 && displayHeight >= 64;
  const hasStackedLabel = displayWidth >= 44 && displayHeight >= 36;

  context.save();
  try {
    context.fillStyle = "rgba(247, 250, 252, 0.96)";
    context.shadowColor = "rgba(0, 0, 0, 0.42)";
    context.shadowBlur = (displayHeight < 20 ? 0.5 : 1.3) * screenUnit;
    context.shadowOffsetY = 0.6 * screenUnit;

    if (hasLargeLabel) {
      const preferredTitleSize =
        clamp(Math.floor(Math.min(displayWidth, displayHeight) * 0.2), 13, 26) * screenUnit;
      const titleSize = fitFontSizeToWidth(
        context,
        rect.name,
        700,
        preferredTitleSize,
        Math.max(11 * screenUnit, preferredTitleSize * 0.66),
        clipWidth
      );
      const detailSize = Math.min(
        clamp(Math.floor(Math.min(displayWidth, displayHeight) * 0.16), 11, 22) * screenUnit,
        titleSize * 1.05
      );
      const trendSize = Math.max(10 * screenUnit, detailSize * 0.78);
      const centerX = rect.x + rect.width / 2;
      const centerY = rect.y + rect.height / 2;

      context.textAlign = "center";
      context.textBaseline = "middle";
      context.font = heatmapFont(700, titleSize);
      drawClippedText(
        context,
        fitTextToWidth(context, rect.name, clipWidth),
        centerX,
        centerY - detailSize * 0.95,
        rect.x + clipPadding,
        rect.y + clipPadding,
        clipWidth,
        clipHeight
      );

      context.font = heatmapFont(700, detailSize);
      drawClippedText(
        context,
        changeText,
        centerX,
        centerY + detailSize * 0.18,
        rect.x + clipPadding,
        rect.y + clipPadding,
        clipWidth,
        clipHeight
      );

      if (displayHeight >= 78) {
        context.fillStyle = "rgba(247, 250, 252, 0.88)";
        context.font = heatmapFont(600, trendSize);
        drawClippedText(
          context,
          trendText,
          centerX,
          centerY + detailSize * 1.18,
          rect.x + clipPadding,
          rect.y + clipPadding,
          clipWidth,
          clipHeight
        );
      }
      return;
    }

    if (hasStackedLabel) {
      const preferredTitleSize =
        clamp(Math.floor(Math.min(displayWidth * 0.2, displayHeight * 0.28)), 8, 16) * screenUnit;
      const titleSize = fitFontSizeToWidth(
        context,
        rect.name,
        700,
        preferredTitleSize,
        Math.max(7 * screenUnit, preferredTitleSize * 0.72),
        clipWidth - (textInsetX - clipPadding)
      );
      const detailSize = Math.min(
        clamp(Math.floor(displayHeight * 0.22), 8, 14) * screenUnit,
        titleSize * 1.08
      );
      const trendSize = Math.max(7 * screenUnit, detailSize * 0.86);

      context.textAlign = "left";
      context.textBaseline = "alphabetic";
      context.font = heatmapFont(700, titleSize);
      drawClippedText(
        context,
        fitTextToWidth(context, rect.name, clipWidth - (textInsetX - clipPadding)),
        rect.x + textInsetX,
        rect.y + textInsetY + titleSize,
        rect.x + clipPadding,
        rect.y + clipPadding,
        clipWidth,
        clipHeight
      );

      context.font = heatmapFont(700, detailSize);
      drawClippedText(
        context,
        changeText,
        rect.x + textInsetX,
        rect.y + textInsetY + titleSize + detailSize + 1.5 * screenUnit,
        rect.x + clipPadding,
        rect.y + clipPadding,
        clipWidth,
        clipHeight
      );

      if (displayHeight >= 52 && displayWidth >= 64) {
        context.fillStyle = "rgba(247, 250, 252, 0.88)";
        context.font = heatmapFont(600, trendSize);
        drawClippedText(
          context,
          trendText,
          rect.x + textInsetX,
          rect.y + textInsetY + titleSize + detailSize + trendSize + 4.5 * screenUnit,
          rect.x + clipPadding,
          rect.y + clipPadding,
          clipWidth,
          clipHeight
        );
      }
      return;
    }

    const fontSize = clamp(Math.floor(Math.min(displayWidth * 0.2, displayHeight * 0.58)), 7, 12) * screenUnit;
    context.textAlign = "left";
    context.textBaseline = "middle";
    context.font = heatmapFont(700, fontSize);
    const canShowChange = displayWidth >= 40 && displayHeight >= 16;
    const fittedName = fitTextToWidth(
      context,
      canShowChange ? rect.name : changeText,
      clipWidth - (textInsetX - clipPadding)
    );
    if (fittedName) {
      drawClippedText(
        context,
        fittedName,
        rect.x + textInsetX,
        rect.y + rect.height / 2 + fontSize * 0.06,
        rect.x + clipPadding,
        rect.y + clipPadding,
        clipWidth,
        clipHeight
      );
    }
  } finally {
    context.restore();
  }
}

function drawStockLabel(context: CanvasRenderingContext2D, stock: StockRect, zoomScale = 1) {
  const displayWidth = stock.width * zoomScale;
  const displayHeight = stock.height * zoomScale;
  const screenUnit = 1 / zoomScale;
  const clipPaddingPx = displayWidth > 110 ? 5 : displayWidth > 54 ? 3 : 2;
  const textInsetXPx = displayWidth > 110 ? 6 : displayWidth > 54 ? 4 : 3;
  const textInsetYPx = displayHeight > 56 ? 4.5 : displayHeight > 26 ? 3 : 2;
  const clipPadding = clipPaddingPx * screenUnit;
  const textInsetX = textInsetXPx * screenUnit;
  const textInsetY = textInsetYPx * screenUnit;
  const clipWidth = Math.max(0, stock.width - clipPadding * 2);
  const clipHeight = Math.max(0, stock.height - clipPadding * 2);

  if (displayWidth < 16 || displayHeight < 8 || clipWidth <= 2 || clipHeight <= 2) {
    return;
  }

  const hasLargeLabel = displayWidth >= 108 && displayHeight >= 58;
  const hasStackedLabel = displayWidth >= 28 && displayHeight >= 20;
  const hasInlineLabel = displayWidth >= 24 && displayHeight >= 10;

  context.save();
  try {
    context.fillStyle = "rgba(247, 250, 252, 0.96)";
    context.shadowColor = "rgba(0, 0, 0, 0.42)";
    context.shadowBlur = (displayHeight < 14 ? 0.45 : 1.2) * screenUnit;
    context.shadowOffsetY = 0.6 * screenUnit;

    if (hasLargeLabel) {
      const preferredTitleSize =
        clamp(Math.floor(Math.min(displayWidth, displayHeight) * 0.26), 15, 30) * screenUnit;
      const titleSize = fitFontSizeToWidth(
        context,
        stock.name,
        700,
        preferredTitleSize,
        Math.max(12 * screenUnit, preferredTitleSize * 0.66),
        clipWidth
      );
      const detailSize = Math.min(
        clamp(Math.floor(Math.min(displayWidth, displayHeight) * 0.19), 11, 23) * screenUnit,
        titleSize * 1.08
      );
      const centerX = stock.x + stock.width / 2;
      const centerY = stock.y + stock.height / 2;

      context.textAlign = "center";
      context.textBaseline = "middle";
      context.font = heatmapFont(700, titleSize);
      drawClippedText(
        context,
        fitTextToWidth(context, stock.name, clipWidth),
        centerX,
        centerY - titleSize * 0.62,
        stock.x + clipPadding,
        stock.y + clipPadding,
        clipWidth,
        clipHeight
      );

      context.font = heatmapFont(650, detailSize);
      drawClippedText(
        context,
        formatChange(stock.changePct),
        centerX,
        centerY + detailSize * 0.3,
        stock.x + clipPadding,
        stock.y + clipPadding,
        clipWidth,
        clipHeight
      );

      if (displayWidth > 180 && displayHeight > 100) {
        context.font = heatmapFont(550, Math.max(11 * screenUnit, detailSize - 1 * screenUnit));
        drawClippedText(
          context,
          formatPrice(stock.price),
          centerX,
          centerY + detailSize * 1.35,
          stock.x + clipPadding,
          stock.y + clipPadding,
          clipWidth,
          clipHeight
        );
      }
      return;
    }

    if (hasStackedLabel) {
      const preferredTitleSize =
        clamp(Math.floor(Math.min(displayWidth * 0.19, displayHeight * 0.43)), 7.5, 16) * screenUnit;
      const titleSize = fitFontSizeToWidth(
        context,
        stock.name,
        700,
        preferredTitleSize,
        Math.max(6.5 * screenUnit, preferredTitleSize * 0.72),
        clipWidth - (textInsetX - clipPadding)
      );
      const detailSize = Math.min(
        clamp(Math.floor(displayHeight * 0.33), 7, 13) * screenUnit,
        titleSize * 1.08
      );

      context.textAlign = "left";
      context.textBaseline = "alphabetic";
      context.font = heatmapFont(700, titleSize);
      drawClippedText(
        context,
        fitTextToWidth(context, stock.name, clipWidth - (textInsetX - clipPadding)),
        stock.x + textInsetX,
        stock.y + textInsetY + titleSize,
        stock.x + clipPadding,
        stock.y + clipPadding,
        clipWidth,
        clipHeight
      );

      if (displayHeight >= 20) {
        context.font = heatmapFont(650, detailSize);
        drawClippedText(
          context,
          displayWidth >= 58 ? formatChange(stock.changePct) : formatCompactChange(stock.changePct),
          stock.x + textInsetX,
          stock.y + textInsetY + titleSize + detailSize + 1.5 * screenUnit,
          stock.x + clipPadding,
          stock.y + clipPadding,
          clipWidth,
          clipHeight
        );
      }
      return;
    }

    if (hasInlineLabel) {
      const fontSize =
        clamp(Math.floor(Math.min(displayWidth * 0.18, displayHeight * 0.68)), 6.5, 11) * screenUnit;
      const changeText = formatCompactChange(stock.changePct);
      const gap = 3 * screenUnit;

      context.textAlign = "left";
      context.textBaseline = "middle";
      context.font = heatmapFont(650, fontSize);

      const changeWidth = context.measureText(changeText).width;
      const canShowChange = displayWidth >= 32 && changeWidth + gap < clipWidth * 0.72;
      const nameMaxWidth = canShowChange ? Math.max(0, clipWidth - changeWidth - gap) : clipWidth;
      const fittedName = fitTextToWidth(context, stock.name, nameMaxWidth);
      const labelY = stock.y + stock.height / 2 + fontSize * 0.06;

      if (fittedName) {
        drawClippedText(
          context,
          fittedName,
          stock.x + textInsetX,
          labelY,
          stock.x + clipPadding,
          stock.y + clipPadding,
          clipWidth,
          clipHeight
        );
      }

      if (canShowChange) {
        context.textAlign = "right";
        drawClippedText(
          context,
          changeText,
          stock.x + stock.width - textInsetX,
          labelY,
          stock.x + clipPadding,
          stock.y + clipPadding,
          clipWidth,
          clipHeight
        );
      }
      return;
    }

    if (displayWidth >= 18 && displayHeight >= 8) {
      const fontSize = clamp(Math.floor(displayHeight * 0.72), 6, 9) * screenUnit;

      context.textAlign = "left";
      context.textBaseline = "middle";
      context.font = heatmapFont(650, fontSize);
      const fittedName = fitTextToWidth(context, stock.name, clipWidth);

      if (fittedName) {
        drawClippedText(
          context,
          fittedName,
          stock.x + textInsetX,
          stock.y + stock.height / 2 + fontSize * 0.06,
          stock.x + clipPadding,
          stock.y + clipPadding,
          clipWidth,
          clipHeight
        );
      }
    }
  } finally {
    context.restore();
  }
}

function usePollWhileVisible(task: () => void | Promise<void>, intervalMs: number) {
  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    let cancelled = false;
    let timer: number | null = null;

    const run = () => {
      if (cancelled) return;
      Promise.resolve(task()).catch(() => {
        /* Errors are handled by the task itself. */
      });
    };

    const start = () => {
      if (timer !== null) return;
      timer = window.setInterval(run, intervalMs);
    };

    const stop = () => {
      if (timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }
    };

    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        run();
        start();
      }
    };

    if (!document.hidden) {
      run();
      start();
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [task, intervalMs]);
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const query = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(query.matches);

    update();

    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", update);
      return () => query.removeEventListener("change", update);
    }

    query.addListener(update);
    return () => query.removeListener(update);
  }, []);

  return isMobile;
}

type MobileStockSheetStock = {
  code: string;
  name: string;
  subBoardName: string;
  price: number;
  changePct: number;
  active?: boolean;
};

function MobileStockSheet({
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
    changePct: number;
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

const heatmapLoadingBlocks = [
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

function HeatmapLoadingOverlay({ displayMode, messages }: { displayMode: DisplayMode; messages: HeatmapMessages }) {
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

function getHeatThemeDisplayName(theme: HeatTheme, locale: Locale, messages: HeatmapMessages) {
  if (theme.builtin) {
    if (theme.id === "soft") return messages.heatThemeSoft;
    if (theme.id === "classic") return messages.heatThemeClassic;
    if (theme.id === "muted") return messages.heatThemeMuted;
    if (theme.id === "high-contrast") return messages.heatThemeHighContrast;
  }
  return locale === "en" ? theme.nameEn : theme.nameZh;
}

function getHeatStopLabel(messages: HeatmapMessages, field: HeatStopField) {
  if (field === "flat") return messages.heatStopFlat;
  if (field === "positiveSoft") return messages.heatStopPositiveSoft;
  if (field === "positiveStrong") return messages.heatStopPositiveStrong;
  if (field === "negativeSoft") return messages.heatStopNegativeSoft;
  return messages.heatStopNegativeStrong;
}

function HeatThemeSettingsPanel({
  messages,
  locale,
  displayMode,
  priceColorMode,
  heatThemeId,
  customHeatThemes,
  activeHeatTheme,
  onHeatThemeIdChange,
  onCustomHeatThemesChange,
}: {
  messages: HeatmapMessages;
  locale: Locale;
  displayMode: DisplayMode;
  priceColorMode: PriceColorMode;
  heatThemeId: string;
  customHeatThemes: HeatTheme[];
  activeHeatTheme: HeatTheme;
  onHeatThemeIdChange: (id: string) => void;
  onCustomHeatThemesChange: (themes: HeatTheme[]) => void;
}) {
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [draftTheme, setDraftTheme] = useState<HeatTheme | null>(null);
  const [editMode, setEditMode] = useState<"dark" | "light">(displayMode);
  const availableThemes = useMemo(
    () => [...builtinHeatThemes, ...customHeatThemes],
    [customHeatThemes]
  );
  const isEditing = Boolean(draftTheme);
  const editingStops = draftTheme
    ? editMode === "light"
      ? draftTheme.light
      : draftTheme.dark
    : null;

  useEffect(() => {
    setEditMode(displayMode);
  }, [displayMode]);

  useEffect(() => {
    setDraftTheme(null);
  }, [heatThemeId]);

  const startEditExisting = () => {
    if (activeHeatTheme.builtin) {
      return;
    }
    setDraftTheme(cloneHeatTheme(activeHeatTheme));
    setEditMode(displayMode);
  };

  const startCreateCustom = () => {
    const next = createCustomHeatTheme(
      activeHeatTheme,
      locale === "zh" ? `自定义 ${customHeatThemes.length + 1}` : `Custom ${customHeatThemes.length + 1}`,
      `Custom ${customHeatThemes.length + 1}`
    );
    setDraftTheme(next);
    setEditMode(displayMode);
  };

  const updateDraft = (updater: (theme: HeatTheme) => HeatTheme) => {
    setDraftTheme((current) => (current ? updater(current) : current));
  };

  const handleSave = () => {
    if (!draftTheme) {
      return;
    }
    const exists = customHeatThemes.some((theme) => theme.id === draftTheme.id);
    onCustomHeatThemesChange(
      exists
        ? customHeatThemes.map((theme) => (theme.id === draftTheme.id ? draftTheme : theme))
        : [...customHeatThemes, draftTheme]
    );
    onHeatThemeIdChange(draftTheme.id);
    setDraftTheme(null);
    toast.success(messages.heatThemeSaved);
  };

  const handleCancel = () => {
    setDraftTheme(null);
  };

  const handleDeleteCustom = () => {
    if (activeHeatTheme.builtin || draftTheme) {
      return;
    }
    const remaining = customHeatThemes.filter((theme) => theme.id !== activeHeatTheme.id);
    onCustomHeatThemesChange(remaining);
    onHeatThemeIdChange(defaultHeatThemeId);
  };

  const handleExport = () => {
    try {
      const payload = buildHeatThemeExport(draftTheme ?? activeHeatTheme);
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${payload.theme.nameEn.replace(/\s+/g, "-").toLowerCase() || "heatmap-theme"}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(messages.heatThemeExportFailed);
    }
  };

  const handleImportFile = async (file: File | null) => {
    if (!file) {
      return;
    }
    try {
      const text = await file.text();
      const imported = parseHeatThemeExport(text);
      if (!imported) {
        toast.error(messages.heatThemeImportFailed);
        return;
      }
      setDraftTheme(imported);
      setEditMode(displayMode);
      toast.success(messages.heatThemeImportSuccess);
    } catch {
      toast.error(messages.heatThemeImportFailed);
    } finally {
      if (importInputRef.current) {
        importInputRef.current.value = "";
      }
    }
  };

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">{messages.heatThemeLabel}</h3>

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {availableThemes.map((theme) => {
          const active = !isEditing && heatThemeId === theme.id;
          const stops = displayMode === "light" ? theme.light : theme.dark;
          return (
            <button
              key={theme.id}
              type="button"
              disabled={isEditing}
              onClick={() => onHeatThemeIdChange(theme.id)}
              aria-pressed={active}
              className={cn(
                "border px-2.5 py-1.5 text-left transition-colors",
                active
                  ? "border-brand/70 bg-brand/15"
                  : "border-border bg-background/70 hover:bg-muted",
                isEditing && "cursor-not-allowed opacity-55"
              )}
            >
              <div className="flex items-center justify-between gap-1.5">
                <span className="truncate text-[12px] font-semibold text-foreground">
                  {getHeatThemeDisplayName(theme, locale, messages)}
                </span>
                {!theme.builtin && (
                  <span className="shrink-0 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                    {messages.heatThemeCustom}
                  </span>
                )}
              </div>
              <div
                className="mt-1.5 h-1.5 w-full border border-border/70"
                style={{
                  background: previewGradientFromStops(stops, priceColorMode === "red-rise"),
                }}
              />
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {!isEditing && (
          <>
            <button
              type="button"
              onClick={startCreateCustom}
              className="border border-border bg-background/70 px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {messages.heatThemeCreateCustom}
            </button>
            {!activeHeatTheme.builtin && (
              <button
                type="button"
                onClick={startEditExisting}
                className="border border-border bg-background/70 px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {messages.heatThemeEdit}
              </button>
            )}
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-1 border border-border bg-background/70 px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Download className="size-3" />
              {messages.heatThemeExport}
            </button>
            <button
              type="button"
              onClick={() => importInputRef.current?.click()}
              className="border border-border bg-background/70 px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {messages.heatThemeImport}
            </button>
            {!activeHeatTheme.builtin && (
              <button
                type="button"
                onClick={handleDeleteCustom}
                className="border border-border bg-background/70 px-2.5 py-1.5 text-[12px] font-medium text-destructive transition-colors hover:bg-muted"
              >
                {messages.heatThemeDeleteCustom}
              </button>
            )}
          </>
        )}
        <input
          ref={importInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => void handleImportFile(event.target.files?.[0] ?? null)}
        />
      </div>

      {draftTheme && editingStops && (
        <div className="space-y-2.5 border border-brand/40 bg-brand/5 p-2.5">
          <p className="text-[11px] leading-relaxed text-muted-foreground">{messages.heatThemeEditingHint}</p>

          <div className="grid gap-1.5 sm:grid-cols-2">
            <label className="space-y-1 text-[11px] text-muted-foreground">
              <span>{messages.heatThemeNameZh}</span>
              <input
                value={draftTheme.nameZh}
                onChange={(event) =>
                  updateDraft((theme) => ({ ...theme, nameZh: event.target.value }))
                }
                className="w-full border border-border bg-background px-2 py-1.5 text-[12px] text-foreground outline-none focus:border-brand/60"
              />
            </label>
            <label className="space-y-1 text-[11px] text-muted-foreground">
              <span>{messages.heatThemeNameEn}</span>
              <input
                value={draftTheme.nameEn}
                onChange={(event) =>
                  updateDraft((theme) => ({ ...theme, nameEn: event.target.value }))
                }
                className="w-full border border-border bg-background px-2 py-1.5 text-[12px] text-foreground outline-none focus:border-brand/60"
              />
            </label>
          </div>

          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setEditMode("dark")}
              className={cn(
                "border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                editMode === "dark"
                  ? "border-brand/70 bg-brand/15 text-foreground"
                  : "border-border text-muted-foreground hover:bg-muted"
              )}
            >
              {messages.heatThemeEditDark}
            </button>
            <button
              type="button"
              onClick={() => setEditMode("light")}
              className={cn(
                "border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                editMode === "light"
                  ? "border-brand/70 bg-brand/15 text-foreground"
                  : "border-border text-muted-foreground hover:bg-muted"
              )}
            >
              {messages.heatThemeEditLight}
            </button>
          </div>

          <div
            className="h-1.5 w-full border border-border/70"
            style={{
              background: previewGradientFromStops(editingStops, priceColorMode === "red-rise"),
            }}
          />

          <div className="space-y-1">
            {heatStopFields.map((field) => {
              const color = editingStops[field];
              const hex = rgbToHex(color);
              return (
                <label
                  key={field}
                  className="flex items-center justify-between gap-2 border border-border/80 bg-background/70 px-2 py-1"
                >
                  <span className="min-w-0 truncate text-[12px] text-muted-foreground">
                    {getHeatStopLabel(messages, field)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={hex}
                      onChange={(event) => {
                        const next = parseHexColor(event.target.value);
                        if (!next) {
                          return;
                        }
                        updateDraft((theme) => ({
                          ...theme,
                          [editMode]: {
                            ...theme[editMode],
                            [field]: next,
                          },
                        }));
                      }}
                      className="size-6 cursor-pointer border border-border bg-transparent p-0"
                    />
                    <input
                      value={hex}
                      onChange={(event) => {
                        const next = parseHexColor(event.target.value);
                        if (!next) {
                          return;
                        }
                        updateDraft((theme) => ({
                          ...theme,
                          [editMode]: {
                            ...theme[editMode],
                            [field]: next,
                          },
                        }));
                      }}
                      className="w-[6.5rem] border border-border bg-background px-1.5 py-1 font-mono text-[11px] text-foreground outline-none focus:border-brand/60"
                    />
                  </span>
                </label>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={handleSave}
              className="border border-brand/70 bg-brand/20 px-2.5 py-1.5 text-[12px] font-semibold text-foreground transition-colors hover:bg-brand/30"
            >
              {messages.heatThemeSave}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="border border-border bg-background/70 px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {messages.heatThemeCancel}
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-1 border border-border bg-background/70 px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Download className="size-3" />
              {messages.heatThemeExport}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function ChangeRangeSlider({
  value,
  gradient,
  minAriaLabel,
  maxAriaLabel,
  onChange,
}: {
  value: ChangeRangeFilter;
  gradient: string;
  minAriaLabel: string;
  maxAriaLabel: string;
  onChange: (range: ChangeRangeFilter) => void;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragThumbRef = useRef<"min" | "max" | null>(null);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);

  // Sync refs from props in a passive effect — writing them during render is unsafe.
  useEffect(() => {
    valueRef.current = value;
    onChangeRef.current = onChange;
  });

  const bounds = filterToSliderBounds(value);
  const span = changeRangeSliderMax - changeRangeSliderMin;
  const minPercent = ((bounds.min - changeRangeSliderMin) / span) * 100;
  const maxPercent = ((bounds.max - changeRangeSliderMin) / span) * 100;

  const valueFromClientX = (clientX: number) => {
    const track = trackRef.current;
    if (!track) {
      return changeRangeSliderMin;
    }

    const rect = track.getBoundingClientRect();
    if (rect.width <= 0) {
      return changeRangeSliderMin;
    }

    const ratio = (clientX - rect.left) / rect.width;
    return snapChangeRangeValue(changeRangeSliderMin + ratio * span);
  };

  const applyThumb = (thumb: "min" | "max", clientX: number) => {
    const nextValue = valueFromClientX(clientX);
    const currentValue = valueRef.current;
    const current = {
      min: currentValue.min ?? changeRangeSliderMin,
      max: currentValue.max ?? changeRangeSliderMax,
    };

    if (thumb === "min") {
      onChangeRef.current({ min: Math.min(nextValue, current.max), max: current.max });
      return;
    }

    onChangeRef.current({ min: current.min, max: Math.max(nextValue, current.min) });
  };

  const pickThumb = (clientX: number): "min" | "max" => {
    const nextValue = valueFromClientX(clientX);
    return Math.abs(nextValue - bounds.min) <= Math.abs(nextValue - bounds.max) ? "min" : "max";
  };

  return (
    <div className="space-y-1.5">
      <div
        ref={trackRef}
        className="relative h-7 cursor-pointer touch-none select-none"
        onPointerDown={(event) => {
          if (event.button !== 0) {
            return;
          }
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          const thumb = pickThumb(event.clientX);
          dragThumbRef.current = thumb;
          applyThumb(thumb, event.clientX);
        }}
        onPointerMove={(event) => {
          if (!dragThumbRef.current) {
            return;
          }
          applyThumb(dragThumbRef.current, event.clientX);
        }}
        onPointerUp={() => {
          dragThumbRef.current = null;
        }}
        onPointerCancel={() => {
          dragThumbRef.current = null;
        }}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2"
          style={{ background: gradient }}
        />
        <div
          className="pointer-events-none absolute top-1/2 h-1.5 -translate-y-1/2 bg-background/75"
          style={{ left: 0, width: `${minPercent}%` }}
        />
        <div
          className="pointer-events-none absolute top-1/2 h-1.5 -translate-y-1/2 bg-background/75"
          style={{ left: `${maxPercent}%`, right: 0 }}
        />
        <button
          type="button"
          aria-label={minAriaLabel}
          aria-valuemin={changeRangeSliderMin}
          aria-valuemax={bounds.max}
          aria-valuenow={bounds.min}
          role="slider"
          tabIndex={0}
          className="pointer-events-none absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 border-2 border-foreground bg-card shadow-[0_1px_4px_rgba(0,0,0,0.28)]"
          style={{ left: `${minPercent}%` }}
        />
        <button
          type="button"
          aria-label={maxAriaLabel}
          aria-valuemin={bounds.min}
          aria-valuemax={changeRangeSliderMax}
          aria-valuenow={bounds.max}
          role="slider"
          tabIndex={0}
          className="pointer-events-none absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 border-2 border-foreground bg-card shadow-[0_1px_4px_rgba(0,0,0,0.28)]"
          style={{ left: `${maxPercent}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] font-medium tabular-nums text-muted-foreground">
        {changeRangeSliderTicks.map((tick) => (
          <span key={tick} className={cn(tick === 0 && "text-foreground")}>
            {formatChangeRangeBound(tick)}
          </span>
        ))}
      </div>
    </div>
  );
}

function filterChipClass(active: boolean) {
  return cn(
    "h-8 border px-2 text-center text-[12px] font-semibold leading-tight transition-colors",
    active
      ? "border-brand/70 bg-brand/18 text-foreground"
      : "border-border bg-background/80 text-muted-foreground hover:bg-muted hover:text-foreground"
  );
}

function getViewportSize() {
  const visual = typeof window !== "undefined" ? window.visualViewport : null;
  return {
    width: visual?.width ?? window.innerWidth,
    height: visual?.height ?? window.innerHeight,
    offsetLeft: visual?.offsetLeft ?? 0,
    offsetTop: visual?.offsetTop ?? 0,
  };
}

function FilterPopover({
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

function FilterPanel({
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

function SettingsDrawer({
  open,
  tab,
  messages,
  locale,
  displayMode,
  filterOpenMode,
  headerTrendStats,
  refreshIntervalSeconds,
  themeColor,
  priceColorMode,
  heatThemeId,
  customHeatThemes,
  activeHeatTheme,
  shortcutBindings,
  watchlist,
  onClose,
  onTabChange,
  onLocaleChange,
  onDisplayModeChange,
  onFilterOpenModeChange,
  onHeaderTrendStatsChange,
  onRefreshIntervalChange,
  onThemeColorChange,
  onPriceColorModeChange,
  onHeatThemeIdChange,
  onCustomHeatThemesChange,
  onShortcutBindingsChange,
  onShortcutRecordingChange,
  onWatchlistAdd,
  onWatchlistRemove,
  onWatchlistClear,
  onWatchlistImportText,
  areaTipMessage,
}: {
  open: boolean;
  tab: SettingsTab;
  messages: HeatmapMessages;
  locale: Locale;
  displayMode: DisplayMode;
  filterOpenMode: FilterOpenMode;
  headerTrendStats: boolean;
  refreshIntervalSeconds: number;
  themeColor: ThemeColorKey;
  priceColorMode: PriceColorMode;
  heatThemeId: string;
  customHeatThemes: HeatTheme[];
  activeHeatTheme: HeatTheme;
  shortcutBindings: ShortcutBindings;
  watchlist: WatchlistItem[];
  areaTipMessage: string;
  onClose: () => void;
  onTabChange: (tab: SettingsTab) => void;
  onLocaleChange: (locale: Locale) => void;
  onDisplayModeChange: (mode: DisplayMode) => void;
  onFilterOpenModeChange: (mode: FilterOpenMode) => void;
  onHeaderTrendStatsChange: (enabled: boolean) => void;
  onRefreshIntervalChange: (seconds: number) => void;
  onThemeColorChange: (theme: ThemeColorKey) => void;
  onPriceColorModeChange: (mode: PriceColorMode) => void;
  onHeatThemeIdChange: (id: string) => void;
  onCustomHeatThemesChange: (themes: HeatTheme[]) => void;
  onShortcutBindingsChange: (bindings: ShortcutBindings) => void;
  onShortcutRecordingChange: (recording: boolean) => void;
  onWatchlistAdd: (item: WatchlistItem) => boolean;
  onWatchlistRemove: (code: string) => void;
  onWatchlistClear: () => void;
  onWatchlistImportText: (raw: string) => void;
}) {
  const isMobile = useIsMobile();
  const [recordingAction, setRecordingAction] = useState<ShortcutActionId | null>(null);
  const [copiedWebmcpPrompt, setCopiedWebmcpPrompt] = useState<string | null>(null);
  const [intervalDraft, setIntervalDraft] = useState(() => String(refreshIntervalSeconds));

  useEffect(() => {
    setIntervalDraft(String(refreshIntervalSeconds));
  }, [refreshIntervalSeconds]);

  // Discard an uncommitted draft when the drawer closes without a blur event.
  useEffect(() => {
    if (!open) {
      setIntervalDraft(String(refreshIntervalSeconds));
    }
  }, [open, refreshIntervalSeconds]);

  const commitRefreshInterval = () => {
    const parsed = Number.parseInt(intervalDraft, 10);
    if (!Number.isFinite(parsed)) {
      setIntervalDraft(String(refreshIntervalSeconds));
      return;
    }
    onRefreshIntervalChange(
      Math.min(maxRefreshIntervalSeconds, Math.max(minRefreshIntervalSeconds, parsed))
    );
  };

  const copyWebmcpPrompt = async (prompt: string) => {
    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard API unavailable");
      }
      await navigator.clipboard.writeText(prompt);
      setCopiedWebmcpPrompt(prompt);
      window.setTimeout(() => setCopiedWebmcpPrompt((current) => (current === prompt ? null : current)), 1800);
    } catch {
      toast.error(messages.webmcpPromptCopyFailed, { id: "webmcp-prompt-copy" });
    }
  };

  useEffect(() => {
    if (!open || tab !== "shortcuts") {
      setRecordingAction(null);
    }
  }, [open, tab]);

  useEffect(() => {
    if (isMobile && (tab === "shortcuts" || tab === "help" || tab === "webmcp")) {
      onTabChange("appearance");
    }
  }, [isMobile, onTabChange, tab]);

  useEffect(() => {
    onShortcutRecordingChange(Boolean(recordingAction));
    return () => {
      onShortcutRecordingChange(false);
    };
  }, [onShortcutRecordingChange, recordingAction]);

  useEffect(() => {
    if (!open || !recordingAction) {
      return;
    }

    const action = recordingAction;

    function onKeyDown(event: KeyboardEvent) {
      event.preventDefault();
      event.stopPropagation();

      if (event.key === "Escape") {
        setRecordingAction(null);
        return;
      }

      const key = formatShortcutKey(event);
      if (!key) {
        toast.error(messages.settingsShortcutsInvalid, { id: "shortcut-remap" });
        return;
      }

      const result = withReboundShortcut(shortcutBindings, action, key);
      if (result.invalid) {
        toast.error(messages.settingsShortcutsInvalid, { id: "shortcut-remap" });
        return;
      }

      if (result.conflict) {
        toast.error(
          messages.settingsShortcutsConflict.replace(
            "{action}",
            getShortcutActionLabel(messages, result.conflict)
          ),
          { id: "shortcut-remap" }
        );
        return;
      }

      onShortcutBindingsChange(result.bindings);
      setRecordingAction(null);
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [messages, onShortcutBindingsChange, open, recordingAction, shortcutBindings]);

  if (!open) {
    return null;
  }

  const isEnglish = locale === "en";
  const helpItems = [
    areaTipMessage,
    messages.tipColor,
    messages.tipThumbnail,
    messages.tipDoubleClick,
    messages.tipZoom,
    messages.tipDrag,
    messages.tipInspectorScroll,
    messages.tipInspectorSort,
  ];
  const tabs: Array<{ key: SettingsTab; label: string; icon: typeof Palette }> = [
    { key: "appearance", label: messages.settingsAppearance, icon: Palette },
    { key: "watchlist", label: messages.settingsWatchlist, icon: Star },
    ...(!isMobile
      ? [
          { key: "shortcuts" as const, label: messages.settingsShortcuts, icon: Keyboard },
          { key: "help" as const, label: messages.settingsHelp, icon: Info },
        ]
      : []),
    ...(!isMobile ? [{ key: "webmcp" as const, label: messages.settingsWebmcp, icon: Bot }] : []),
    { key: "project", label: messages.settingsProject, icon: ExternalLink },
  ];
  const themeLabels: Record<ThemeColorKey, string> = isEnglish
    ? { green: "Green", red: "Red", blue: "Blue", violet: "Violet" }
    : { green: "绿色", red: "红色", blue: "蓝色", violet: "紫色" };

  return (
    <div className="absolute inset-0 z-[10010] flex items-end justify-center bg-black/62 backdrop-blur-sm" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0" aria-label={messages.closeSheet} onClick={onClose} />
      <section className="relative flex h-[92dvh] w-full flex-col overflow-hidden rounded-t-lg border border-b-0 border-border bg-card text-card-foreground shadow-[0_-24px_100px_rgba(0,0,0,0.48)]">
        <div className="flex items-center justify-center pt-2">
          <span className="h-1 w-10 rounded-full bg-muted-foreground/40" aria-hidden />
        </div>
        <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold leading-tight">{messages.settingsTitle}</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{messages.settingsDescription}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={messages.closeSheet}
            className="inline-flex size-9 shrink-0 items-center justify-center border border-border bg-background/70 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 grid-rows-[48px_minmax(0,1fr)] md:grid-cols-[168px_minmax(0,1fr)] md:grid-rows-1">
          <nav className="flex h-12 min-h-12 gap-1 overflow-x-auto overflow-y-hidden border-b border-border bg-muted/20 px-2 py-1.5 md:h-auto md:min-h-0 md:flex-col md:overflow-x-visible md:border-b-0 md:border-r md:p-2">
            {tabs.map((item) => {
              const Icon = item.icon;
              const active = tab === item.key;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onTabChange(item.key)}
                  className={cn(
                    "inline-flex h-9 shrink-0 items-center gap-2 border px-3 text-left text-sm font-medium leading-none transition-colors md:w-full",
                    active
                      ? "border-brand/60 bg-brand/15 text-foreground"
                      : "border-transparent text-muted-foreground hover:border-border hover:bg-background/70 hover:text-foreground"
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="whitespace-nowrap">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className={cn("min-h-0 p-3 md:p-4", tab === "watchlist" ? "flex flex-col overflow-hidden" : "overflow-y-auto")}>
            {tab === "appearance" && (
              <div className="space-y-4 md:space-y-6">
                <section>
                  <h3 className="text-sm font-semibold">{messages.languageLabel}</h3>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onLocaleChange("zh")}
                      aria-pressed={locale === "zh"}
                      className={cn(
                        "border px-3 py-2 text-left text-sm font-semibold transition-colors md:py-3",
                        locale === "zh"
                          ? "border-brand/70 bg-brand/15 text-foreground"
                          : "border-border bg-background/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {messages.languageZh}
                    </button>
                    <button
                      type="button"
                      onClick={() => onLocaleChange("en")}
                      aria-pressed={locale === "en"}
                      className={cn(
                        "border px-3 py-2 text-left text-sm font-semibold transition-colors md:py-3",
                        locale === "en"
                          ? "border-brand/70 bg-brand/15 text-foreground"
                          : "border-border bg-background/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {messages.languageEn}
                    </button>
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-semibold">{messages.displayMode}</h3>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onDisplayModeChange("light")}
                      aria-pressed={displayMode === "light"}
                      className={cn(
                        "flex items-center gap-2 border px-3 py-2 text-left text-sm font-semibold transition-colors md:py-3",
                        displayMode === "light"
                          ? "border-brand/70 bg-brand/15 text-foreground"
                          : "border-border bg-background/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Sun className="size-4 shrink-0" />
                      {messages.lightMode}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDisplayModeChange("dark")}
                      aria-pressed={displayMode === "dark"}
                      className={cn(
                        "flex items-center gap-2 border px-3 py-2 text-left text-sm font-semibold transition-colors md:py-3",
                        displayMode === "dark"
                          ? "border-brand/70 bg-brand/15 text-foreground"
                          : "border-border bg-background/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Moon className="size-4 shrink-0" />
                      {messages.darkMode}
                    </button>
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-semibold">{messages.headerTrendStatsLabel}</h3>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onHeaderTrendStatsChange(false)}
                      aria-pressed={!headerTrendStats}
                      className={cn(
                        "border px-3 py-2 text-left text-sm font-semibold transition-colors md:py-3",
                        !headerTrendStats
                          ? "border-brand/70 bg-brand/15 text-foreground"
                          : "border-border bg-background/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {messages.headerTrendStatsOff}
                    </button>
                    <button
                      type="button"
                      onClick={() => onHeaderTrendStatsChange(true)}
                      aria-pressed={headerTrendStats}
                      className={cn(
                        "border px-3 py-2 text-left text-sm font-semibold transition-colors md:py-3",
                        headerTrendStats
                          ? "border-brand/70 bg-brand/15 text-foreground"
                          : "border-border bg-background/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {messages.headerTrendStatsOn}
                    </button>
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-semibold">{messages.settingsRefreshIntervalLabel}</h3>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={minRefreshIntervalSeconds}
                      max={maxRefreshIntervalSeconds}
                      step={1}
                      value={intervalDraft}
                      onChange={(event) => setIntervalDraft(event.target.value)}
                      onBlur={commitRefreshInterval}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.currentTarget.blur();
                        }
                      }}
                      aria-label={messages.settingsRefreshIntervalLabel}
                      className="w-24 border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground transition-colors outline-none focus:border-brand/70 focus:ring-2 focus:ring-brand/30 md:py-3"
                    />
                    <span className="text-xs text-muted-foreground">
                      {messages.settingsRefreshIntervalUnit}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {messages.settingsRefreshIntervalHint.replace(
                      "{min}",
                      String(minRefreshIntervalSeconds)
                    ).replace("{max}", String(maxRefreshIntervalSeconds))}
                  </p>
                </section>

                {!isMobile && (
                  <section>
                    <h3 className="text-sm font-semibold">{messages.filterOpenModeLabel}</h3>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => onFilterOpenModeChange("click")}
                        aria-pressed={filterOpenMode === "click"}
                        className={cn(
                          "border px-3 py-2 text-left text-sm font-semibold transition-colors md:py-3",
                          filterOpenMode === "click"
                            ? "border-brand/70 bg-brand/15 text-foreground"
                            : "border-border bg-background/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        {messages.filterOpenModeClick}
                      </button>
                      <button
                        type="button"
                        onClick={() => onFilterOpenModeChange("hover")}
                        aria-pressed={filterOpenMode === "hover"}
                        className={cn(
                          "border px-3 py-2 text-left text-sm font-semibold transition-colors md:py-3",
                          filterOpenMode === "hover"
                            ? "border-brand/70 bg-brand/15 text-foreground"
                            : "border-border bg-background/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        {messages.filterOpenModeHover}
                      </button>
                    </div>
                  </section>
                )}

                <section>
                  <h3 className="text-sm font-semibold">{messages.themeColor}</h3>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {(Object.keys(themeColors) as ThemeColorKey[]).map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => onThemeColorChange(key)}
                        aria-pressed={themeColor === key}
                        className={cn(
                          "flex items-center gap-2 border px-3 py-2 text-sm font-medium transition-colors",
                          themeColor === key
                            ? "border-brand/70 bg-brand/15 text-foreground"
                            : "border-border bg-background/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <span
                          className="size-4 shrink-0 border border-white/20"
                          style={{ backgroundColor: themeColors[key].swatch }}
                        />
                        {themeLabels[key]}
                      </button>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-semibold">{messages.priceColor}</h3>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onPriceColorModeChange("red-rise")}
                      aria-pressed={priceColorMode === "red-rise"}
                      className={cn(
                        "border px-3 py-2 text-left text-sm transition-colors md:py-3",
                        priceColorMode === "red-rise"
                          ? "border-brand/70 bg-brand/15"
                          : "border-border bg-background/70 hover:bg-muted"
                      )}
                    >
                      <span className="font-semibold text-red-400">{messages.redRiseGreenFall}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">+2.4% / -1.8%</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onPriceColorModeChange("green-rise")}
                      aria-pressed={priceColorMode === "green-rise"}
                      className={cn(
                        "border px-3 py-2 text-left text-sm transition-colors md:py-3",
                        priceColorMode === "green-rise"
                          ? "border-brand/70 bg-brand/15"
                          : "border-border bg-background/70 hover:bg-muted"
                      )}
                    >
                      <span className="font-semibold text-emerald-400">{messages.greenRiseRedFall}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">+2.4% / -1.8%</span>
                    </button>
                  </div>
                </section>

                <HeatThemeSettingsPanel
                  messages={messages}
                  locale={locale}
                  displayMode={displayMode}
                  priceColorMode={priceColorMode}
                  heatThemeId={heatThemeId}
                  customHeatThemes={customHeatThemes}
                  activeHeatTheme={activeHeatTheme}
                  onHeatThemeIdChange={onHeatThemeIdChange}
                  onCustomHeatThemesChange={onCustomHeatThemesChange}
                />
              </div>
            )}

            {tab === "watchlist" && (
              <WatchlistManager
                messages={messages}
                locale={locale}
                items={watchlist}
                maxCount={watchlistMaxCount}
                active={open && tab === "watchlist"}
                changeTextColor={(changePct) =>
                  getChangeTextColor(activeHeatTheme, changePct, priceColorMode, displayMode)
                }
                onAdd={onWatchlistAdd}
                onRemove={onWatchlistRemove}
                onClear={onWatchlistClear}
                onImportText={onWatchlistImportText}
              />
            )}

            {tab === "shortcuts" && (
              <section className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold">{messages.settingsShortcuts}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {messages.settingsShortcutsIntro}
                  </p>
                </div>
                <div className="space-y-2">
                  {shortcutActionIds.map((action) => {
                    const active = recordingAction === action;
                    return (
                      <button
                        key={action}
                        type="button"
                        onClick={() =>
                          setRecordingAction((current) => (current === action ? null : action))
                        }
                        className={cn(
                          "flex w-full items-center justify-between gap-3 border px-3 py-2.5 text-left transition-colors",
                          active
                            ? "border-brand/70 bg-brand/15"
                            : "border-border bg-background/70 hover:bg-muted"
                        )}
                      >
                        <span className="min-w-0 text-sm font-medium text-foreground">
                          {getShortcutActionLabel(messages, action)}
                        </span>
                        <span
                          className={cn(
                            "inline-flex min-w-10 shrink-0 items-center justify-center border px-2 py-1 font-mono text-xs font-semibold",
                            active
                              ? "border-brand/50 bg-background/80 text-foreground"
                              : "border-border bg-muted/40 text-muted-foreground"
                          )}
                        >
                          {active
                            ? messages.settingsShortcutsRecording
                            : formatShortcutLabel(shortcutBindings[action])}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setRecordingAction(null);
                    onShortcutBindingsChange({ ...defaultShortcutBindings });
                  }}
                  className="border border-border bg-background/70 px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {messages.settingsShortcutsReset}
                </button>
              </section>
            )}

            {tab === "help" && (
              <div className="space-y-6">
                <section>
                  <h3 className="text-sm font-semibold">{messages.helpTitle}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{messages.helpIntro}</p>
                  <div className="mt-4 space-y-2">
                    {helpItems.map((item) => (
                      <div
                        key={item}
                        className="border border-border bg-background/70 px-3 py-2 text-sm text-muted-foreground"
                      >
                        {item.replace(/^·\s*/, "")}
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-semibold">{messages.helpShortcutsTitle}</h3>
                  <div className="mt-3 overflow-hidden border border-border">
                    {shortcutActionIds.map((action, index) => (
                      <div
                        key={action}
                        className={cn(
                          "flex items-center justify-between gap-3 bg-background/70 px-3 py-2 text-sm",
                          index > 0 && "border-t border-border"
                        )}
                      >
                        <span className="min-w-0 text-muted-foreground">
                          {getShortcutActionLabel(messages, action)}
                        </span>
                        <span className="inline-flex min-w-8 shrink-0 items-center justify-center border border-border bg-muted/40 px-2 py-0.5 font-mono text-xs font-semibold text-foreground">
                          {formatShortcutLabel(shortcutBindings[action])}
                        </span>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => onTabChange("shortcuts")}
                    className="mt-3 border border-border bg-background/70 px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {messages.helpShortcutsCta}
                  </button>
                </section>
              </div>
            )}

            {tab === "webmcp" && (
              <div className="space-y-5">
                <section>
                  <div className="flex items-start gap-3">
                    <span className="inline-flex size-9 shrink-0 items-center justify-center border border-brand/45 bg-brand/12 text-brand">
                      <Bot className="size-4" />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold">{messages.webmcpTitle}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{messages.webmcpIntro}</p>
                    </div>
                  </div>
                </section>

                <section className="border border-border bg-background/70 p-3.5">
                  <h3 className="text-sm font-semibold">{messages.webmcpChatGPTTitle}</h3>
                  <ol className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
                    {[messages.webmcpChatGPTStep1, messages.webmcpChatGPTStep2, messages.webmcpChatGPTStep3].map(
                      (step, index) => (
                        <li key={step} className="flex items-start gap-2">
                          <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-brand/15 text-[11px] font-semibold text-brand">
                            {index + 1}
                          </span>
                          <span>{step}</span>
                        </li>
                      )
                    )}
                  </ol>
                  <a
                    href="https://help.openai.com/en/articles/20001423-using-site-tools-in-the-chatgpt-desktop-app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:text-brand/80"
                  >
                    {isEnglish ? "OpenAI Site tools guide" : "OpenAI Site tools 使用说明"}
                    <ExternalLink className="size-3" />
                  </a>
                </section>

                <section>
                  <h3 className="text-sm font-semibold">{isEnglish ? "Try these prompts" : "可以直接这样说"}</h3>
                  <div className="mt-3 space-y-2">
                    {[messages.webmcpPromptState, messages.webmcpPromptRanking, messages.webmcpPromptWatchlist, messages.webmcpPromptTheme].map(
                      (prompt) => (
                        <button
                          type="button"
                          key={prompt}
                          onClick={() => void copyWebmcpPrompt(prompt)}
                          title={copiedWebmcpPrompt === prompt ? messages.webmcpPromptCopied : messages.webmcpCopyPrompt}
                          aria-label={copiedWebmcpPrompt === prompt ? messages.webmcpPromptCopied : messages.webmcpCopyPrompt}
                          className="group flex w-full items-start justify-between gap-3 border border-border bg-muted/20 px-3 py-2.5 text-left transition-colors hover:border-brand/50 hover:bg-brand/8"
                        >
                          <span className="min-w-0 font-mono text-xs leading-relaxed text-foreground">{prompt}</span>
                          <span className="inline-flex shrink-0 items-center gap-1 pt-0.5 text-[10px] font-semibold text-muted-foreground group-hover:text-brand">
                            {copiedWebmcpPrompt === prompt ? <Check className="size-3" /> : <Copy className="size-3" />}
                            {copiedWebmcpPrompt === prompt ? messages.webmcpPromptCopied : messages.webmcpCopyPrompt}
                          </span>
                        </button>
                      )
                    )}
                  </div>
                </section>

                <section className="space-y-3">
                  <div className="border border-border bg-background/70 p-3.5">
                    <h3 className="text-sm font-semibold">{messages.webmcpChromeTitle}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{messages.webmcpChromeDescription}</p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                      <a
                        href="https://developer.chrome.com/docs/ai/webmcp"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:text-brand/80"
                      >
                        {messages.webmcpChromeDocsLink}
                        <ExternalLink className="size-3" />
                      </a>
                      <a
                        href="https://chromewebstore.google.com/detail/webmcp-model-context-tool/gbpdfapgefenggkahomfgkhfehlcenpd"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:text-brand/80"
                      >
                        {messages.webmcpInspectorLink}
                        <ExternalLink className="size-3" />
                      </a>
                    </div>
                  </div>
                  <div className="border border-dashed border-border bg-muted/15 p-3.5">
                    <h3 className="text-sm font-semibold">{messages.webmcpBrowserTitle}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{messages.webmcpBrowserDescription}</p>
                  </div>
                </section>
              </div>
            )}

            {tab === "project" && (
              <div className="space-y-4">
                <section className="border border-border bg-background/70 p-3.5">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex size-9 shrink-0 items-center justify-center border border-border bg-muted/40 text-foreground">
                      <GitHubMark className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold">{messages.githubProject}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {messages.githubProjectDescription}
                      </p>
                      <a
                        href={githubProjectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-brand transition-colors hover:text-brand/80"
                      >
                        github.com/wenyuanw/a-share-heatmap
                        <ExternalLink className="size-3.5 opacity-80" />
                      </a>
                    </div>
                  </div>
                </section>

                <section className="border border-border bg-background/70 p-3.5">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex size-9 shrink-0 items-center justify-center border border-border bg-muted/40 text-foreground">
                      <Mail className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold">{messages.projectAuthorTitle}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {messages.projectAuthorDescription}
                      </p>
                      <a
                        href={authorMailto}
                        className="mt-3 inline-flex items-center gap-1.5 font-mono text-[12px] font-semibold text-foreground transition-colors hover:text-brand"
                      >
                        {messages.projectAuthorEmail}
                      </a>
                    </div>
                  </div>
                </section>

                <section className="relative overflow-hidden border border-dashed border-brand/45 bg-brand/8 p-3.5">
                  <div
                    className="pointer-events-none absolute -right-6 -top-6 size-24 rotate-12 border border-brand/20 bg-brand/10"
                    aria-hidden
                  />
                  <div className="relative flex items-start gap-3">
                    <span className="inline-flex size-9 shrink-0 items-center justify-center border border-brand/40 bg-brand/15 text-brand">
                      <Megaphone className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-foreground">{messages.projectAdTitle}</h3>
                        <span className="border border-brand/40 bg-brand/15 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-brand">
                          OPEN
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                        {messages.projectAdDescription}
                      </p>
                      <a
                        href={`${authorMailto}?subject=${encodeURIComponent(
                          locale === "zh" ? "广告位招租咨询" : "Ad slot inquiry"
                        )}`}
                        className="mt-3 inline-flex items-center gap-1.5 border border-brand/50 bg-brand/15 px-2.5 py-1.5 text-[12px] font-semibold text-foreground transition-colors hover:bg-brand/25"
                      >
                        {messages.projectAdCta}
                        <Mail className="size-3.5 opacity-80" />
                      </a>
                    </div>
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export function MarketHeatmap({ locale: initialLocale }: { locale: Locale; messages?: HeatmapMessages }) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const inspectorListRef = useRef<HTMLDivElement | null>(null);

  const [locale, setLocale] = useState<Locale>(initialLocale);
  const messages = useMemo(() => getMessages(locale).heatmap, [locale]);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [displayMode, setDisplayMode] = useState<DisplayMode>("dark");
  const [filterOpenMode, setFilterOpenMode] = useState<FilterOpenMode>("click");
  const [themeColor, setThemeColor] = useState<ThemeColorKey>("red");
  const [priceColorMode, setPriceColorMode] = useState<PriceColorMode>("red-rise");
  const [heatThemeId, setHeatThemeId] = useState(defaultHeatThemeId);
  const [customHeatThemes, setCustomHeatThemes] = useState<HeatTheme[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("appearance");
  const [shortcutBindings, setShortcutBindings] = useState<ShortcutBindings>(() => ({
    ...defaultShortcutBindings,
  }));
  const [shortcutRecording, setShortcutRecording] = useState(false);
  const [market, setMarket] = useState<HeatmapUniverse>("all");
  const [period, setPeriod] = useState<HeatmapPeriodKey>("day");
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [boardFilter, setBoardFilter] = useState<string[]>([]);
  const [trendFilter, setTrendFilter] = useState(allTrendsValue);
  const [changeRangeFilter, setChangeRangeFilter] = useState<ChangeRangeFilter>(emptyChangeRangeFilter);
  const [changeRangeMinInput, setChangeRangeMinInput] = useState("");
  const [changeRangeMaxInput, setChangeRangeMaxInput] = useState("");
  const [sizeMode, setSizeMode] = useState<HeatmapSizeMode>("marketCap");
  const [thumbnailMode, setThumbnailMode] = useState(false);
  const [headerTrendStats, setHeaderTrendStats] = useState(true);
  const [refreshIntervalSeconds, setRefreshIntervalSeconds] = useState(defaultRefreshIntervalSeconds);
  const [marketSummaries, setMarketSummaries] = useState<Partial<Record<MarketKey, MarketSummary>>>({});
  const [treemapData, setTreemapData] = useState<TreemapResponse | null>(null);
  const [quotes, setQuotes] = useState<QuoteMap>({});
  const [dataSource, setDataSource] = useState<MarketDataSource | null>(null);
  // The bundled sample snapshot is fetched once on mount and reused as an instant
  // pre-preference fallback so the very first render can already paint a full Canvas.
  const [initialSnapshot] = useState<TreemapResponse | null>(() => getBundledSnapshotTreemap());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshRequestId, setRefreshRequestId] = useState(0);
  const [updatedAt, setUpdatedAt] = useState("");
  // Set once the Canvas has painted the bundled sample — from then on the sample
  // stays visible instead of being masked by the full-screen loading overlay.
  const [samplePainted, setSamplePainted] = useState(false);;

  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 760 });
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sharePreview, setSharePreview] = useState<ScreenshotPreview | null>(null);
  const [sharePending, setSharePending] = useState(false);

  const [hoveredStockCode, setHoveredStockCode] = useState<string | null>(null);
  const [hoveredBoardName, setHoveredBoardName] = useState<string | null>(null);
  const [hoveredBoardTitleName, setHoveredBoardTitleName] = useState<string | null>(null);
  const [hoveredSubBoardName, setHoveredSubBoardName] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const [selectedStockCode, setSelectedStockCode] = useState<string | null>(null);
  const [inspectorSortKey, setInspectorSortKey] = useState<InspectorSortKey>("changeDesc");
  const [selectedBoardName, setSelectedBoardName] = useState<string | null>(null);
  const [selectedSubBoardName, setSelectedSubBoardName] = useState<string | null>(null);
  const isEnglish = locale === "en";
  const isLightMode = displayMode === "light";
  const isMobile = useIsMobile();
  const maxZoom = isMobile ? mobileMaxZoom : desktopMaxZoom;
  const isDesktopHoverFilterMode = !isMobile && filterOpenMode === "hover";
  const activeHeatTheme = useMemo(
    () => resolveHeatTheme(heatThemeId, customHeatThemes),
    [customHeatThemes, heatThemeId]
  );
  const legendGradient = useMemo(
    () => getLegendGradient(activeHeatTheme, priceColorMode, displayMode),
    [activeHeatTheme, displayMode, priceColorMode]
  );
  const changeRangeSliderGradient = useMemo(
    () =>
      legendGradientFromTheme(
        activeHeatTheme,
        priceColorMode === "red-rise",
        displayMode,
        [-20, -10, -4, 0, 4, 10, 20]
      ),
    [activeHeatTheme, displayMode, priceColorMode]
  );
  const heatmapCanvasTheme = heatmapCanvasThemes[displayMode];
  const brandStyle = useMemo(
    () =>
      ({
        "--brand": themeColors[themeColor].swatch,
        "--brand-foreground": themeColors[themeColor].foreground,
      }) as CSSProperties,
    [themeColor]
  );
  const riseTextColor = getRiseTextColor(activeHeatTheme, priceColorMode, displayMode);
  const fallTextColor = getFallTextColor(activeHeatTheme, priceColorMode, displayMode);

  const activeStockCode = isMobile ? selectedStockCode : hoveredStockCode;
  const activeBoardName = isMobile ? selectedBoardName : hoveredBoardName;
  const activeSubBoardName = isMobile ? selectedSubBoardName : hoveredSubBoardName;

  const lastStockRectsRef = useRef<StockRect[]>([]);
  const lastBoardRectsRef = useRef<BoardRect[]>([]);
  const lastSubBoardRectsRef = useRef<SubBoardRect[]>([]);
  const sidebarFilterTriggerRef = useRef<HTMLButtonElement>(null);
  const filterTriggerRefs = useMemo(() => [sidebarFilterTriggerRef], []);
  const filterHoverOpenTimerRef = useRef<number | null>(null);
  const filterHoverCloseTimerRef = useRef<number | null>(null);
  const dragStateRef = useRef({
    active: false,
    pointerX: 0,
    pointerY: 0,
    startX: 0,
    startY: 0,
    moved: false,
  });
  const boardClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStateRef = useRef<{
    mode: "idle" | "pan" | "pinch" | "tap";
    startClientX: number;
    startClientY: number;
    lastClientX: number;
    lastClientY: number;
    startTs: number;
    moved: boolean;
    startDistance: number;
    startScale: number;
    startOffsetX: number;
    startOffsetY: number;
    pinchCenterX: number;
    pinchCenterY: number;
    pinchWorldX: number;
    pinchWorldY: number;
    lastTapTs: number;
    lastTapX: number;
    lastTapY: number;
  }>({
    mode: "idle",
    startClientX: 0,
    startClientY: 0,
    lastClientX: 0,
    lastClientY: 0,
    startTs: 0,
    moved: false,
    startDistance: 0,
    startScale: 1,
    startOffsetX: 0,
    startOffsetY: 0,
    pinchCenterX: 0,
    pinchCenterY: 0,
    pinchWorldX: 0,
    pinchWorldY: 0,
    lastTapTs: 0,
    lastTapX: 0,
    lastTapY: 0,
  });

  useEffect(() => {
    try {
      const storedLocale = window.localStorage.getItem("heatmap-locale");
      const storedDisplayMode = window.localStorage.getItem("heatmap-display-mode");
      const storedTheme = window.localStorage.getItem("heatmap-theme-color");
      const storedPriceColor = window.localStorage.getItem("heatmap-price-color");
      const storedFilterOpenMode = window.localStorage.getItem(filterOpenModeStorageKey);
      const storedSizeMode = window.localStorage.getItem("heatmap-size-mode");
      const storedThumbnailMode = window.localStorage.getItem(thumbnailModeStorageKey);
      const storedHeaderTrendStats = window.localStorage.getItem(headerTrendStatsStorageKey);
      const storedRefreshInterval = window.localStorage.getItem(refreshIntervalStorageKey);
      const storedMarket = window.sessionStorage.getItem(marketStorageKey);
      const storedPeriod = window.sessionStorage.getItem(periodStorageKey);
      const storedBoardFilter = window.sessionStorage.getItem(boardFilterStorageKey);
      const storedTrendFilter = window.sessionStorage.getItem(trendFilterStorageKey);
      const storedChangeRangeFilter = window.sessionStorage.getItem(changeRangeFilterStorageKey);
      const storedShortcuts = window.localStorage.getItem(shortcutStorageKey);
      const storedHeatThemeId = window.localStorage.getItem(heatThemeStorageKey);
      const storedCustomHeatThemes = window.localStorage.getItem(customHeatThemesStorageKey);
      const seedFlag = window.localStorage.getItem(heatThemesSeedStorageKey);

      if (storedLocale === "zh" || storedLocale === "en") {
        setLocale(storedLocale);
      }
      if (storedDisplayMode === "dark" || storedDisplayMode === "light") {
        setDisplayMode(storedDisplayMode);
      }
      if (storedTheme === "green" || storedTheme === "red" || storedTheme === "blue" || storedTheme === "violet") {
        setThemeColor(storedTheme);
      }
      if (storedPriceColor === "red-rise" || storedPriceColor === "green-rise") {
        setPriceColorMode(storedPriceColor);
      }
      if (storedFilterOpenMode === "click" || storedFilterOpenMode === "hover") {
        setFilterOpenMode(storedFilterOpenMode);
      }
      if (storedSizeMode === "marketCap" || storedSizeMode === "turnover") {
        setSizeMode(storedSizeMode);
      }
      if (storedThumbnailMode === "on" || storedThumbnailMode === "off") {
        setThumbnailMode(storedThumbnailMode === "on");
      }
      if (storedHeaderTrendStats === "on" || storedHeaderTrendStats === "off") {
        setHeaderTrendStats(storedHeaderTrendStats === "on");
      }
      setRefreshIntervalSeconds(normalizeRefreshIntervalSeconds(storedRefreshInterval));
      const storedWatchlist = window.localStorage.getItem(watchlistStorageKey);
      setWatchlist(parseStoredWatchlist(storedWatchlist));
      if (storedMarket && isHeatmapUniverse(storedMarket)) {
        setMarket(storedMarket);
      }
      if (storedPeriod && isHeatmapPeriodKey(storedPeriod)) {
        setPeriod(storedPeriod);
      }
      if (storedBoardFilter) {
        setBoardFilter(parseStoredBoardFilter(storedBoardFilter));
      }
      if (
        storedTrendFilter === allTrendsValue ||
        storedTrendFilter === risingOnlyValue ||
        storedTrendFilter === fallingOnlyValue
      ) {
        setTrendFilter(storedTrendFilter);
      }
      if (storedChangeRangeFilter) {
        const parsedChangeRange = parseStoredChangeRangeFilter(storedChangeRangeFilter);
        setChangeRangeFilter(parsedChangeRange);
        setChangeRangeMinInput(formatChangeRangeInput(parsedChangeRange.min));
        setChangeRangeMaxInput(formatChangeRangeInput(parsedChangeRange.max));
      }
      setShortcutBindings(parseStoredShortcuts(storedShortcuts));
      let customThemes = parseStoredCustomHeatThemes(storedCustomHeatThemes);
      if (!seedFlag) {
        customThemes = mergeSeedHeatThemes(customThemes);
        try {
          window.localStorage.setItem(heatThemesSeedStorageKey, "1");
          window.localStorage.setItem(customHeatThemesStorageKey, serializeCustomHeatThemes(customThemes));
        } catch {
          /* Preferences are optional. */
        }
      }
      setCustomHeatThemes(customThemes);
      if (storedHeatThemeId) {
        setHeatThemeId(resolveHeatTheme(storedHeatThemeId, customThemes).id);
      }
    } catch {
      /* Preferences are optional. */
    } finally {
      setPreferencesReady(true);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
    if (!preferencesReady) {
      return;
    }
    try {
      window.localStorage.setItem("heatmap-locale", locale);
    } catch {
      /* Preferences are optional. */
    }
  }, [locale, preferencesReady]);

  useEffect(() => {
    if (!preferencesReady) {
      return;
    }

    const isDark = displayMode === "dark";
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";

    try {
      window.localStorage.setItem("heatmap-display-mode", displayMode);
    } catch {
      /* Preferences are optional. */
    }
  }, [displayMode, preferencesReady]);

  useEffect(() => {
    if (!preferencesReady) {
      return;
    }
    try {
      window.localStorage.setItem("heatmap-theme-color", themeColor);
    } catch {
      /* Preferences are optional. */
    }
  }, [preferencesReady, themeColor]);

  useEffect(() => {
    if (!preferencesReady) {
      return;
    }
    try {
      window.localStorage.setItem("heatmap-price-color", priceColorMode);
    } catch {
      /* Preferences are optional. */
    }
  }, [preferencesReady, priceColorMode]);

  useEffect(() => {
    if (!preferencesReady) {
      return;
    }
    try {
      window.localStorage.setItem(filterOpenModeStorageKey, filterOpenMode);
    } catch {
      /* Preferences are optional. */
    }
  }, [filterOpenMode, preferencesReady]);

  useEffect(() => {
    if (!preferencesReady) {
      return;
    }
    try {
      window.localStorage.setItem("heatmap-size-mode", sizeMode);
    } catch {
      /* Preferences are optional. */
    }
  }, [preferencesReady, sizeMode]);

  useEffect(() => {
    if (!preferencesReady) {
      return;
    }
    try {
      window.localStorage.setItem(thumbnailModeStorageKey, thumbnailMode ? "on" : "off");
    } catch {
      /* Preferences are optional. */
    }
  }, [preferencesReady, thumbnailMode]);

  useEffect(() => {
    if (!preferencesReady) {
      return;
    }
    try {
      window.localStorage.setItem(headerTrendStatsStorageKey, headerTrendStats ? "on" : "off");
    } catch {
      /* Preferences are optional. */
    }
  }, [headerTrendStats, preferencesReady]);

  useEffect(() => {
    if (!preferencesReady) {
      return;
    }
    try {
      window.localStorage.setItem(refreshIntervalStorageKey, String(refreshIntervalSeconds));
    } catch {
      /* Preferences are optional. */
    }
  }, [refreshIntervalSeconds, preferencesReady]);

  useEffect(() => {
    if (!preferencesReady) {
      return;
    }
    try {
      window.sessionStorage.setItem(marketStorageKey, market);
    } catch {
      /* Preferences are optional. */
    }
  }, [market, preferencesReady]);

  useEffect(() => {
    if (!preferencesReady) {
      return;
    }
    try {
      window.localStorage.setItem(watchlistStorageKey, serializeWatchlist(watchlist));
    } catch {
      /* Preferences are optional. */
    }
  }, [preferencesReady, watchlist]);

  useEffect(() => {
    if (!preferencesReady) {
      return;
    }
    try {
      window.sessionStorage.setItem(periodStorageKey, period);
    } catch {
      /* Preferences are optional. */
    }
  }, [period, preferencesReady]);

  useEffect(() => {
    if (!preferencesReady) {
      return;
    }
    try {
      window.sessionStorage.setItem(boardFilterStorageKey, JSON.stringify(boardFilter));
    } catch {
      /* Preferences are optional. */
    }
  }, [boardFilter, preferencesReady]);

  useEffect(() => {
    if (!preferencesReady) {
      return;
    }
    try {
      window.sessionStorage.setItem(trendFilterStorageKey, trendFilter);
    } catch {
      /* Preferences are optional. */
    }
  }, [preferencesReady, trendFilter]);

  useEffect(() => {
    if (!preferencesReady) {
      return;
    }
    try {
      window.sessionStorage.setItem(changeRangeFilterStorageKey, JSON.stringify(changeRangeFilter));
    } catch {
      /* Preferences are optional. */
    }
  }, [changeRangeFilter, preferencesReady]);

  useEffect(() => {
    if (!preferencesReady) {
      return;
    }
    try {
      window.localStorage.setItem(shortcutStorageKey, serializeShortcuts(shortcutBindings));
    } catch {
      /* Preferences are optional. */
    }
  }, [preferencesReady, shortcutBindings]);

  useEffect(() => {
    if (!preferencesReady) {
      return;
    }
    try {
      window.localStorage.setItem(heatThemeStorageKey, heatThemeId);
      window.localStorage.setItem(customHeatThemesStorageKey, serializeCustomHeatThemes(customHeatThemes));
    } catch {
      /* Preferences are optional. */
    }
  }, [customHeatThemes, heatThemeId, preferencesReady]);

  const areaTipMessage = useMemo(
    () => (sizeMode === "turnover" ? messages.tipAreaTurnover : messages.tipAreaMarketCap),
    [messages.tipAreaMarketCap, messages.tipAreaTurnover, sizeMode]
  );
  const refreshSize = useCallback(() => {
    const target = viewportRef.current;
    if (!target) {
      return;
    }

    const nextWidth = Math.max(1, Math.floor(target.clientWidth));
    const nextHeight = Math.max(1, Math.floor(target.clientHeight));

    setCanvasSize((current) => {
      if (current.width === nextWidth && current.height === nextHeight) {
        return current;
      }

      return { width: nextWidth, height: nextHeight };
    });
  }, []);

  const watchlistCodes = useMemo(() => watchlist.map((item) => item.code), [watchlist]);
  const watchlistCodeSet = useMemo(() => new Set(watchlistCodes), [watchlistCodes]);
  const isWatchlist = market === watchlistUniverseKey;

  const fetchTreemap = useCallback(
    async (nextMarket: HeatmapUniverse, nextPeriod: HeatmapPeriodKey, codes: string[]) => {
      if (nextMarket === watchlistUniverseKey) {
        if (codes.length === 0) {
          setTreemapData(createEmptyWatchlistTreemap(nextPeriod));
          setQuotes({});
          setUpdatedAt("");
          setDataSource(null);
          return;
        }

        const params = new URLSearchParams({
          period: nextPeriod,
          codes: codes.join(","),
        });
        const response = await fetch(`/api/heatmap/treemap?${params.toString()}`);
        if (!response.ok) {
          throw new Error(messages.errorLoad);
        }

        const payload = (await response.json()) as TreemapResponse;
        setTreemapData(payload);
        setUpdatedAt(payload.updatedAt);
        setDataSource(payload.source);
        return;
      }

      const response = await fetch(`/api/heatmap/treemap?market=${nextMarket}&period=${nextPeriod}`);
      if (!response.ok) {
        throw new Error(messages.errorLoad);
      }

      const payload = (await response.json()) as TreemapResponse;
      setTreemapData(payload);
      setUpdatedAt(payload.updatedAt);
      setDataSource(payload.source);
    },
    [messages.errorLoad]
  );

  const fetchQuotes = useCallback(
    async (nextMarket: HeatmapUniverse, nextPeriod: HeatmapPeriodKey, codes: string[]) => {
      if (nextMarket === watchlistUniverseKey) {
        if (codes.length === 0) {
          setQuotes({});
          return;
        }

        const params = new URLSearchParams({
          period: nextPeriod,
          codes: codes.join(","),
        });
        const response = await fetch(`/api/heatmap/quotes?${params.toString()}`);
        if (!response.ok) {
          throw new Error(messages.errorLoad);
        }

        const payload = (await response.json()) as { updatedAt: string; quotes: QuoteMap; source?: MarketDataSource };
        setQuotes(payload.quotes);
        setUpdatedAt(payload.updatedAt);
        if (payload.source) {
          setDataSource(payload.source);
        }
        return;
      }

      const response = await fetch(`/api/heatmap/quotes?market=${nextMarket}&period=${nextPeriod}`);
      if (!response.ok) {
        throw new Error(messages.errorLoad);
      }

      const payload = (await response.json()) as { updatedAt: string; quotes: QuoteMap; source?: MarketDataSource };
      setQuotes(payload.quotes);
      setUpdatedAt(payload.updatedAt);
      if (payload.source) {
        setDataSource(payload.source);
      }
    },
    [messages.errorLoad]
  );

  const fetchMarketSummaries = useCallback(async (nextPeriod: HeatmapPeriodKey) => {
    const response = await fetch(`/api/heatmap/overview?period=${nextPeriod}`);
    if (!response.ok) {
      throw new Error(messages.errorLoad);
    }

    const payload = (await response.json()) as MarketOverviewResponse;
    const next: Partial<Record<MarketKey, MarketSummary>> = {};

    for (const item of payload.markets) {
      next[item.market] = {
        changePct: item.changePct,
        stockCount: item.stockCount,
        updatedAt: item.updatedAt,
      };
    }

    setMarketSummaries(next);
  }, [messages.errorLoad]);

  useEffect(() => {
    document.documentElement.classList.add("heatmap-page-active");
    document.body.classList.add("heatmap-page-active");

    return () => {
      document.documentElement.classList.remove("heatmap-page-active");
      document.body.classList.remove("heatmap-page-active");
    };
  }, []);

  const retryDataLoad = useCallback(() => {
    setError(null);
    setRefreshRequestId((current) => current + 1);
  }, []);

  useEffect(() => {
    if (inspectorListRef.current) {
      inspectorListRef.current.scrollTop = 0;
    }
  }, [activeBoardName, inspectorSortKey]);

  useEffect(() => {
    refreshSize();

    const target = viewportRef.current;
    const resizeObserver =
      target && typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => refreshSize()) : null;

    if (resizeObserver && target) {
      resizeObserver.observe(target);
    }
    window.addEventListener("resize", refreshSize, { passive: true });

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", refreshSize);
    };
  }, [refreshSize]);

  useEffect(() => {
    refreshSize();
  }, [isFullscreen, refreshSize]);

  useEffect(() => {
    setView((current) => {
      if (current.scale <= 1) {
        return current.x === 0 && current.y === 0 ? current : { scale: 1, x: 0, y: 0 };
      }

      if (current.scale > maxZoom) {
        const nextScale = maxZoom;
        const nextOffset = clampOffset(canvasSize.width, canvasSize.height, nextScale, current.x, current.y);
        return {
          scale: nextScale,
          x: nextOffset.x,
          y: nextOffset.y,
        };
      }

      const nextOffset = clampOffset(canvasSize.width, canvasSize.height, current.scale, current.x, current.y);
      if (nextOffset.x === current.x && nextOffset.y === current.y) {
        return current;
      }

      return {
        ...current,
        x: nextOffset.x,
        y: nextOffset.y,
      };
    });
  }, [canvasSize.height, canvasSize.width, maxZoom]);

  useEffect(() => {
    return () => {
      if (sharePreview) {
        URL.revokeObjectURL(sharePreview.url);
      }
    };
  }, [sharePreview]);

  useEffect(() => {
    function stopPan() {
      dragStateRef.current.active = false;
      setIsPanning(false);
    }

    window.addEventListener("mouseup", stopPan);

    return () => {
      window.removeEventListener("mouseup", stopPan);
      if (boardClickTimerRef.current) {
        clearTimeout(boardClickTimerRef.current);
        boardClickTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!preferencesReady) {
      return;
    }

    let cancelled = false;

    async function loadTreemap() {
      setError(null);
      setHoveredStockCode(null);
      setHoveredBoardName(null);
      setHoveredBoardTitleName(null);
      setHoveredSubBoardName(null);
      setSelectedStockCode(null);
      setSelectedBoardName(null);
      setSelectedSubBoardName(null);

      if (market === watchlistUniverseKey && watchlistCodes.length === 0) {
        setTreemapData(createEmptyWatchlistTreemap(period));
        setQuotes({});
        setUpdatedAt("");
        setDataSource(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        await fetchTreemap(market, period, watchlistCodes);
      } catch {
        if (!cancelled) {
          setError(messages.errorLoad);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadTreemap();

    return () => {
      cancelled = true;
    };
  }, [fetchTreemap, market, messages.errorLoad, period, preferencesReady, refreshRequestId, watchlistCodes]);

  usePollWhileVisible(
    useCallback(async () => {
      if (!preferencesReady) {
        return;
      }
      try {
        await fetchQuotes(market, period, watchlistCodes);
      } catch {
        setError(messages.errorLoad);
      }
    }, [fetchQuotes, market, messages.errorLoad, period, preferencesReady, watchlistCodes]),
    refreshIntervalSeconds * 1000
  );

  usePollWhileVisible(
    useCallback(async () => {
      if (!preferencesReady) {
        return;
      }
      try {
        await fetchMarketSummaries(period);
      } catch {
        // Keep existing summaries if the refresh fails.
      }
    }, [fetchMarketSummaries, period, preferencesReady]),
    refreshIntervalSeconds * 1000
  );

  useEffect(() => {
    if (!treemapData || boardFilter.length === 0) {
      return;
    }

    const nextFilter = sanitizeBoardFilter(
      boardFilter,
      treemapData.nodes.map((node) => node.name)
    );

    if (!boardFiltersEqual(boardFilter, nextFilter)) {
      setBoardFilter(nextFilter);
    }
  }, [boardFilter, treemapData]);

  useEffect(() => {
    setHoveredStockCode(null);
    setHoveredBoardName(null);
    setHoveredBoardTitleName(null);
    setHoveredSubBoardName(null);
    setSelectedStockCode(null);
    setSelectedBoardName(null);
    setSelectedSubBoardName(null);
    setView({ scale: 1, x: 0, y: 0 });
  }, [boardFilter, trendFilter]);

  useEffect(() => {
    setView({ scale: 1, x: 0, y: 0 });
  }, [sizeMode, thumbnailMode]);

  const applyChangeRange = useCallback((next: ChangeRangeFilter) => {
    const normalized = normalizeChangeRangeFilter(next);
    setChangeRangeFilter(normalized);
    setChangeRangeMinInput(formatChangeRangeInput(normalized.min));
    setChangeRangeMaxInput(formatChangeRangeInput(normalized.max));
  }, []);

  const commitChangeRangeInputs = useCallback(
    (minRaw = changeRangeMinInput, maxRaw = changeRangeMaxInput) => {
      applyChangeRange({
        min: parseChangeRangeInput(minRaw, changeRangeFilter.min),
        max: parseChangeRangeInput(maxRaw, changeRangeFilter.max),
      });
    },
    [applyChangeRange, changeRangeFilter.max, changeRangeFilter.min, changeRangeMaxInput, changeRangeMinInput]
  );

  const clearFilterHoverTimers = useCallback(() => {
    if (filterHoverOpenTimerRef.current) {
      window.clearTimeout(filterHoverOpenTimerRef.current);
      filterHoverOpenTimerRef.current = null;
    }
    if (filterHoverCloseTimerRef.current) {
      window.clearTimeout(filterHoverCloseTimerRef.current);
      filterHoverCloseTimerRef.current = null;
    }
  }, []);

  const openFilters = useCallback(() => {
    setSettingsOpen(false);
    if (isMobile) {
      setSidebarOpen(false);
    }
    setFiltersOpen(true);
  }, [isMobile]);

  const toggleFilters = useCallback(() => {
    clearFilterHoverTimers();
    setFiltersOpen((open) => {
      const next = !open;
      if (next) {
        setSettingsOpen(false);
        if (isMobile) {
          setSidebarOpen(false);
        }
      }
      return next;
    });
  }, [clearFilterHoverTimers, isMobile]);

  const closeFilters = useCallback(() => {
    clearFilterHoverTimers();
    setFiltersOpen(false);
  }, [clearFilterHoverTimers]);

  const openWatchlistSettings = useCallback(() => {
    setFiltersOpen(false);
    setSettingsTab("watchlist");
    setSettingsOpen(true);
  }, []);

  const addWatchlistItem = useCallback(
    (item: WatchlistItem) => {
      if (watchlist.some((stock) => stock.code === item.code)) {
        toast.message(messages.watchlistAlreadyAdded, { id: "heatmap-watchlist" });
        return false;
      }
      if (watchlist.length >= watchlistMaxCount) {
        toast.error(messages.watchlistMaxReached.replace("{count}", String(watchlistMaxCount)), {
          id: "heatmap-watchlist",
        });
        return false;
      }

      setWatchlist((current) => [...current, item]);
      if (watchlist.length === 0) {
        setMarket(watchlistUniverseKey);
      }
      toast.success(messages.watchlistAddSuccess.replace("{name}", item.name), { id: "heatmap-watchlist" });
      return true;
    },
    [messages.watchlistAddSuccess, messages.watchlistAlreadyAdded, messages.watchlistMaxReached, watchlist]
  );

  const removeWatchlistItem = useCallback(
    (code: string) => {
      const item = watchlist.find((stock) => stock.code === code);
      setWatchlist((current) => current.filter((stock) => stock.code !== code));
      if (item) {
        toast.success(messages.watchlistRemoveSuccess.replace("{name}", item.name), { id: "heatmap-watchlist" });
      }
    },
    [messages.watchlistRemoveSuccess, watchlist]
  );

  const clearWatchlist = useCallback(() => {
    setWatchlist([]);
    toast.success(messages.watchlistClearSuccess, { id: "heatmap-watchlist" });
  }, [messages.watchlistClearSuccess]);

  const toggleWatchlistItem = useCallback(
    (stock: {
      code: string;
      name: string;
      boardName?: string | null;
      subBoardName?: string | null;
    }) => {
      if (watchlist.some((item) => item.code === stock.code)) {
        removeWatchlistItem(stock.code);
        return;
      }

      const exchange = parseStockCode(stock.code).market;
      addWatchlistItem({
        code: stock.code,
        name: stock.name,
        boardName: stock.boardName ?? undefined,
        subBoardName: stock.subBoardName ?? undefined,
        exchange: exchange === "SH" || exchange === "SZ" || exchange === "BJ" ? exchange : undefined,
      });
    },
    [addWatchlistItem, removeWatchlistItem, watchlist]
  );

  const importWatchlistFromText = useCallback(
    (raw: string) => {
      const imported = parseWatchlistExportPayload(raw);
      if (!imported || imported.length === 0) {
        toast.error(messages.watchlistImportFailed, { id: "heatmap-watchlist" });
        return;
      }

      const seen = new Set(watchlist.map((item) => item.code));
      const merged = [...watchlist];
      let added = 0;
      let skipped = 0;
      for (const item of imported) {
        if (seen.has(item.code) || merged.length >= watchlistMaxCount) {
          skipped += 1;
          continue;
        }
        seen.add(item.code);
        merged.push(item);
        added += 1;
      }

      setWatchlist(merged);
      toast.success(
        messages.watchlistImportSuccess
          .replace("{added}", String(added))
          .replace("{skipped}", String(skipped)),
        { id: "heatmap-watchlist" }
      );
    },
    [messages.watchlistImportFailed, messages.watchlistImportSuccess, watchlist]
  );

  const handleFilterHoverEnter = useCallback(() => {
    if (!isDesktopHoverFilterMode) {
      return;
    }
    if (filterHoverCloseTimerRef.current) {
      window.clearTimeout(filterHoverCloseTimerRef.current);
      filterHoverCloseTimerRef.current = null;
    }
    if (filtersOpen || filterHoverOpenTimerRef.current) {
      return;
    }
    filterHoverOpenTimerRef.current = window.setTimeout(() => {
      filterHoverOpenTimerRef.current = null;
      openFilters();
    }, filterHoverOpenDelayMs);
  }, [filtersOpen, isDesktopHoverFilterMode, openFilters]);

  const handleFilterHoverLeave = useCallback(() => {
    if (!isDesktopHoverFilterMode) {
      return;
    }
    if (filterHoverOpenTimerRef.current) {
      window.clearTimeout(filterHoverOpenTimerRef.current);
      filterHoverOpenTimerRef.current = null;
    }
    if (!filtersOpen) {
      return;
    }
    if (filterHoverCloseTimerRef.current) {
      window.clearTimeout(filterHoverCloseTimerRef.current);
    }
    filterHoverCloseTimerRef.current = window.setTimeout(() => {
      filterHoverCloseTimerRef.current = null;
      setFiltersOpen(false);
    }, filterHoverCloseDelayMs);
  }, [filtersOpen, isDesktopHoverFilterMode]);

  const resetViewFilters = useCallback(() => {
    setBoardFilter([]);
    setTrendFilter(allTrendsValue);
    applyChangeRange(emptyChangeRangeFilter);
  }, [applyChangeRange]);

  const boardFilterOptions = useMemo(() => treemapData?.nodes ?? [], [treemapData]);
  const isAllBoardsSelected = boardFilter.length === 0;
  const activeFilterCount = countActiveViewFilters(boardFilter, trendFilter, changeRangeFilter);
  useEffect(() => clearFilterHoverTimers, [clearFilterHoverTimers]);
  useEffect(() => {
    if (!isDesktopHoverFilterMode) {
      clearFilterHoverTimers();
    }
  }, [clearFilterHoverTimers, isDesktopHoverFilterMode]);

  const activeFilterSummary = useMemo(() => {
    const parts: string[] = [];
    if (boardFilter.length === 1) {
      parts.push(boardFilter[0]);
    } else if (boardFilter.length > 1) {
      parts.push(messages.selectedBoardCount.replace("{count}", String(boardFilter.length)));
    }

    if (trendFilter === risingOnlyValue) {
      parts.push(messages.risingOnly);
    } else if (trendFilter === fallingOnlyValue) {
      parts.push(messages.fallingOnly);
    }

    const rangeSummary = formatChangeRangeSummary(changeRangeFilter);
    if (rangeSummary) {
      parts.push(rangeSummary);
    }

    return parts.join(" · ");
  }, [boardFilter, changeRangeFilter, messages.fallingOnly, messages.risingOnly, messages.selectedBoardCount, trendFilter]);

  // Before live data arrives, fall back to the bundled sample snapshot so the canvas
  // always has a full heatmap to paint — even on the very first render.
  const visibleTreemapData = useMemo<TreemapResponse | null>(() => {
    if (!treemapData) {
      return initialSnapshot;
    }

    if (initialSnapshot && boardFilter.length === 0 && trendFilter === allTrendsValue && !isChangeRangeActive(changeRangeFilter)) {
      return treemapData;
    }

    const applyBoardFilter = (data: TreemapResponse) => {
      if (boardFilter.length === 0) {
        return data;
      }

      const selectedNames = new Set(boardFilter);
      const selectedBoards = data.nodes.filter((node) => selectedNames.has(node.name));
      if (selectedBoards.length === 0) {
        return data;
      }

      let advanceCount = 0;
      let flatCount = 0;
      let declineCount = 0;
      let turnoverAmount = 0;
      const selectedStocks = selectedBoards.flatMap((board) => board.children);

      for (const stock of selectedStocks) {
        const changePct = quotes[stock.code]?.changePct ?? stock.changePct;

        if (changePct > flatThreshold) {
          advanceCount += 1;
        } else if (changePct < -flatThreshold) {
          declineCount += 1;
        } else {
          flatCount += 1;
        }

        turnoverAmount += getLiveTurnoverAmount(stock.code, stock.turnoverAmount, quotes);
      }

      return {
        ...data,
        stockCount: selectedStocks.length,
        boardCount: selectedBoards.length,
        summary: {
          ...data.summary,
          advanceCount,
          flatCount,
          declineCount,
          turnoverAmount,
          turnoverPreviousAmount: 0,
          turnoverDelta: 0,
          indexChangePct: weightedAverageChange(selectedStocks, quotes),
        },
        nodes: selectedBoards,
      };
    };

    const applyTrendFilter = (data: TreemapResponse) => {
      if (trendFilter === allTrendsValue) {
        return data;
      }

      return filterTreemapByStockPredicate(data, quotes, (changePct) => {
        if (trendFilter === risingOnlyValue) {
          return changePct > flatThreshold;
        }

        if (trendFilter === fallingOnlyValue) {
          return changePct < -flatThreshold;
        }

        return true;
      });
    };

    const applyChangeRangeFilter = (data: TreemapResponse) => {
      if (!isChangeRangeActive(changeRangeFilter)) {
        return data;
      }

      return filterTreemapByStockPredicate(data, quotes, (changePct) =>
        matchesChangeRange(changePct, changeRangeFilter)
      );
    };

    let result = applyBoardFilter(treemapData);
    result = applyTrendFilter(result);
    result = applyChangeRangeFilter(result);
    return result;
  }, [boardFilter, changeRangeFilter, initialSnapshot, quotes, trendFilter, treemapData]);

  const marketOverview = useMemo<MarketOverview | null>(() => {
    if (!visibleTreemapData) {
      return null;
    }

    return {
      advanceCount: visibleTreemapData.summary.advanceCount,
      flatCount: visibleTreemapData.summary.flatCount,
      declineCount: visibleTreemapData.summary.declineCount,
      turnoverAmount: visibleTreemapData.summary.turnoverAmount,
      turnoverPreviousAmount: visibleTreemapData.summary.turnoverPreviousAmount,
      turnoverDelta: visibleTreemapData.summary.turnoverDelta,
    };
  }, [visibleTreemapData]);

  const sizedTreemapData = useMemo(
    () => (visibleTreemapData ? applySizeModeToTreemapData(visibleTreemapData, quotes, sizeMode) : null),
    [quotes, sizeMode, visibleTreemapData]
  );

  const layout = useMemo(() => {
    if (!sizedTreemapData) {
      return {
        stockRects: [] as StockRect[],
        boardRects: [] as BoardRect[],
        subBoardRects: [] as SubBoardRect[],
      };
    }

    const boardRects: BoardRect[] = [];
    const subBoardRects: SubBoardRect[] = [];
    const stockRects: StockRect[] = [];

    const boardBoxes = binaryTreemap(
      sizedTreemapData.nodes.map((board) => ({ item: board, value: board.value })),
      0,
      0,
      canvasSize.width,
      canvasSize.height,
      6
    );

    for (const boardBox of boardBoxes) {
      const boardChangePct = weightedAverageChange(boardBox.item.children, quotes);
      const boardTrends = countStockTrends(boardBox.item.children, quotes);
      const titleHeight =
        boardBox.width < 84 || boardBox.height < 54
          ? 0
          : clamp(Math.round(Math.min(Math.max(boardBox.height * 0.1, 16), 26)), 14, 26);
      const contentPadding = boardBox.width > 110 && boardBox.height > 90 ? 3 : 2;
      const contentX = boardBox.x + contentPadding;
      const contentY = boardBox.y + titleHeight + contentPadding;
      const contentWidth = Math.max(0, boardBox.width - contentPadding * 2);
      const contentHeight = Math.max(0, boardBox.height - titleHeight - contentPadding * 2);

      boardRects.push({
        name: boardBox.item.name,
        x: boardBox.x,
        y: boardBox.y,
        width: boardBox.width,
        height: boardBox.height,
        stockCount: boardBox.item.stockCount,
        titleHeight,
        changePct: boardChangePct,
        ...boardTrends,
      });

      if (contentWidth <= 2 || contentHeight <= 2) {
        continue;
      }

      const subBoards = groupStocksBySubBoard(boardBox.item.children, quotes);
      const shouldNestSubBoards = market !== "zza50" && (thumbnailMode || subBoards.length > 1);

      if (!shouldNestSubBoards) {
        if (thumbnailMode) {
          subBoardRects.push({
            name: boardBox.item.name,
            boardName: boardBox.item.name,
            x: contentX,
            y: contentY,
            width: contentWidth,
            height: contentHeight,
            stockCount: boardBox.item.stockCount,
            titleHeight: 0,
            changePct: boardChangePct,
            ...boardTrends,
          });
          continue;
        }

        const stockBoxes = binaryTreemap(
          boardBox.item.children.map((stock) => ({ item: stock, value: stock.value })),
          contentX,
          contentY,
          contentWidth,
          contentHeight,
          1.5
        );

        for (const stockBox of stockBoxes) {
          const quote = quotes[stockBox.item.code];

          stockRects.push({
            code: stockBox.item.code,
            name: stockBox.item.name,
            boardName: boardBox.item.name,
            subBoardName: market === "zza50" ? boardBox.item.name : stockBox.item.subBoardName,
            value: stockBox.item.value,
            x: stockBox.x,
            y: stockBox.y,
            width: stockBox.width,
            height: stockBox.height,
            price: quote?.price ?? stockBox.item.price,
            changePct: quote?.changePct ?? stockBox.item.changePct,
          });
        }

        continue;
      }

      const subBoardBoxes = binaryTreemap(
        subBoards.map((subBoard) => ({ item: subBoard, value: subBoard.value })),
        contentX,
        contentY,
        contentWidth,
        contentHeight,
        boardBox.width > 96 && boardBox.height > 72 ? (thumbnailMode ? 3 : 2) : thumbnailMode ? 2 : 1
      );

      for (const subBoardBox of subBoardBoxes) {
        const subTrends = countStockTrends(subBoardBox.item.children, quotes);
        const subTitleHeight = thumbnailMode
          ? 0
          : subBoardBox.width < 52 || subBoardBox.height < 40
            ? 0
            : clamp(Math.round(Math.min(Math.max(subBoardBox.height * 0.14, 14), 22)), 12, 22);
        const subPadding = thumbnailMode
          ? 0
          : subBoardBox.width > 82 && subBoardBox.height > 56
            ? 2
            : 1;
        const subContentX = subBoardBox.x + subPadding;
        const subContentY = subBoardBox.y + subTitleHeight + subPadding;
        const subContentWidth = Math.max(0, subBoardBox.width - subPadding * 2);
        const subContentHeight = Math.max(0, subBoardBox.height - subTitleHeight - subPadding * 2);

        subBoardRects.push({
          name: subBoardBox.item.name,
          boardName: boardBox.item.name,
          x: subBoardBox.x,
          y: subBoardBox.y,
          width: subBoardBox.width,
          height: subBoardBox.height,
          stockCount: subBoardBox.item.stockCount,
          titleHeight: subTitleHeight,
          changePct: subBoardBox.item.changePct,
          ...subTrends,
        });

        if (thumbnailMode || subContentWidth <= 2 || subContentHeight <= 2) {
          continue;
        }

        const stockBoxes = binaryTreemap(
          subBoardBox.item.children.map((stock) => ({ item: stock, value: stock.value })),
          subContentX,
          subContentY,
          subContentWidth,
          subContentHeight,
          subBoardBox.width > 56 && subBoardBox.height > 38 ? 1 : 0.5
        );

        for (const stockBox of stockBoxes) {
          const quote = quotes[stockBox.item.code];

          stockRects.push({
            code: stockBox.item.code,
            name: stockBox.item.name,
            boardName: boardBox.item.name,
            subBoardName: stockBox.item.subBoardName,
            value: stockBox.item.value,
            x: stockBox.x,
            y: stockBox.y,
            width: stockBox.width,
            height: stockBox.height,
            price: quote?.price ?? stockBox.item.price,
            changePct: quote?.changePct ?? stockBox.item.changePct,
          });
        }
      }
    }

    return { stockRects, boardRects, subBoardRects };
  }, [canvasSize.height, canvasSize.width, market, quotes, sizedTreemapData, thumbnailMode]);

  useEffect(() => {
    lastStockRectsRef.current = layout.stockRects;
    lastBoardRectsRef.current = layout.boardRects;
    lastSubBoardRectsRef.current = layout.subBoardRects;
  }, [layout.boardRects, layout.stockRects, layout.subBoardRects]);

  const activeStock = useMemo(() => {
    if (!activeStockCode) {
      return null;
    }

    return layout.stockRects.find((stock) => stock.code === activeStockCode) ?? null;
  }, [activeStockCode, layout.stockRects]);

  const highlightedStock = useMemo(() => {
    if (activeStock) {
      return activeStock;
    }

    if (!activeBoardName) {
      return null;
    }

    return layout.stockRects.find((stock) => stock.boardName === activeBoardName) ?? null;
  }, [activeBoardName, activeStock, layout.stockRects]);

  const activeBoardRect = useMemo(() => {
    if (!activeBoardName) {
      return null;
    }

    return layout.boardRects.find((board) => board.name === activeBoardName) ?? null;
  }, [activeBoardName, layout.boardRects]);

  const activeSubBoardRect = useMemo(() => {
    if (!activeBoardName || !activeSubBoardName) {
      return null;
    }

    return (
      layout.subBoardRects.find(
        (sub) => sub.name === activeSubBoardName && sub.boardName === activeBoardName
      ) ?? null
    );
  }, [activeBoardName, activeSubBoardName, layout.subBoardRects]);

  const activeBoardStocks = useMemo(() => {
    if (!activeBoardName || !visibleTreemapData) {
      return [] as InspectorStockItem[];
    }

    const board = visibleTreemapData.nodes.find((node) => node.name === activeBoardName);
    if (!board) {
      return [];
    }

    const scopedChildren =
      thumbnailMode && activeSubBoardName
        ? board.children.filter((stock) => (stock.subBoardName || stock.boardName) === activeSubBoardName)
        : board.children;
    const children = scopedChildren.length > 0 ? scopedChildren : board.children;

    return children
      .map((stock) => {
        const quote = quotes[stock.code];
        return {
          code: stock.code,
          name: stock.name,
          subBoardName: stock.subBoardName,
          price: quote?.price ?? stock.price,
          changePct: quote?.changePct ?? stock.changePct,
          turnoverAmount: quote?.turnoverAmount ?? stock.turnoverAmount ?? 0,
          marketCap: stock.value,
        };
      })
      .sort((left, right) => compareInspectorStocks(left, right, inspectorSortKey));
  }, [activeBoardName, activeSubBoardName, inspectorSortKey, quotes, thumbnailMode, visibleTreemapData]);

  const inspectorStocks = useMemo(() => {
    if (activeBoardStocks.length === 0) {
      return [] as Array<InspectorStockItem & { active: boolean }>;
    }

    if (!highlightedStock) {
      return activeBoardStocks.map((stock) => ({
        ...stock,
        active: false,
      }));
    }

    const current = activeBoardStocks.find((stock) => stock.code === highlightedStock.code) ?? {
      code: highlightedStock.code,
      name: highlightedStock.name,
      subBoardName: highlightedStock.subBoardName,
      price: highlightedStock.price,
      changePct: highlightedStock.changePct,
      turnoverAmount: quotes[highlightedStock.code]?.turnoverAmount ?? 0,
      marketCap: highlightedStock.value,
    };

    const rest = activeBoardStocks.filter((stock) => stock.code !== highlightedStock.code);

    return [
      { ...current, active: true },
      ...rest.map((stock) => ({
        ...stock,
        active: false,
      })),
    ];
  }, [activeBoardStocks, highlightedStock, quotes]);

  const activeInspectorStock = inspectorStocks[0] ?? null;
  const activeInspectorTitle = useMemo(() => {
    if (!activeBoardName) {
      return activeBoardName;
    }

    const subBoardName = highlightedStock?.subBoardName || activeSubBoardName;

    if (subBoardName && subBoardName !== activeBoardName) {
      return `${activeBoardName} - ${subBoardName}`;
    }

    return activeBoardName;
  }, [activeBoardName, highlightedStock, activeSubBoardName]);

  const inspectorSectorStats = useMemo(() => {
    if (!activeBoardName || !visibleTreemapData) {
      return null;
    }

    const board = visibleTreemapData.nodes.find((node) => node.name === activeBoardName);
    if (!board) {
      return null;
    }

    const subBoardName = highlightedStock?.subBoardName || activeSubBoardName;
    const scoped =
      subBoardName && subBoardName !== activeBoardName
        ? board.children.filter((stock) => (stock.subBoardName || stock.boardName) === subBoardName)
        : board.children;
    const stocks = scoped.length > 0 ? scoped : board.children;
    const trends = countStockTrends(stocks, quotes);

    return {
      ...trends,
      changePct: weightedAverageChange(stocks, quotes),
    };
  }, [activeBoardName, activeSubBoardName, highlightedStock, quotes, visibleTreemapData]);

  const inspectorStyle = useMemo(() => {
    if (isMobile) {
      return null;
    }

    if (!activeBoardRect || inspectorStocks.length === 0) {
      return null;
    }

    const gutter = 12;
    const maxPopupWidth = Math.max(320, canvasSize.width - gutter * 2);
    const preferredWidth = canvasSize.width >= 1360 ? 452 : canvasSize.width >= 1100 ? 432 : 408;
    const popupWidth = Math.min(maxPopupWidth, preferredWidth);
    const popupHeightEstimate = Math.min(620, Math.max(350, Math.floor(canvasSize.height * 0.7)));

    const toScreenRect = (rect: { x: number; y: number; width: number; height: number }) => {
      const screenLeft = rect.x * view.scale + view.x;
      const screenTop = rect.y * view.scale + view.y;
      const screenRight = (rect.x + rect.width) * view.scale + view.x;
      return { left: screenLeft, top: screenTop, right: screenRight };
    };

    const boardScreen = toScreenRect(activeBoardRect);
    const boardFitsRight = boardScreen.right + gutter + popupWidth <= canvasSize.width - gutter;
    const boardFitsLeft = boardScreen.left - gutter - popupWidth >= gutter;

    // When the active board fills (or overflows) the visible canvas — common
    // when viewing a single 一级板块 — neither side of it can host the popup.
    // Fall back to a tighter anchor (hovered stock, then sub-board) so the
    // popup appears next to whatever the user is pointing at instead of being
    // pinned to the left gutter.
    const anchorRect =
      !boardFitsRight && !boardFitsLeft
        ? activeStock ?? activeSubBoardRect ?? activeBoardRect
        : activeBoardRect;
    const anchorScreen = toScreenRect(anchorRect);

    const fitsRight = anchorScreen.right + gutter + popupWidth <= canvasSize.width - gutter;
    const fitsLeft = anchorScreen.left - gutter - popupWidth >= gutter;

    let desiredLeft: number;
    if (fitsRight) {
      desiredLeft = anchorScreen.right + gutter;
    } else if (fitsLeft) {
      desiredLeft = anchorScreen.left - popupWidth - gutter;
    } else {
      // Anchor still doesn't fit either side; pick whichever side has more
      // empty space so the popup doesn't always cover the same area.
      const spaceLeft = anchorScreen.left;
      const spaceRight = canvasSize.width - anchorScreen.right;
      desiredLeft =
        spaceRight >= spaceLeft ? canvasSize.width - popupWidth - gutter : gutter;
    }

    const left = clamp(desiredLeft, gutter, Math.max(gutter, canvasSize.width - popupWidth - gutter));
    const top = clamp(
      anchorScreen.top,
      gutter,
      Math.max(gutter, canvasSize.height - popupHeightEstimate - gutter)
    );
    const maxHeight = Math.max(220, canvasSize.height - top - gutter);

    return {
      left,
      top,
      width: popupWidth,
      maxHeight,
    };
  }, [
    canvasSize.height,
    canvasSize.width,
    activeBoardRect,
    activeStock,
    activeSubBoardRect,
    inspectorStocks.length,
    isMobile,
    view.scale,
    view.x,
    view.y,
  ]);

  useEffect(() => {
    const inspectorOpen = Boolean(inspectorStyle) || (isMobile && Boolean(selectedBoardName));
    if (!inspectorOpen || inspectorStocks.length === 0) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName;
      if (
        target?.isContentEditable ||
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        tagName === "SELECT"
      ) {
        return;
      }

      if (event.key === "s" || event.key === "S") {
        event.preventDefault();
        setInspectorSortKey((current) => cycleInspectorSortKey(current, event.shiftKey ? -1 : 1));
        return;
      }

      if (!inspectorStyle) {
        return;
      }

      const list = inspectorListRef.current;
      if (!list) {
        return;
      }

      const pageStep = Math.max(120, list.clientHeight * 0.82);
      let handled = true;
      let top = list.scrollTop;

      switch (event.key) {
        case "ArrowDown":
        case "j":
        case "J":
          top += 56;
          break;
        case "ArrowUp":
        case "k":
        case "K":
          top -= 56;
          break;
        case "PageDown":
          top += pageStep;
          break;
        case "PageUp":
          top -= pageStep;
          break;
        case "Home":
          top = 0;
          break;
        case "End":
          top = list.scrollHeight;
          break;
        default:
          handled = false;
      }

      if (!handled) {
        return;
      }

      event.preventDefault();
      list.scrollTo({
        top: clamp(top, 0, Math.max(0, list.scrollHeight - list.clientHeight)),
        behavior: "smooth",
      });
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [inspectorStocks.length, inspectorStyle, isMobile, selectedBoardName]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const pixelRatio = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    canvas.width = Math.floor(canvasSize.width * pixelRatio);
    canvas.height = Math.floor(canvasSize.height * pixelRatio);
    canvas.style.width = `${canvasSize.width}px`;
    canvas.style.height = `${canvasSize.height}px`;

    const background = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    background.addColorStop(0, heatmapCanvasTheme.backgroundStart);
    background.addColorStop(1, heatmapCanvasTheme.backgroundEnd);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = background;
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.save();
    context.scale(pixelRatio, pixelRatio);
    context.translate(view.x, view.y);
    context.scale(view.scale, view.scale);

    for (const board of layout.boardRects) {
      context.fillStyle = heatmapCanvasTheme.boardFill;
      context.fillRect(board.x, board.y, board.width, board.height);
    }

    for (const subBoard of layout.subBoardRects) {
      context.fillStyle = thumbnailMode
        ? getHeatColor(activeHeatTheme, subBoard.changePct, priceColorMode, displayMode)
        : heatmapCanvasTheme.subBoardFill;
      context.fillRect(subBoard.x, subBoard.y, subBoard.width, subBoard.height);
    }

    if (!thumbnailMode) {
      for (const stock of layout.stockRects) {
        context.fillStyle = getHeatColor(activeHeatTheme, stock.changePct, priceColorMode, displayMode);
        context.fillRect(stock.x, stock.y, stock.width, stock.height);
        drawStockLabel(context, stock, view.scale);
      }
    }

    for (const subBoard of layout.subBoardRects) {
      const isActiveSubBoard =
        activeSubBoardName === subBoard.name && activeBoardName === subBoard.boardName;

      if (!thumbnailMode && subBoard.titleHeight > 0) {
        context.fillStyle = getBoardHeaderColor(
          activeHeatTheme,
          subBoard.changePct,
          priceColorMode,
          displayMode
        );
        context.fillRect(subBoard.x, subBoard.y, subBoard.width, subBoard.titleHeight);
      }

      context.strokeStyle = isActiveSubBoard
        ? heatmapCanvasTheme.activeSubBoardStroke
        : heatmapCanvasTheme.subBoardBorder;
      context.lineWidth = isActiveSubBoard ? 2 : thumbnailMode ? 1.1 : 0.9;
      context.strokeRect(
        subBoard.x + 0.5,
        subBoard.y + 0.5,
        Math.max(0, subBoard.width - 1),
        Math.max(0, subBoard.height - 1)
      );

      if (isActiveSubBoard) {
        context.strokeStyle = heatmapCanvasTheme.activeSubBoardInner;
        context.lineWidth = 0.8;
        context.strokeRect(
          subBoard.x + 2.2,
          subBoard.y + 2.2,
          Math.max(0, subBoard.width - 4.4),
          Math.max(0, subBoard.height - 4.4)
        );
      }

      if (thumbnailMode) {
        drawSectorThumbnailLabel(context, subBoard, messages, view.scale);
      } else if (subBoard.width > 44 && subBoard.titleHeight > 8) {
        drawSectorHeaderLabel(context, subBoard, {
          name: subBoard.name,
          changePct: subBoard.changePct,
          advanceCount: subBoard.advanceCount,
          declineCount: subBoard.declineCount,
          messages,
          compact: true,
          showStats: headerTrendStats,
        });
      }
    }

    for (const board of layout.boardRects) {
      const isActiveBoard = activeBoardName === board.name;
      const isTitleHovered = hoveredBoardTitleName === board.name;
      const showDrillHint = isAllBoardsSelected && board.width > 72 && board.titleHeight > 10;

      if (board.titleHeight > 0) {
        context.fillStyle = getBoardHeaderColor(activeHeatTheme, board.changePct, priceColorMode, displayMode);
        context.fillRect(board.x, board.y, board.width, board.titleHeight);

        if (isActiveBoard || isTitleHovered) {
          context.fillStyle = isTitleHovered ? "rgba(255, 255, 255, 0.22)" : "rgba(255, 255, 255, 0.12)";
          context.fillRect(board.x, board.y, board.width, board.titleHeight);
        }
      }

      context.strokeStyle =
        isActiveBoard || isTitleHovered
          ? heatmapCanvasTheme.activeBoardStroke
          : heatmapCanvasTheme.boardBorder;
      context.lineWidth = isActiveBoard || isTitleHovered ? 1.8 : 1;
      context.strokeRect(board.x + 0.5, board.y + 0.5, Math.max(0, board.width - 1), Math.max(0, board.height - 1));

      if (board.width > 56 && board.titleHeight > 10) {
        const isBreadcrumb = boardFilter.includes(board.name);
        const titleText = isBreadcrumb
          ? boardFilter.length === 1
            ? `‹ ${messages.boardBreadcrumbAll} - ${board.name}`
            : `‹ ${board.name}`
          : board.name;
        drawSectorHeaderLabel(context, board, {
          name: titleText,
          changePct: board.changePct,
          advanceCount: board.advanceCount,
          declineCount: board.declineCount,
          messages,
          showDrillHint,
          showStats: thumbnailMode || headerTrendStats,
        });

        if (showDrillHint) {
          context.fillStyle = isTitleHovered || isActiveBoard ? "rgba(255, 255, 255, 0.95)" : "rgba(247, 250, 252, 0.72)";
          context.font = heatmapFont(700, Math.max(10, clamp(Math.floor(board.titleHeight * 0.52), 10, 15)));
          context.textAlign = "right";
          context.textBaseline = "middle";
          context.fillText("›", board.x + board.width - 8, board.y + board.titleHeight / 2 + 0.5);
        }
      }
    }

    if (highlightedStock) {
      context.strokeStyle = heatmapCanvasTheme.highlightOuter;
      context.lineWidth = 4;
      context.strokeRect(
        highlightedStock.x + 1,
        highlightedStock.y + 1,
        Math.max(0, highlightedStock.width - 2),
        Math.max(0, highlightedStock.height - 2)
      );

      context.strokeStyle = heatmapCanvasTheme.highlightInner;
      context.lineWidth = 2;
      context.strokeRect(
        highlightedStock.x + 1,
        highlightedStock.y + 1,
        Math.max(0, highlightedStock.width - 2),
        Math.max(0, highlightedStock.height - 2)
      );
    }

    context.restore();

    // First successful paint of any data makes the sample Canvas authoritative —
    // hide the full-screen loading overlay from then on so it never masks the bars.
    if (!samplePainted) {
      setSamplePainted(true);
    }
  }, [
    canvasSize.height,
    canvasSize.width,
    activeBoardName,
    activeSubBoardName,
    boardFilter,
    highlightedStock,
    heatmapCanvasTheme,
    hoveredBoardTitleName,
    isAllBoardsSelected,
    layout.boardRects,
    layout.subBoardRects,
    layout.stockRects,
    messages,
    thumbnailMode,
    headerTrendStats,
    activeHeatTheme,
    displayMode,
    priceColorMode,
    samplePainted,
    view.scale,
    view.x,
    view.y,
  ]);

  const toWorldPoint = useCallback(
    (screenX: number, screenY: number) => ({
      x: (screenX - view.x) / view.scale,
      y: (screenY - view.y) / view.scale,
    }),
    [view.scale, view.x, view.y]
  );

  const pickStock = useCallback((worldX: number, worldY: number) => {
    for (let index = lastStockRectsRef.current.length - 1; index >= 0; index -= 1) {
      const stock = lastStockRectsRef.current[index];
      if (
        worldX >= stock.x &&
        worldX <= stock.x + stock.width &&
        worldY >= stock.y &&
        worldY <= stock.y + stock.height
      ) {
        return stock;
      }
    }

    return null;
  }, []);

  const pickBoard = useCallback((worldX: number, worldY: number) => {
    for (let index = lastBoardRectsRef.current.length - 1; index >= 0; index -= 1) {
      const board = lastBoardRectsRef.current[index];
      if (
        worldX >= board.x &&
        worldX <= board.x + board.width &&
        worldY >= board.y &&
        worldY <= board.y + board.height
      ) {
        return board;
      }
    }

    return null;
  }, []);

  const pickBoardTitle = useCallback((worldX: number, worldY: number) => {
    for (let index = lastBoardRectsRef.current.length - 1; index >= 0; index -= 1) {
      const board = lastBoardRectsRef.current[index];
      if (
        board.titleHeight > 0 &&
        worldX >= board.x &&
        worldX <= board.x + board.width &&
        worldY >= board.y &&
        worldY <= board.y + board.titleHeight
      ) {
        return board;
      }
    }

    return null;
  }, []);

  const pickSubBoard = useCallback((worldX: number, worldY: number) => {
    for (let index = lastSubBoardRectsRef.current.length - 1; index >= 0; index -= 1) {
      const subBoard = lastSubBoardRectsRef.current[index];
      if (
        worldX >= subBoard.x &&
        worldX <= subBoard.x + subBoard.width &&
        worldY >= subBoard.y &&
        worldY <= subBoard.y + subBoard.height
      ) {
        return subBoard;
      }
    }

    return null;
  }, []);

  const pickSubBoardTitle = useCallback((worldX: number, worldY: number) => {
    for (let index = lastSubBoardRectsRef.current.length - 1; index >= 0; index -= 1) {
      const subBoard = lastSubBoardRectsRef.current[index];
      if (
        subBoard.titleHeight > 0 &&
        worldX >= subBoard.x &&
        worldX <= subBoard.x + subBoard.width &&
        worldY >= subBoard.y &&
        worldY <= subBoard.y + subBoard.titleHeight
      ) {
        return subBoard;
      }
    }

    return null;
  }, []);

  const onMouseMove = useCallback(
    (event: ReactMouseEvent<HTMLCanvasElement>) => {
      if (isMobile) {
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      const bounds = canvas.getBoundingClientRect();
      const pointerX = event.clientX - bounds.left;
      const pointerY = event.clientY - bounds.top;

      if (dragStateRef.current.active) {
        const deltaX = event.clientX - dragStateRef.current.pointerX;
        const deltaY = event.clientY - dragStateRef.current.pointerY;
        dragStateRef.current.pointerX = event.clientX;
        dragStateRef.current.pointerY = event.clientY;

        if (
          Math.hypot(event.clientX - dragStateRef.current.startX, event.clientY - dragStateRef.current.startY) > 4
        ) {
          dragStateRef.current.moved = true;
        }

        setView((current) => {
          const nextOffset = clampOffset(
            canvasSize.width,
            canvasSize.height,
            current.scale,
            current.x + deltaX,
            current.y + deltaY
          );

          if (nextOffset.x === current.x && nextOffset.y === current.y) {
            return current;
          }

          return {
            ...current,
            x: nextOffset.x,
            y: nextOffset.y,
          };
        });
        return;
      }

      if (
        Math.hypot(event.clientX - dragStateRef.current.startX, event.clientY - dragStateRef.current.startY) > 4
      ) {
        dragStateRef.current.moved = true;
      }

      const world = toWorldPoint(pointerX, pointerY);
      const stock = pickStock(world.x, world.y);
      const boardTitle = stock ? null : pickBoardTitle(world.x, world.y);
      const subBoard = stock
        ? { name: stock.subBoardName, boardName: stock.boardName }
        : pickSubBoard(world.x, world.y);
      const board = stock
        ? { name: stock.boardName }
        : subBoard
          ? { name: subBoard.boardName }
          : pickBoard(world.x, world.y);

      setHoveredStockCode(stock?.code ?? null);
      setHoveredBoardName(board?.name ?? null);
      setHoveredBoardTitleName(boardTitle?.name ?? null);
      setHoveredSubBoardName(subBoard?.name || null);
    },
    [canvasSize.height, canvasSize.width, isMobile, pickBoard, pickBoardTitle, pickStock, pickSubBoard, toWorldPoint]
  );

  const onMouseDown = useCallback(
    (event: ReactMouseEvent<HTMLCanvasElement>) => {
      dragStateRef.current.startX = event.clientX;
      dragStateRef.current.startY = event.clientY;
      dragStateRef.current.moved = false;

      if (isMobile || view.scale <= 1) {
        return;
      }

      event.preventDefault();
      dragStateRef.current.active = true;
      dragStateRef.current.pointerX = event.clientX;
      dragStateRef.current.pointerY = event.clientY;
      setIsPanning(true);
    },
    [isMobile, view.scale]
  );

  const onMouseUp = useCallback(() => {
    dragStateRef.current.active = false;
    setIsPanning(false);
  }, []);

  const onMouseLeave = useCallback(() => {
    dragStateRef.current.active = false;
    setIsPanning(false);
    if (!isMobile) {
      setHoveredStockCode(null);
      setHoveredBoardName(null);
      setHoveredBoardTitleName(null);
      setHoveredSubBoardName(null);
    }
  }, [isMobile]);

  const onWheel = useCallback(
    (event: WheelEvent) => {
      event.preventDefault();

      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      const bounds = canvas.getBoundingClientRect();
      const cursorX = event.clientX - bounds.left;
      const cursorY = event.clientY - bounds.top;

      setView((current) => {
        const step = event.deltaY < 0 ? 0.16 : -0.16;
        const nextScale = clamp(current.scale + step, minZoom, maxZoom);

        if (nextScale === current.scale) {
          return current;
        }

        const worldX = (cursorX - current.x) / current.scale;
        const worldY = (cursorY - current.y) / current.scale;
        const rawX = cursorX - worldX * nextScale;
        const rawY = cursorY - worldY * nextScale;
        const nextOffset = clampOffset(canvasSize.width, canvasSize.height, nextScale, rawX, rawY);

        return {
          scale: nextScale,
          x: nextOffset.x,
          y: nextOffset.y,
        };
      });
    },
    [canvasSize.height, canvasSize.width, maxZoom]
  );

  // React delegates wheel listeners as passive at the root, so preventDefault()
  // must run in our own non-passive native listener instead of the onWheel prop.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      canvas.removeEventListener("wheel", onWheel);
    };
  }, [onWheel]);

  const toggleBoardFilter = useCallback((boardName: string) => {
    setBoardFilter((current) => toggleBoardInFilter(current, boardName));
  }, []);

  const clearBoardFilter = useCallback(() => {
    setBoardFilter([]);
  }, []);

  const clearBoardClickTimer = useCallback(() => {
    if (boardClickTimerRef.current) {
      clearTimeout(boardClickTimerRef.current);
      boardClickTimerRef.current = null;
    }
  }, []);

  const handleCanvasTap = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      const bounds = canvas.getBoundingClientRect();
      const world = toWorldPoint(clientX - bounds.left, clientY - bounds.top);

      const boardTitle = pickBoardTitle(world.x, world.y);
      if (boardTitle) {
        toggleBoardFilter(boardTitle.name);
        return;
      }

      const subBoardTitle = pickSubBoardTitle(world.x, world.y);
      if (subBoardTitle) {
        toggleBoardFilter(subBoardTitle.boardName);
        return;
      }

      const stock = pickStock(world.x, world.y);

      if (stock) {
        setSelectedStockCode(stock.code);
        setSelectedBoardName(stock.boardName);
        setSelectedSubBoardName(stock.subBoardName || null);
        return;
      }

      const subBoard = pickSubBoard(world.x, world.y);
      if (subBoard) {
        setSelectedStockCode(null);
        setSelectedBoardName(subBoard.boardName);
        setSelectedSubBoardName(subBoard.name);
        return;
      }

      const board = pickBoard(world.x, world.y);
      if (board) {
        setSelectedStockCode(null);
        setSelectedBoardName(board.name);
        setSelectedSubBoardName(null);
        return;
      }

      setSelectedStockCode(null);
      setSelectedBoardName(null);
      setSelectedSubBoardName(null);
    },
    [pickBoard, pickBoardTitle, pickStock, pickSubBoard, pickSubBoardTitle, toWorldPoint, toggleBoardFilter]
  );

  const handleCanvasDoubleTap = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return false;
      }

      const bounds = canvas.getBoundingClientRect();
      const world = toWorldPoint(clientX - bounds.left, clientY - bounds.top);

      const boardTitle = pickBoardTitle(world.x, world.y);
      if (boardTitle) {
        toggleBoardFilter(boardTitle.name);
        return true;
      }

      const subBoardTitle = pickSubBoardTitle(world.x, world.y);
      if (subBoardTitle) {
        toggleBoardFilter(subBoardTitle.boardName);
        return true;
      }

      // On touch devices the title strip is small; fall back to the whole
      // board so users can double-tap anywhere inside a 一级板块 to toggle.
      const board = pickBoard(world.x, world.y);
      if (board) {
        toggleBoardFilter(board.name);
        return true;
      }

      return false;
    },
    [pickBoard, pickBoardTitle, pickSubBoardTitle, toWorldPoint, toggleBoardFilter]
  );

  const openXueqiuForStock = useCallback((code: string) => {
    window.open(`https://xueqiu.com/S/${toXueqiuSymbol(code)}`, "_blank", "noopener,noreferrer");
  }, []);

  const closeMobileSheet = useCallback(() => {
    setSelectedStockCode(null);
    setSelectedBoardName(null);
    setSelectedSubBoardName(null);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    function midpointDistance(touches: TouchList) {
      if (touches.length < 2) {
        return 0;
      }
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.hypot(dx, dy);
    }

    function midpoint(touches: TouchList) {
      return {
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2,
      };
    }

    function onTouchStart(event: TouchEvent) {
      const canvasEl = canvasRef.current;
      if (!canvasEl) {
        return;
      }

      const state = touchStateRef.current;

      if (event.touches.length === 2) {
        event.preventDefault();
        const bounds = canvasEl.getBoundingClientRect();
        const center = midpoint(event.touches);
        const cursorX = center.x - bounds.left;
        const cursorY = center.y - bounds.top;

        state.mode = "pinch";
        state.moved = true;
        state.startDistance = midpointDistance(event.touches) || 1;
        state.pinchCenterX = cursorX;
        state.pinchCenterY = cursorY;
        setView((current) => {
          state.startScale = current.scale;
          state.startOffsetX = current.x;
          state.startOffsetY = current.y;
          state.pinchWorldX = (cursorX - current.x) / current.scale;
          state.pinchWorldY = (cursorY - current.y) / current.scale;
          return current;
        });
        return;
      }

      if (event.touches.length === 1) {
        const touch = event.touches[0];
        state.mode = "tap";
        state.moved = false;
        state.startTs = Date.now();
        state.startClientX = touch.clientX;
        state.startClientY = touch.clientY;
        state.lastClientX = touch.clientX;
        state.lastClientY = touch.clientY;
      }
    }

    function onTouchMove(event: TouchEvent) {
      const state = touchStateRef.current;

      if (event.touches.length >= 2 && state.mode === "pinch") {
        event.preventDefault();
        const currentDistance = midpointDistance(event.touches);
        if (!currentDistance) {
          return;
        }

        const ratio = currentDistance / state.startDistance;
        const nextScale = clamp(state.startScale * ratio, minZoom, maxZoom);
        const rawX = state.pinchCenterX - state.pinchWorldX * nextScale;
        const rawY = state.pinchCenterY - state.pinchWorldY * nextScale;

        setView(() => {
          const nextOffset = clampOffset(canvasSize.width, canvasSize.height, nextScale, rawX, rawY);
          return {
            scale: nextScale,
            x: nextOffset.x,
            y: nextOffset.y,
          };
        });
        return;
      }

      if (event.touches.length === 1 && (state.mode === "tap" || state.mode === "pan")) {
        const touch = event.touches[0];
        const deltaFromStart = Math.hypot(
          touch.clientX - state.startClientX,
          touch.clientY - state.startClientY
        );

        if (state.mode === "tap" && deltaFromStart > 6) {
          state.mode = "pan";
          state.moved = true;
        }

        if (state.mode !== "pan") {
          return;
        }

        event.preventDefault();
        const deltaX = touch.clientX - state.lastClientX;
        const deltaY = touch.clientY - state.lastClientY;
        state.lastClientX = touch.clientX;
        state.lastClientY = touch.clientY;

        setView((current) => {
          if (current.scale <= 1) {
            return current;
          }
          const nextOffset = clampOffset(
            canvasSize.width,
            canvasSize.height,
            current.scale,
            current.x + deltaX,
            current.y + deltaY
          );
          if (nextOffset.x === current.x && nextOffset.y === current.y) {
            return current;
          }
          return { ...current, x: nextOffset.x, y: nextOffset.y };
        });
      }
    }

    function onTouchEnd(event: TouchEvent) {
      const state = touchStateRef.current;

      if (state.mode === "tap" && !state.moved && Date.now() - state.startTs < 350) {
        const now = Date.now();
        const sinceLastTap = now - state.lastTapTs;
        const tapDistance = Math.hypot(
          state.startClientX - state.lastTapX,
          state.startClientY - state.lastTapY
        );

        if (state.lastTapTs > 0 && sinceLastTap < 320 && tapDistance < 32) {
          const consumed = handleCanvasDoubleTap(state.startClientX, state.startClientY);
          state.lastTapTs = 0;
          state.lastTapX = 0;
          state.lastTapY = 0;
          if (consumed) {
            // The canvas already has `touch-action: none`, which suppresses
            // the browser's default double-tap-zoom, so we don't need to
            // call preventDefault here (the touchend listener is passive).
            if (event.touches.length === 0) {
              state.mode = "idle";
              state.moved = false;
            }
            return;
          }
        } else {
          state.lastTapTs = now;
          state.lastTapX = state.startClientX;
          state.lastTapY = state.startClientY;
        }

        handleCanvasTap(state.startClientX, state.startClientY);
      }

      if (event.touches.length === 0) {
        state.mode = "idle";
        state.moved = false;
        return;
      }

      if (event.touches.length === 1 && state.mode === "pinch") {
        const touch = event.touches[0];
        state.mode = "pan";
        state.moved = true;
        state.startClientX = touch.clientX;
        state.startClientY = touch.clientY;
        state.lastClientX = touch.clientX;
        state.lastClientY = touch.clientY;
      }
    }

    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd, { passive: true });
    canvas.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
      canvas.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [canvasSize.height, canvasSize.width, handleCanvasDoubleTap, handleCanvasTap, maxZoom]);

  const onDoubleClick = useCallback(
    (event: ReactMouseEvent<HTMLCanvasElement>) => {
      if (isMobile) {
        return;
      }

      clearBoardClickTimer();

      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      const bounds = canvas.getBoundingClientRect();
      const world = toWorldPoint(event.clientX - bounds.left, event.clientY - bounds.top);

      const boardTitle = pickBoardTitle(world.x, world.y);
      if (boardTitle) {
        toggleBoardFilter(boardTitle.name);
        return;
      }

      const subBoardTitle = pickSubBoardTitle(world.x, world.y);
      if (subBoardTitle) {
        toggleBoardFilter(subBoardTitle.boardName);
        return;
      }

      const stock = pickStock(world.x, world.y);
      if (!stock) {
        return;
      }

      window.open(`https://xueqiu.com/S/${toXueqiuSymbol(stock.code)}`, "_blank", "noopener,noreferrer");
    },
    [clearBoardClickTimer, isMobile, pickBoardTitle, pickStock, pickSubBoardTitle, toWorldPoint, toggleBoardFilter]
  );

  const onCanvasClick = useCallback(
    (event: ReactMouseEvent<HTMLCanvasElement>) => {
      if (isMobile || dragStateRef.current.moved) {
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      const bounds = canvas.getBoundingClientRect();
      const world = toWorldPoint(event.clientX - bounds.left, event.clientY - bounds.top);

      const boardTitle = pickBoardTitle(world.x, world.y);
      const subBoardTitle = boardTitle ? null : pickSubBoardTitle(world.x, world.y);
      if (!boardTitle && !subBoardTitle) {
        return;
      }

      clearBoardClickTimer();
      boardClickTimerRef.current = setTimeout(() => {
        boardClickTimerRef.current = null;
        if (boardTitle) {
          toggleBoardFilter(boardTitle.name);
          return;
        }

        if (subBoardTitle) {
          toggleBoardFilter(subBoardTitle.boardName);
        }
      }, 220);
    },
    [clearBoardClickTimer, isMobile, pickBoardTitle, pickSubBoardTitle, toWorldPoint, toggleBoardFilter]
  );

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((current) => !current);
  }, []);

  useEffect(() => {
    if (!isFullscreen) {
      return;
    }

    toast(isMobile ? messages.fullscreenToastMobile : messages.fullscreenToast, {
      id: "heatmap-fullscreen-hint",
      duration: 3200,
    });
  }, [isFullscreen, isMobile, messages.fullscreenToast, messages.fullscreenToastMobile]);

  const resetView = useCallback(() => {
    setView({ scale: 1, x: 0, y: 0 });
  }, []);

  const createSharePreview = useCallback(async () => {
    const sourceCanvas = canvasRef.current;
    if (!sourceCanvas) {
      return;
    }

    setSharePending(true);

    try {
      const pixelRatio = sourceCanvas.width / Math.max(1, canvasSize.width);
      const baseWidth = Math.max(1, canvasSize.width);
      const cssFontPx = clamp(baseWidth * 0.0085, 9, 11);
      const cssHorizontalPadding = clamp(baseWidth * 0.008, 6, 12);
      const cssBandPadding = cssFontPx * 1.55 + 2;
      const horizontalPadding = cssHorizontalPadding * pixelRatio;
      const topPadding = cssBandPadding * pixelRatio;
      const bottomPadding = cssBandPadding * pixelRatio;
      const fontPx = cssFontPx * pixelRatio;
      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = Math.round(sourceCanvas.width + horizontalPadding * 2);
      exportCanvas.height = Math.round(sourceCanvas.height + topPadding + bottomPadding);

      const context = exportCanvas.getContext("2d");
      if (!context) {
        throw new Error("Preview context unavailable");
      }

      const background = context.createLinearGradient(0, 0, exportCanvas.width, exportCanvas.height);
      background.addColorStop(0, isLightMode ? heatmapCanvasThemes.light.backgroundStart : "#151922");
      background.addColorStop(1, isLightMode ? heatmapCanvasThemes.light.backgroundEnd : "#0f1319");
      context.fillStyle = background;
      context.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
      context.drawImage(sourceCanvas, horizontalPadding, topPadding);

      let domainStartX = horizontalPadding;
      try {
        const logoRaster = await loadShareLogoRaster();
        const logoSize = Math.min(
          Math.max(fontPx * 1.55, topPadding * 0.32),
          topPadding * 0.68
        );
        const logoY = (topPadding - logoSize) / 2;
        drawShareLogoRaster(context, logoRaster, horizontalPadding, logoY, logoSize, logoSize);
        domainStartX = horizontalPadding + logoSize + fontPx * 0.65;
      } catch {
        /* optional: share without logo if asset fails */
      }

      const shareTitle =
        baseWidth < 520
          ? `${messages.title} ${getCompactPeriodLabel(period, "zh")} ${formatShareTimestamp(updatedAt)}`
          : `${messages.title}｜${getPeriodLabel(messages, period)} ${formatShareTimestamp(updatedAt)}`;
      const shareUrlLight = isLightMode ? "rgba(15, 23, 42, 0.96)" : "rgba(247, 250, 252, 0.98)";
      const shareUrlParts: { text: string; fillStyle: string }[] = [
        { text: "map.wenyuanw", fillStyle: shareUrlLight },
        { text: ".me", fillStyle: "#22c55e" },
      ];

      const headerY = topPadding / 2;
      const footerY = exportCanvas.height - bottomPadding / 2;
      const rightEdge = exportCanvas.width - horizontalPadding;

      context.save();
      context.textBaseline = "middle";
      context.shadowColor = isLightMode ? "rgba(255, 255, 255, 0.52)" : "rgba(0, 0, 0, 0.28)";
      context.shadowBlur = Math.max(4, fontPx * 0.5);
      context.font = `600 ${fontPx}px Arial, sans-serif`;
      context.textAlign = "left";

      let urlX = domainStartX;
      for (const part of shareUrlParts) {
        context.fillStyle = part.fillStyle;
        context.fillText(part.text, urlX, headerY);
        urlX += context.measureText(part.text).width;
      }

      context.textAlign = "right";
      context.fillStyle = isLightMode ? "rgba(15, 23, 42, 0.92)" : "rgba(247, 250, 252, 0.96)";
      context.font = `600 ${fontPx}px Arial, sans-serif`;
      context.fillText(shareTitle, rightEdge, footerY);
      context.restore();

      const blob = await canvasToBlob(exportCanvas);
      const url = URL.createObjectURL(blob);
      const stamp = updatedAt ? updatedAt.replace(/[:T]/g, "-").slice(0, 19) : Date.now().toString();
      const filename = `ashare-heatmap-${market}-${period}-${stamp}.png`;

      setSharePreview((current) => {
        if (current) {
          URL.revokeObjectURL(current.url);
        }

        return { url, filename, blob };
      });
    } catch {
      toast.error(messages.shareFailed, {
        id: "heatmap-share-generate",
        duration: 3200,
      });
    } finally {
      setSharePending(false);
    }
  }, [canvasSize.width, isLightMode, market, messages, period, updatedAt]);

  useHeatmapWebMcp({
    enabled: preferencesReady,
    market,
    period,
    boardFilter,
    trendFilter:
      trendFilter === risingOnlyValue ? "rising" : trendFilter === fallingOnlyValue ? "falling" : "all",
    changeRangeFilter,
    sizeMode,
    thumbnailMode,
    headerTrendStats,
    refreshIntervalSeconds,
    heatThemeId,
    customHeatThemes,
    watchlist,
    treemapData,
    visibleTreemapData,
    quotes,
    marketSummaries,
    dataSource,
    updatedAt,
    loading,
    error,
    view,
    selectedStockCode,
    selectedBoardName,
    selectedSubBoardName,
    onHeatThemeIdChange: setHeatThemeId,
    onCustomHeatThemesChange: setCustomHeatThemes,
    onMarketChange: setMarket,
    onPeriodChange: setPeriod,
    onBoardFilterChange: setBoardFilter,
    onTrendFilterChange: (filter) => {
      setTrendFilter(filter === "rising" ? risingOnlyValue : filter === "falling" ? fallingOnlyValue : allTrendsValue);
    },
    onChangeRangeFilterChange: applyChangeRange,
    onSizeModeChange: setSizeMode,
    onThumbnailModeChange: setThumbnailMode,
    onViewChange: setView,
    onSelectStock: setSelectedStockCode,
    onSelectBoard: setSelectedBoardName,
    onSelectSubBoard: setSelectedSubBoardName,
    onRetryDataLoad: retryDataLoad,
    onResetView: resetView,
    onCreateSharePreview: createSharePreview,
    onAddWatchlistItem: addWatchlistItem,
    onRemoveWatchlistItem: removeWatchlistItem,
    onClearWatchlist: clearWatchlist,
  });

  const downloadSharePreview = useCallback(() => {
    if (!sharePreview) {
      return;
    }

    const anchor = document.createElement("a");
    anchor.href = sharePreview.url;
    anchor.download = sharePreview.filename;
    anchor.click();
  }, [sharePreview]);

  const copySharePreview = useCallback(async () => {
    if (!sharePreview) {
      return;
    }

    try {
      if (!("clipboard" in navigator) || typeof ClipboardItem === "undefined") {
        throw new Error("Clipboard image copy is not supported");
      }

      await navigator.clipboard.write([
        new ClipboardItem({
          [sharePreview.blob.type]: sharePreview.blob,
        }),
      ]);
      toast.success(messages.copySuccess, {
        id: "heatmap-share-preview-copy",
        duration: 3200,
      });
    } catch {
      toast.error(messages.copyFailed, {
        id: "heatmap-share-preview-copy",
        duration: 3200,
      });
    }
  }, [messages.copyFailed, messages.copySuccess, sharePreview]);

  const [canShareSystem, setCanShareSystem] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
      setCanShareSystem(false);
      return;
    }

    if (!sharePreview) {
      setCanShareSystem(true);
      return;
    }

    try {
      const file = new File([sharePreview.blob], sharePreview.filename, {
        type: sharePreview.blob.type || "image/png",
      });
      const supportsFile =
        typeof navigator.canShare === "function" ? navigator.canShare({ files: [file] }) : true;
      setCanShareSystem(Boolean(supportsFile));
    } catch {
      setCanShareSystem(false);
    }
  }, [sharePreview]);

  const shareSystemPreview = useCallback(async () => {
    if (!sharePreview) {
      return;
    }

    if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
      toast.error(messages.shareUnsupported, {
        id: "heatmap-share-system",
        duration: 3200,
      });
      return;
    }

    try {
      const file = new File([sharePreview.blob], sharePreview.filename, {
        type: sharePreview.blob.type || "image/png",
      });
      const payload: ShareData = {
        title: messages.shareDialogTitle,
        text: messages.shareDialogText,
        url: window.location.href,
      };

      if (
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] })
      ) {
        payload.files = [file];
      }

      await navigator.share(payload);
      toast.success(messages.shareSuccess, {
        id: "heatmap-share-system",
        duration: 3200,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        toast(messages.shareCancelled, {
          id: "heatmap-share-cancelled",
          duration: 2200,
        });
        return;
      }
      toast.error(messages.shareUnsupported, {
        id: "heatmap-share-system",
        duration: 3200,
      });
    }
  }, [
    messages.shareCancelled,
    messages.shareDialogText,
    messages.shareDialogTitle,
    messages.shareSuccess,
    messages.shareUnsupported,
    sharePreview,
  ]);

  const closeSharePreview = useCallback(() => {
    setSharePreview((current) => {
      if (current) {
        URL.revokeObjectURL(current.url);
      }
      return null;
    });
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName;
      const typingInField =
        target?.isContentEditable ||
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        tagName === "SELECT";

      if (event.key === "Escape") {
        if (shortcutRecording) {
          return;
        }
        if (sharePreview) {
          event.preventDefault();
          closeSharePreview();
          return;
        }
        if (settingsOpen) {
          event.preventDefault();
          setSettingsOpen(false);
          return;
        }
        if (filtersOpen) {
          event.preventDefault();
          setFiltersOpen(false);
          return;
        }
        if (isFullscreen && !typingInField) {
          event.preventDefault();
          setIsFullscreen(false);
        }
        return;
      }

      if (typingInField) {
        return;
      }

      if (shortcutRecording) {
        return;
      }

      const action = resolveShortcutAction(shortcutBindings, event);
      if (!action) {
        return;
      }

      if (sharePreview) {
        return;
      }

      if (settingsOpen && action !== "settings") {
        return;
      }

      if (action === "share" && sharePending) {
        return;
      }

      event.preventDefault();

      switch (action) {
        case "share":
          void createSharePreview();
          break;
        case "resetView":
          resetView();
          break;
        case "fullscreen":
          toggleFullscreen();
          break;
        case "settings":
          setFiltersOpen(false);
          setSettingsOpen((current) => !current);
          break;
        case "filters":
          toggleFilters();
          break;
        case "toggleWatchlist":
          if (!isMobile && activeStock) {
            toggleWatchlistItem(activeStock);
          }
          break;
        case "sidebar":
          if (isMobile) {
            setSidebarOpen((current) => !current);
          } else {
            setDesktopSidebarCollapsed((current) => !current);
          }
          break;
        case "displayMode":
          setDisplayMode((current) => (current === "dark" ? "light" : "dark"));
          break;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [
    activeStock,
    closeSharePreview,
    createSharePreview,
    filtersOpen,
    isFullscreen,
    isMobile,
    resetView,
    settingsOpen,
    sharePending,
    sharePreview,
    shortcutBindings,
    shortcutRecording,
    toggleFilters,
    toggleFullscreen,
    toggleWatchlistItem,
  ]);

  const lastUpdatedText =
    // A freshly-loaded archival snapshot has a fixed old timestamp; label it clearly so
    // the clock never misreads as stale data once live quotes have streamed in.
    dataSource === "fallback"
      ? messages.sampleDataLabel
      : updatedAt
        ? new Date(updatedAt).toLocaleTimeString()
        : "--:--:--";
  const watchlistChangePct =
    isWatchlist && treemapData && treemapData.stockCount > 0 ? treemapData.summary.indexChangePct : undefined;

  return (
    <div
      className={cn(
        "relative min-h-0 bg-background",
        isFullscreen ? "fixed inset-0 z-[9999]" : "flex min-h-0 flex-1 flex-col"
      )}
      style={brandStyle}
    >
      <div
        className={cn(
          "grid min-h-0",
          isFullscreen ? "h-full" : "min-h-0 flex-1",
          isFullscreen
            ? "grid-cols-[1fr]"
            : "grid-cols-[1fr] grid-rows-[minmax(0,1fr)_auto] md:grid-cols-[auto_minmax(0,1fr)]"
        )}
      >
        {!isFullscreen && sidebarOpen && (
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label={messages.collapseSidebar}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          />
        )}

        {!isFullscreen && (
          <aside
            className={cn(
              "row-start-1 min-h-0 min-w-0 border-r border-border bg-card/95 text-card-foreground",
              "fixed inset-y-0 left-0 z-50 w-[280px] transform shadow-2xl transition-transform duration-300 ease-out",
              sidebarOpen ? "translate-x-0" : "-translate-x-full",
              "md:static md:z-auto md:row-span-2 md:translate-x-0 md:overflow-hidden md:shadow-none",
              "md:transition-[width,opacity,border-color] md:duration-[320ms] md:ease-[cubic-bezier(0.22,1,0.36,1)]",
              desktopSidebarCollapsed
                ? "md:pointer-events-none md:w-0 md:border-transparent md:opacity-0"
                : "md:w-[148px] md:opacity-100 lg:w-[162px]"
            )}
            aria-hidden={(!sidebarOpen && isMobile) || (!isMobile && desktopSidebarCollapsed)}
          >
            <div
              className={cn(
                "flex h-full min-h-0 w-full flex-col",
                "md:w-[148px] lg:w-[162px]",
                desktopSidebarCollapsed && "md:pointer-events-none"
              )}
            >
              <div className={cn("flex items-center justify-between gap-2 border-b border-border px-2 py-1.5 sm:px-2.5", isEnglish && "py-1")}>
                <div className="flex min-w-0 items-center gap-2">
                  <img
                    src="/icon.svg"
                    alt=""
                    className="size-7 shrink-0"
                    decoding="async"
                  />
                  <h2
                    className={cn(
                      "min-w-0 truncate whitespace-nowrap font-semibold leading-tight tracking-[0.01em]",
                      isEnglish ? "text-[12px] sm:text-[13px]" : "text-[13px] sm:text-sm"
                    )}
                  >
                    {messages.title}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  aria-label={messages.collapseSidebar}
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-background/70 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
                >
                  <X className="size-4" />
                </button>
              </div>

            <div
              className={cn(
                "flex-1 overflow-y-auto overflow-x-hidden px-1.5 py-1.5 sm:px-2 sm:py-1.5",
                isEnglish && "px-1.5 py-1 sm:px-1.5"
              )}
            >
              <div className={cn("mb-1.5 flex items-center justify-between border border-border bg-muted/18 px-1.5 py-1 text-muted-foreground", isEnglish && "mb-1 px-1.5 py-1")}>
                <span className={cn("font-semibold uppercase tracking-[0.12em]", isEnglish ? "text-[8.5px]" : "text-[9px]")}>
                  {messages.lastUpdated}
                </span>
                <span className={cn("inline-flex items-center gap-1 font-semibold tabular-nums text-foreground", isEnglish ? "text-[9px]" : "text-[10px]")}>
                  {loading ? (
                    <>
                      <Loader2 className="size-2.5 animate-spin text-brand" aria-hidden />
                      {messages.updating}
                    </>
                  ) : (
                    lastUpdatedText
                  )}
                </span>
              </div>
              <div className={cn("space-y-1", isEnglish && "space-y-0.5")}>
                {marketOptions.map((option) => {
                  const summary = marketSummaries[option];
                  const isActive = market === option;

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setMarket(option);
                        if (isMobile) {
                          setSidebarOpen(false);
                        }
                      }}
                      className={cn(
                        "flex w-full min-w-0 items-center justify-between border px-1.5 py-1.5 text-left transition-colors",
                        isEnglish && "px-1.5 py-1",
                        isActive
                          ? "border-brand/55 bg-brand/12 text-foreground"
                          : "border-border bg-background hover:bg-muted"
                      )}
                    >
                      <span
                        className={cn(
                          "min-w-0 pr-2 leading-tight",
                          isEnglish ? "text-[10.5px]" : "text-[12px]"
                        )}
                      >
                        {getCompactMarketLabel(messages, option, locale)}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 font-semibold tabular-nums",
                          isEnglish ? "text-[10.5px]" : "text-[12px]"
                        )}
                        style={{
                          color: getChangeTextColor(
                            activeHeatTheme,
                            summary?.changePct ?? 0,
                            priceColorMode,
                            displayMode
                          ),
                        }}
                      >
                        {summary ? formatCompactChange(summary.changePct) : "--"}
                      </span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    if (watchlist.length === 0) {
                      openWatchlistSettings();
                      if (isMobile) {
                        setSidebarOpen(false);
                      }
                      return;
                    }
                    setMarket(watchlistUniverseKey);
                    if (isMobile) {
                      setSidebarOpen(false);
                    }
                  }}
                  className={cn(
                    "flex w-full min-w-0 items-center justify-between border px-1.5 py-1.5 text-left transition-colors",
                    isEnglish && "px-1.5 py-1",
                    isWatchlist
                      ? "border-brand/55 bg-brand/12 text-foreground"
                      : "border-border bg-background hover:bg-muted"
                  )}
                >
                  <span
                    className={cn(
                      "min-w-0 pr-2 leading-tight",
                      isEnglish ? "text-[10.5px]" : "text-[12px]"
                    )}
                  >
                    {getCompactMarketLabel(messages, watchlistUniverseKey, locale)}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 font-semibold tabular-nums",
                      isEnglish ? "text-[10.5px]" : "text-[12px]"
                    )}
                    style={{
                      color: getChangeTextColor(
                        activeHeatTheme,
                        watchlistChangePct ?? 0,
                        priceColorMode,
                        displayMode
                      ),
                    }}
                  >
                    {typeof watchlistChangePct === "number" && Number.isFinite(watchlistChangePct)
                      ? formatCompactChange(watchlistChangePct)
                      : watchlist.length > 0
                        ? String(watchlist.length)
                        : "--"}
                  </span>
                </button>
              </div>

              <button
                type="button"
                ref={sidebarFilterTriggerRef}
                onClick={toggleFilters}
                onMouseEnter={handleFilterHoverEnter}
                onMouseLeave={handleFilterHoverLeave}
                data-heatmap-filter-trigger
                title={withShortcutTitle(messages.filtersOpen, shortcutBindings.filters)}
                className={cn(
                  "mt-1.5 flex w-full min-w-0 flex-col items-stretch gap-0.5 border px-1.5 py-1.5 text-left transition-colors",
                  isEnglish && "mt-1 px-1.5 py-1",
                  activeFilterCount > 0
                    ? "border-brand/55 bg-brand/12 text-foreground"
                    : "border-border bg-muted/18 text-foreground hover:bg-muted"
                )}
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <ListFilter className="size-3.5 shrink-0" />
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate font-semibold",
                      isEnglish ? "text-[10.5px]" : "text-[12px]"
                    )}
                  >
                    {messages.filtersTitle}
                  </span>
                  {activeFilterCount > 0 ? (
                    <span className="inline-flex h-4 min-w-4 items-center justify-center bg-brand px-1 text-[10px] font-semibold tabular-nums text-brand-foreground">
                      {activeFilterCount}
                    </span>
                  ) : (
                    <span className="font-mono text-[10px] font-semibold text-muted-foreground">
                      {formatShortcutLabel(shortcutBindings.filters)}
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    "truncate text-muted-foreground",
                    isEnglish ? "text-[9px]" : "text-[10px]"
                  )}
                >
                  {activeFilterSummary || messages.filtersIdleHint}
                </span>
              </button>

              {marketOverview && (
                <div className={cn("mt-1.5 border border-border bg-muted/28 p-1.5", isEnglish && "mt-1 p-[5px]")}>
                  <div className={cn("grid grid-cols-3 gap-2", isEnglish && "gap-1.5")}>
                    <div className="flex min-w-0 flex-col items-center text-center">
                      <p
                        className={cn("tracking-[0.06em]", isEnglish ? "text-[10px]" : "text-[11px]")}
                        style={{ color: riseTextColor }}
                      >
                        {messages.legendRise}
                      </p>
                      <p
                        className={cn("mt-1 font-semibold tabular-nums", isEnglish ? "text-[13px]" : "text-base")}
                        style={{ color: riseTextColor }}
                      >
                        {formatCount(marketOverview.advanceCount, locale)}
                      </p>
                    </div>
                    <div className="flex min-w-0 flex-col items-center text-center">
                      <p
                        className={cn(
                          "tracking-[0.06em] text-muted-foreground",
                          isEnglish ? "text-[10px]" : "text-[11px]"
                        )}
                      >
                        {messages.legendFlat}
                      </p>
                      <p className={cn("mt-1 font-semibold tabular-nums text-foreground", isEnglish ? "text-[13px]" : "text-base")}>
                        {formatCount(marketOverview.flatCount, locale)}
                      </p>
                    </div>
                    <div className="flex min-w-0 flex-col items-center text-center">
                      <p
                        className={cn("tracking-[0.06em]", isEnglish ? "text-[10px]" : "text-[11px]")}
                        style={{ color: fallTextColor }}
                      >
                        {messages.legendFall}
                      </p>
                      <p
                        className={cn("mt-1 font-semibold tabular-nums", isEnglish ? "text-[13px]" : "text-base")}
                        style={{ color: fallTextColor }}
                      >
                        {formatCount(marketOverview.declineCount, locale)}
                      </p>
                    </div>
                  </div>

                  <div className={cn("mt-2 grid grid-cols-2 items-stretch gap-1.5 border-t border-border/70 pt-2", isEnglish && "mt-1.5 gap-1 pt-1.5")}>
                    <div className="flex min-w-0 flex-col">
                      <p
                        className={cn(
                          "leading-tight tracking-[0.04em] text-muted-foreground",
                          isEnglish ? "text-[9px]" : "text-[10px]"
                        )}
                      >
                        {messages.turnoverLabel}
                      </p>
                      <p
                        className={cn(
                          "mt-auto whitespace-nowrap pt-1 font-semibold tracking-[-0.01em] text-foreground",
                          isEnglish ? "text-[11.5px] sm:text-[12px]" : "text-[13px] sm:text-[14px]"
                        )}
                      >
                        {formatTurnoverAmount(marketOverview.turnoverAmount, locale)}
                      </p>
                    </div>
                    <div className="flex min-w-0 flex-col">
                      {(() => {
                        const turnoverTrend = getTurnoverTrend(marketOverview.turnoverDelta);
                        const turnoverTrendLabel =
                          turnoverTrend === "up"
                            ? messages.turnoverIncreaseLabel
                            : turnoverTrend === "down"
                              ? messages.turnoverDecreaseLabel
                              : messages.turnoverFlatLabel;
                        const turnoverTrendColor =
                          turnoverTrend === "up"
                            ? riseTextColor
                            : turnoverTrend === "down"
                              ? fallTextColor
                              : undefined;

                        return (
                          <>
                            {isEnglish ? (
                              <div className="space-y-0.5 text-[9px] leading-tight tracking-[0.04em] text-muted-foreground">
                                <span className="block">{messages.comparedToYesterdayLabel}</span>
                                <span
                                  className={cn(
                                    "block font-semibold",
                                    !turnoverTrendColor && "text-muted-foreground"
                                  )}
                                  style={turnoverTrendColor ? { color: turnoverTrendColor } : undefined}
                                >
                                  {turnoverTrendLabel}
                                </span>
                              </div>
                            ) : (
                              <p className="text-[10px] leading-tight tracking-[0.04em] text-muted-foreground">
                                {messages.comparedToYesterdayLabel}
                                <span
                                  className={cn(
                                    "ml-1 font-semibold",
                                    !turnoverTrendColor && "text-muted-foreground"
                                  )}
                                  style={turnoverTrendColor ? { color: turnoverTrendColor } : undefined}
                                >
                                  {turnoverTrendLabel}
                                </span>
                              </p>
                            )}
                            <p
                              className={cn(
                                "mt-auto whitespace-nowrap pt-1 font-semibold tracking-[-0.01em]",
                                isEnglish ? "text-[11.5px] sm:text-[12px]" : "text-[13px] sm:text-[14px]",
                                !turnoverTrendColor && "text-muted-foreground"
                              )}
                              style={turnoverTrendColor ? { color: turnoverTrendColor } : undefined}
                            >
                              {formatTurnoverAmount(Math.abs(marketOverview.turnoverDelta), locale)}
                            </p>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {treemapData?.source === "fallback" && (
                    <p
                      className={cn(
                        "mt-2.5 text-muted-foreground",
                        isEnglish ? "text-[10px] leading-[1.35]" : "text-[11px] leading-5"
                      )}
                    >
                      {messages.fallbackDataLabel}
                    </p>
                  )}
                </div>
              )}

            </div>

            <div className={cn("grid grid-cols-1 gap-1.5 border-t border-border p-1.5", isEnglish && "gap-1 p-[5px]")}>
              <Button
                variant="outline"
                size={isEnglish ? "xs" : "sm"}
                className={cn(
                  "justify-start rounded-none border-border bg-background/80 text-foreground hover:bg-muted",
                  isEnglish && "min-w-0 px-2 text-[10.5px]"
                )}
                onClick={createSharePreview}
                disabled={sharePending}
                title={withShortcutTitle(messages.shareImage, shortcutBindings.share)}
              >
                <Camera className={cn(isEnglish ? "mr-1.5 size-3.5" : "mr-2 size-4")} />
                {sharePending ? messages.generatingShareImage : messages.shareImage}
              </Button>
              <Button
                variant="outline"
                size={isEnglish ? "xs" : "sm"}
                className={cn(
                  "justify-start rounded-none border-border bg-background/80 text-foreground hover:bg-muted",
                  isEnglish && "min-w-0 px-2 text-[10.5px]"
                )}
                onClick={resetView}
                title={withShortcutTitle(messages.resetView, shortcutBindings.resetView)}
              >
                <RotateCcw className={cn(isEnglish ? "mr-1.5 size-3.5" : "mr-2 size-4")} />
                {messages.resetView}
              </Button>
              <Button
                variant="outline"
                size={isEnglish ? "xs" : "sm"}
                className={cn(
                  "justify-start rounded-none border-border bg-background/80 text-foreground hover:bg-muted",
                  isEnglish && "min-w-0 px-2 text-[10.5px]"
                )}
                onClick={toggleFullscreen}
                title={withShortcutTitle(messages.enterFullscreen, shortcutBindings.fullscreen)}
              >
                <Maximize2 className={cn(isEnglish ? "mr-1.5 size-3.5" : "mr-2 size-4")} />
                {messages.enterFullscreen}
              </Button>
              <Button
                variant="outline"
                size={isEnglish ? "xs" : "sm"}
                className={cn(
                  "justify-start rounded-none border-border bg-background/80 text-foreground hover:bg-muted",
                  isEnglish && "min-w-0 px-2 text-[10.5px]",
                  settingsOpen && settingsTab === "watchlist" && "border-brand/55 bg-brand/12"
                )}
                onClick={() => {
                  openWatchlistSettings();
                  if (isMobile) {
                    setSidebarOpen(false);
                  }
                }}
                title={messages.watchlistManage}
              >
                <Pencil className={cn(isEnglish ? "mr-1.5 size-3.5" : "mr-2 size-4")} />
                {messages.watchlistManage}
              </Button>
              <Button
                variant="outline"
                size={isEnglish ? "xs" : "sm"}
                className={cn(
                  "justify-start rounded-none border-border bg-background/80 text-foreground hover:bg-muted",
                  isEnglish && "min-w-0 px-2 text-[10.5px]"
                )}
                onClick={() => {
                  setFiltersOpen(false);
                  setSettingsOpen(true);
                }}
                title={withShortcutTitle(messages.settingsTitle, shortcutBindings.settings)}
              >
                <Settings2 className={cn(isEnglish ? "mr-1.5 size-3.5" : "mr-2 size-4")} />
                {messages.settingsTitle}
              </Button>
              <button
                type="button"
                onClick={() => setDesktopSidebarCollapsed(true)}
                aria-label={messages.collapseSidebar}
                title={withShortcutTitle(messages.collapseSidebar, shortcutBindings.sidebar)}
                className="hidden h-8 items-center justify-center border border-border bg-background/80 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:inline-flex"
              >
                <ChevronLeft className="size-4" />
              </button>
            </div>
            </div>
          </aside>
        )}

        <div
          className={cn(
            "relative min-h-0 overflow-hidden",
            isFullscreen ? "col-start-1 h-full" : "col-start-1 row-start-1 md:col-start-2"
          )}
          style={{ backgroundColor: heatmapCanvasTheme.chrome }}
        >
          <div
            ref={viewportRef}
            className="relative h-full min-h-0 overflow-hidden"
            style={{ backgroundColor: heatmapCanvasTheme.chrome }}
          >
            {isFullscreen && isMobile && (
              <button
                type="button"
                onClick={toggleFullscreen}
                className="absolute right-3 top-3 z-50 inline-flex size-10 items-center justify-center rounded-full border border-slate-500/70 bg-black/50 text-white shadow-[0_10px_24px_rgba(0,0,0,0.28)] backdrop-blur-sm transition-colors hover:bg-black/70"
                aria-label={messages.exitFullscreen}
              >
                <Minimize2 className="size-4" />
              </button>
            )}

            <canvas
              ref={canvasRef}
              role="img"
              aria-label={messages.canvasLabel}
              className="h-full w-full touch-none"
              style={{
                cursor: isPanning
                  ? "grabbing"
                  : view.scale > 1
                    ? "grab"
                    : (activeStock || hoveredBoardTitleName || (thumbnailMode && hoveredSubBoardName)) && !isMobile
                      ? "pointer"
                      : "default",
              }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseLeave}
              onClick={onCanvasClick}
              onDoubleClick={onDoubleClick}
            />

            {inspectorStyle && (
              <aside
                className={cn(
                  "pointer-events-none absolute z-30 overflow-hidden rounded-none border shadow-[0_22px_72px_rgba(0,0,0,0.36)] backdrop-blur-sm",
                  isLightMode
                    ? "border-slate-300/80 bg-white/96 text-slate-900"
                    : "border-slate-700/80 bg-[#0f1319]/96 text-slate-100"
                )}
                style={{
                  left: inspectorStyle.left,
                  top: inspectorStyle.top,
                  width: inspectorStyle.width,
                  minWidth: inspectorStyle.width,
                  maxHeight: inspectorStyle.maxHeight,
                }}
              >
                {activeInspectorStock && (
                  <>
                    <div
                      className="flex items-center gap-2 border-b border-black/15 px-3 py-1.5"
                      style={{
                        backgroundColor: getBoardHeaderColor(
                          activeHeatTheme,
                          activeInspectorStock.changePct,
                          priceColorMode,
                          displayMode
                        ),
                      }}
                      title={activeInspectorTitle ?? undefined}
                    >
                      <p className="min-w-0 shrink truncate text-[14px] font-semibold leading-none text-white [word-break:keep-all]">
                        {activeInspectorStock.name}
                      </p>
                      <InspectorHeaderSparkline
                        code={activeInspectorStock.code}
                        changePct={activeInspectorStock.changePct}
                        priceColorMode={priceColorMode}
                        className="h-8 w-[108px] shrink-0"
                      />
                      <div className="ml-auto flex min-w-0 shrink-0 items-baseline gap-2.5 tabular-nums">
                        <span className="text-[13px] font-semibold leading-none text-white">
                          {formatPrice(activeInspectorStock.price)}
                        </span>
                        <span className="text-[12px] font-medium leading-none text-white/75">
                          {formatTurnoverAmount(activeInspectorStock.marketCap, locale)}
                        </span>
                        <span
                          className="text-[13px] font-semibold leading-none"
                          style={{
                            color: getChangeTextColor(
                              activeHeatTheme,
                              activeInspectorStock.changePct,
                              priceColorMode,
                              displayMode,
                              "soft"
                            ),
                          }}
                        >
                          {formatChange(activeInspectorStock.changePct)}
                        </span>
                      </div>
                    </div>

                    <div
                      className={cn(
                        "flex justify-center px-3 py-2",
                        isLightMode ? "border-b border-slate-200 bg-[#f4f6f7]" : "border-b border-white/10 bg-[#0c1015]"
                      )}
                    >
                      <img
                        src={getDailyKlineUrl(activeInspectorStock.code)}
                        alt={`${activeInspectorStock.name} K-line`}
                        className="h-auto w-[88%] bg-white object-contain shadow-[0_2px_10px_rgba(15,23,42,0.10)] ring-1 ring-black/5"
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    <div className={cn("text-slate-900", isLightMode ? "bg-[#f4f6f7]" : "bg-[#0c1015] text-slate-200")}>
                      <div className={cn("space-y-1 border-b px-3 py-1.5", isLightMode ? "border-slate-300/70" : "border-white/10")}>
                        <div className="flex items-center justify-between gap-2 text-[11px] font-medium tracking-[0.08em] text-slate-500">
                          <span className="min-w-0 truncate">{activeInspectorTitle ?? activeBoardName}</span>
                          {inspectorSectorStats ? (
                            <div className="flex shrink-0 items-baseline gap-2 tabular-nums">
                              <span className={cn("text-[11px] font-semibold", isLightMode ? "text-slate-600" : "text-slate-300")}>
                                {formatBoardTrendCounts(
                                  messages,
                                  inspectorSectorStats.advanceCount,
                                  inspectorSectorStats.declineCount
                                )}
                              </span>
                              <span
                                className="text-[12px] font-semibold"
                                style={{
                                  color: getChangeTextColor(
                                    activeHeatTheme,
                                    inspectorSectorStats.changePct,
                                    priceColorMode,
                                    displayMode,
                                    "strong"
                                  ),
                                }}
                              >
                                {formatChange(inspectorSectorStats.changePct)}
                              </span>
                            </div>
                          ) : (
                            <div className="flex shrink-0 items-center gap-2 text-right">
                              <span className="text-[10px] font-medium tracking-[0.03em] text-slate-400">
                                {messages.inspectorScrollHint}
                              </span>
                              <span>{inspectorStocks.length}</span>
                            </div>
                          )}
                        </div>
                        <InspectorSortControls
                          sortKey={inspectorSortKey}
                          messages={messages}
                          tone={isLightMode ? "light" : "dark"}
                          showShortcutHint
                          watchlistHint={`${formatShortcutLabel(
                            shortcutBindings.toggleWatchlist
                          )} ${messages.inspectorWatchlistHint}`}
                          onChange={setInspectorSortKey}
                        />
                      </div>
                      <div
                        ref={inspectorListRef}
                        className="overflow-y-auto"
                        style={{ maxHeight: Math.max(140, inspectorStyle.maxHeight - 320) }}
                      >
                        {inspectorStocks.map((stock) => {
                          const isActive = stock.active;
                          const isWatchlisted = watchlistCodeSet.has(stock.code);

                          return (
                            <div
                              key={stock.code}
                              className={cn(
                                "grid grid-cols-[minmax(0,1fr)_56px_64px_80px] items-center gap-2 border-b px-3 py-1.5 text-[12.5px]",
                                isLightMode ? "border-b-slate-300/70" : "border-b-white/10",
                                isActive
                                  ? cn(
                                      "sticky top-0 z-10 bg-white font-semibold shadow-[0_1px_0_rgba(15,23,42,0.08)]",
                                      !isLightMode && "bg-[#161b22] text-slate-100"
                                    )
                                  : isLightMode
                                    ? "bg-[#f4f6f7]"
                                    : "bg-[#0c1015]"
                              )}
                            >
                              <div className="flex min-w-0 items-center gap-1">
                                <span
                                  className={cn(
                                    "min-w-0 font-medium leading-[1.2] [word-break:keep-all]",
                                    isActive && isLightMode && "font-semibold text-slate-900",
                                    isActive && !isLightMode && "font-semibold text-slate-100"
                                  )}
                                >
                                  {stock.name}
                                </span>
                                {isWatchlisted && (
                                  <Star
                                    aria-hidden
                                    className={cn(
                                      "size-3 shrink-0",
                                      isLightMode ? "text-amber-500" : "text-amber-400"
                                    )}
                                    fill="currentColor"
                                  />
                                )}
                              </div>
                              <img
                                src={getSparklineUrl(stock.code)}
                                alt=""
                                className="h-5 w-full object-contain"
                                loading="lazy"
                                decoding="async"
                                referrerPolicy="no-referrer"
                              />
                              <span
                                className={cn(
                                  "text-right text-[11.5px] font-medium tabular-nums",
                                  isLightMode ? "text-slate-700" : "text-slate-300"
                                )}
                              >
                                {formatPrice(stock.price)}
                              </span>
                              <span
                                className="text-right text-[11.5px] font-medium tabular-nums"
                                style={{
                                  color: getChangeTextColor(
                                    activeHeatTheme,
                                    stock.changePct,
                                    priceColorMode,
                                    displayMode,
                                    "strong"
                                  ),
                                }}
                              >
                                {formatChange(stock.changePct)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </aside>
            )}

            {loading && !samplePainted && <HeatmapLoadingOverlay displayMode={displayMode} messages={messages} />}

            {samplePainted && dataSource !== "direct" && !error && (
              <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium shadow-lg backdrop-blur-sm",
                    isLightMode
                      ? "border-slate-200 bg-white/85 text-slate-600"
                      : "border-slate-700/70 bg-[#0f1319]/80 text-slate-300"
                  )}
                >
                  <Loader2 className="size-3 animate-spin text-brand" aria-hidden />
                  {messages.loadingLiveData}
                </div>
              </div>
            )}

            {error && (
              <div
                className={cn(
                  "absolute inset-x-3 top-3 z-40 flex items-center justify-between gap-3 border px-3 py-2.5 text-sm shadow-lg backdrop-blur-md sm:left-4 sm:right-4 sm:top-4",
                  isLightMode
                    ? "border-amber-200 bg-white/94 text-slate-800"
                    : "border-amber-400/30 bg-[#17130d]/92 text-slate-100"
                )}
                role="alert"
              >
                <div className="min-w-0">
                  <p className="font-medium text-amber-700 dark:text-amber-300">{error}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{messages.refreshDataHint}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 border-border bg-background/80 text-foreground hover:bg-muted"
                  onClick={retryDataLoad}
                  disabled={loading}
                >
                  <RotateCcw className={cn("size-3.5", loading && "animate-spin")} aria-hidden />
                  {loading ? messages.updating : messages.refreshData}
                </Button>
              </div>
            )}

            {!loading && !error && isWatchlist && watchlist.length === 0 && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/78 px-4 backdrop-blur-sm">
                <div className="max-w-sm border border-border bg-card/95 px-5 py-6 text-center shadow-[0_18px_48px_rgba(0,0,0,0.18)]">
                  <Star className="mx-auto size-6 text-muted-foreground" />
                  <h3 className="mt-3 text-sm font-semibold text-foreground">{messages.watchlistEmptyTitle}</h3>
                  <p className="mt-1.5 text-[12px] leading-5 text-muted-foreground">{messages.watchlistEmptyHint}</p>
                  <button
                    type="button"
                    onClick={openWatchlistSettings}
                    className="mt-4 inline-flex h-8 items-center justify-center gap-1.5 border border-brand/55 bg-brand/14 px-3 text-[12px] font-semibold text-foreground transition-colors hover:bg-brand/22"
                  >
                    <Plus className="size-3.5" />
                    {messages.watchlistAdd}
                  </button>
                </div>
              </div>
            )}

            {!loading && !error && visibleTreemapData && visibleTreemapData.stockCount === 0 && !(isWatchlist && watchlist.length === 0) && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/70 px-4 text-center text-sm text-muted-foreground backdrop-blur-sm">
                {messages.changeRangeEmpty}
              </div>
            )}
          </div>
        </div>

        {!isFullscreen && (
          <div
            className={cn(
              "relative col-span-1 row-start-2 border-t border-border px-3 py-1.5 sm:px-4 md:col-start-2",
              isLightMode ? "bg-white/88 backdrop-blur-sm" : "bg-[#151a21]"
            )}
          >
            {(loading || dataSource === "fallback") && !error && (
              <div className="hm-bottom-loader inset-x-0 top-0 h-[2px]" aria-hidden />
            )}
            <div className="flex items-center gap-1.5 sm:gap-3">
              <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
                {(!sidebarOpen || desktopSidebarCollapsed) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (isMobile) {
                        setSidebarOpen(true);
                        return;
                      }
                      setDesktopSidebarCollapsed(false);
                    }}
                    aria-label={messages.expandSidebar}
                    title={withShortcutTitle(messages.expandSidebar, shortcutBindings.sidebar)}
                    className={cn(
                      "inline-flex size-7 items-center justify-center bg-transparent transition-colors hover:text-brand focus-visible:text-brand",
                      !desktopSidebarCollapsed && "md:hidden",
                      desktopSidebarCollapsed && "md:inline-flex",
                      isLightMode
                        ? "text-muted-foreground hover:bg-muted focus-visible:bg-muted"
                        : "text-slate-400 hover:bg-white/5 focus-visible:bg-white/5"
                    )}
                  >
                    {isMobile ? <Menu className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setDisplayMode((current) => (current === "dark" ? "light" : "dark"))}
                  aria-label={isLightMode ? messages.darkMode : messages.lightMode}
                  title={isLightMode ? messages.darkMode : messages.lightMode}
                  className={cn(
                    "inline-flex size-7 shrink-0 items-center justify-center bg-transparent transition-colors hover:text-brand focus-visible:text-brand md:hidden",
                    isLightMode
                      ? "text-muted-foreground hover:bg-muted focus-visible:bg-muted"
                      : "text-slate-400 hover:bg-white/5 focus-visible:bg-white/5"
                  )}
                >
                  {isLightMode ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
                </button>
                <a
                  href={githubProjectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={messages.githubProject}
                  title={messages.githubProject}
                  className={cn(
                    "hidden min-w-0 shrink-0 items-center gap-1.5 text-[11px] font-normal tracking-tight transition-colors sm:text-[12px] md:inline-flex",
                    isLightMode
                      ? "text-muted-foreground/60 hover:text-muted-foreground"
                      : "text-slate-500/75 hover:text-slate-400"
                  )}
                >
                  <GitHubMark className="size-3.5 shrink-0 opacity-80" />
                  <span className="min-w-0 truncate">map.wenyuanw.me</span>
                </a>
              </div>

              <div className="flex min-w-0 flex-1 justify-center overflow-hidden px-0.5 sm:px-2">
                <div className="flex items-center gap-1 md:hidden">
                  <button
                    type="button"
                    onClick={toggleFilters}
                    aria-label={messages.filtersOpen}
                    aria-pressed={filtersOpen}
                    title={messages.filtersOpen}
                    className={cn(
                      "inline-flex size-7 items-center justify-center bg-transparent transition-colors hover:text-brand focus-visible:text-brand",
                      filtersOpen || activeFilterCount > 0
                        ? "text-brand hover:bg-brand/12 focus-visible:bg-brand/12"
                        : isLightMode
                          ? "text-muted-foreground hover:bg-muted focus-visible:bg-muted"
                          : "text-slate-400 hover:bg-white/5 focus-visible:bg-white/5"
                    )}
                  >
                    <ListFilter className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={resetView}
                    aria-label={messages.resetView}
                    title={messages.resetView}
                    className={cn(
                      "inline-flex size-7 items-center justify-center bg-transparent transition-colors hover:text-brand focus-visible:text-brand",
                      isLightMode
                        ? "text-muted-foreground hover:bg-muted focus-visible:bg-muted"
                        : "text-slate-400 hover:bg-white/5 focus-visible:bg-white/5"
                    )}
                  >
                    <RotateCcw className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    aria-label={messages.enterFullscreen}
                    title={messages.enterFullscreen}
                    className={cn(
                      "inline-flex size-7 items-center justify-center bg-transparent transition-colors hover:text-brand focus-visible:text-brand",
                      isLightMode
                        ? "text-muted-foreground hover:bg-muted focus-visible:bg-muted"
                        : "text-slate-400 hover:bg-white/5 focus-visible:bg-white/5"
                    )}
                  >
                    <Maximize2 className="size-3.5" />
                  </button>
                </div>

                <div className="hidden w-full min-w-0 max-w-52 items-center gap-1 sm:gap-1.5 md:flex md:max-w-56">
                  <TrendingDown
                    className="size-2.5 shrink-0 sm:size-3"
                    style={{ color: fallTextColor }}
                    aria-label={messages.legendFall}
                  />
                  <div className="relative min-w-0 flex-1 overflow-hidden">
                    <div
                      className="h-2.5 w-full rounded-full shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] sm:h-3.5"
                      style={{ background: legendGradient }}
                    />
                    <div
                      className="pointer-events-none absolute inset-0 flex items-center justify-between px-0.5 text-[7px] font-semibold tabular-nums leading-none text-white sm:px-1 sm:text-[8px] md:text-[9px]"
                      style={{ textShadow: "0 1px 2px rgba(0, 0, 0, 0.55)" }}
                    >
                      {legendTicks.map((tick) => (
                        <span key={tick}>{tick === 0 ? "0" : formatCompactChange(tick)}</span>
                      ))}
                    </div>
                  </div>
                  <TrendingUp
                    className="size-2.5 shrink-0 sm:size-3"
                    style={{ color: riseTextColor }}
                    aria-label={messages.legendRise}
                  />
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
                <a
                  href={githubProjectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={messages.githubProject}
                  title={messages.githubProject}
                  className={cn(
                    "inline-flex size-7 items-center justify-center bg-transparent transition-colors hover:text-brand focus-visible:text-brand md:hidden",
                    isLightMode
                      ? "text-muted-foreground hover:bg-muted focus-visible:bg-muted"
                      : "text-slate-400 hover:bg-white/5 focus-visible:bg-white/5"
                  )}
                >
                  <GitHubMark className="size-3.5 opacity-80" />
                </a>

                <div className="group relative hidden shrink-0 md:block">
                  <button
                    type="button"
                    aria-label={messages.operationTipsTitle}
                    onClick={() => {
                      setFiltersOpen(false);
                      setSettingsTab("help");
                      setSettingsOpen(true);
                    }}
                    className={cn(
                      "inline-flex size-7 items-center justify-center bg-transparent transition-colors hover:text-brand focus-visible:text-brand",
                      isLightMode
                        ? "text-muted-foreground hover:bg-muted focus-visible:bg-muted"
                        : "text-slate-400 hover:bg-white/5 focus-visible:bg-white/5"
                    )}
                  >
                    <Info className="size-3.5" />
                  </button>
                  <div
                    className={cn(
                      "pointer-events-none absolute bottom-full right-0 z-40 mb-2 w-64 border p-2 text-[11px] leading-5 opacity-0 shadow-[0_18px_48px_rgba(0,0,0,0.35)] backdrop-blur-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100",
                      isLightMode
                        ? "border-border bg-white/96 text-popover-foreground shadow-[0_12px_36px_rgba(15,23,42,0.12)]"
                        : "border-slate-700/90 bg-[#0f1319]/96 text-slate-300"
                    )}
                  >
                    <p>{areaTipMessage.replace(/^·\s*/, "")}</p>
                    <p>{messages.tipColor.replace(/^·\s*/, "")}</p>
                    <p>{messages.tipThumbnail.replace(/^·\s*/, "")}</p>
                    <p>{(isMobile ? messages.tipTap : messages.tipDoubleClick).replace(/^·\s*/, "")}</p>
                    <p>{(isMobile ? messages.tipPinch : messages.tipZoom).replace(/^·\s*/, "")}</p>
                    <p>{messages.tipDrag.replace(/^·\s*/, "")}</p>
                    {!isMobile && (
                      <>
                        <p>{messages.tipInspectorScroll.replace(/^·\s*/, "")}</p>
                        <p>{messages.tipInspectorSort.replace(/^·\s*/, "")}</p>
                      </>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setDisplayMode((current) => (current === "dark" ? "light" : "dark"))}
                  aria-label={isLightMode ? messages.darkMode : messages.lightMode}
                  title={withShortcutTitle(
                    isLightMode ? messages.darkMode : messages.lightMode,
                    shortcutBindings.displayMode
                  )}
                  className={cn(
                    "hidden size-7 shrink-0 items-center justify-center bg-transparent transition-colors hover:text-brand focus-visible:text-brand md:inline-flex",
                    isLightMode
                      ? "text-muted-foreground hover:bg-muted focus-visible:bg-muted"
                      : "text-slate-400 hover:bg-white/5 focus-visible:bg-white/5"
                  )}
                >
                  {isLightMode ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={() => setThumbnailMode((current) => !current)}
                  aria-label={messages.thumbnailModeLabel}
                  aria-pressed={thumbnailMode}
                  title={messages.thumbnailModeLabel}
                  className={cn(
                    "hidden size-7 shrink-0 items-center justify-center bg-transparent transition-colors hover:text-brand focus-visible:text-brand md:inline-flex",
                    thumbnailMode
                      ? "text-brand hover:bg-brand/12 focus-visible:bg-brand/12"
                      : isLightMode
                        ? "text-muted-foreground hover:bg-muted focus-visible:bg-muted"
                        : "text-slate-400 hover:bg-white/5 focus-visible:bg-white/5"
                  )}
                >
                  <LayoutGrid className="size-3.5" />
                </button>

                <button
                  type="button"
                  onClick={createSharePreview}
                  disabled={sharePending}
                  aria-label={sharePending ? messages.generatingShareImage : messages.shareToApps}
                  title={withShortcutTitle(messages.shareImage, shortcutBindings.share)}
                  className="inline-flex items-center gap-1 rounded-[14px] bg-brand px-1.5 py-1 text-[10px] font-semibold text-brand-foreground shadow-[0_2px_8px_color-mix(in_srgb,var(--brand)_38%,transparent)] transition-all hover:bg-brand/90 hover:shadow-[0_4px_12px_color-mix(in_srgb,var(--brand)_48%,transparent)] disabled:opacity-60 sm:px-2 sm:text-[11px]"
                >
                  <Share2 className="size-3" />
                  <span className="hidden sm:inline">
                    {sharePending ? messages.generatingShareImage : messages.shareToApps}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {isMobile && selectedBoardName && (
        <MobileStockSheet
          title={activeInspectorTitle ?? selectedBoardName}
          stock={activeInspectorStock}
          stocks={inspectorStocks}
          sectorStats={inspectorSectorStats}
          messages={messages}
          priceColorMode={priceColorMode}
          heatTheme={activeHeatTheme}
          displayMode={displayMode}
          sortKey={inspectorSortKey}
          isInWatchlist={Boolean(activeInspectorStock && watchlistCodes.includes(activeInspectorStock.code))}
          onSortChange={setInspectorSortKey}
          onClose={closeMobileSheet}
          onSelectStock={setSelectedStockCode}
          onToggleWatchlist={() => {
            if (activeInspectorStock) {
              toggleWatchlistItem(activeInspectorStock);
            }
          }}
          onOpenXueqiu={openXueqiuForStock}
        />
      )}

      <FilterPopover
        open={filtersOpen}
        isMobile={isMobile}
        closeLabel={messages.closeSheet}
        triggerRefs={filterTriggerRefs}
        layoutKey={`${sidebarOpen}:${desktopSidebarCollapsed}:${isFullscreen}:${isMobile}`}
        onClose={closeFilters}
        onMouseEnter={handleFilterHoverEnter}
        onMouseLeave={handleFilterHoverLeave}
      >
        <FilterPanel
          layout={isMobile ? "sheet" : "popover"}
          messages={messages}
          locale={locale}
          shortcutLabel={formatShortcutLabel(shortcutBindings.filters)}
          boards={boardFilterOptions}
          boardFilter={boardFilter}
          trendFilter={trendFilter}
          changeRangeFilter={changeRangeFilter}
          changeRangeMinInput={changeRangeMinInput}
          changeRangeMaxInput={changeRangeMaxInput}
          sizeMode={sizeMode}
          thumbnailMode={thumbnailMode}
          period={period}
          legendGradient={changeRangeSliderGradient}
          activeFilterCount={activeFilterCount}
          onClose={closeFilters}
          onToggleBoard={toggleBoardFilter}
          onClearBoardFilter={clearBoardFilter}
          onTrendFilterChange={setTrendFilter}
          onChangeRangeMinInputChange={setChangeRangeMinInput}
          onChangeRangeMaxInputChange={setChangeRangeMaxInput}
          onCommitChangeRange={commitChangeRangeInputs}
          onChangeRange={applyChangeRange}
          onClearChangeRange={() => applyChangeRange(emptyChangeRangeFilter)}
          onSizeModeChange={setSizeMode}
          onThumbnailModeChange={setThumbnailMode}
          onPeriodChange={setPeriod}
          onResetFilters={resetViewFilters}
        />
      </FilterPopover>

      <SettingsDrawer
        open={settingsOpen}
        tab={settingsTab}
        messages={messages}
        locale={locale}
        displayMode={displayMode}
        filterOpenMode={filterOpenMode}
        headerTrendStats={headerTrendStats}
        themeColor={themeColor}
        priceColorMode={priceColorMode}
        heatThemeId={heatThemeId}
        customHeatThemes={customHeatThemes}
        activeHeatTheme={activeHeatTheme}
        shortcutBindings={shortcutBindings}
        watchlist={watchlist}
        areaTipMessage={areaTipMessage}
        onClose={() => setSettingsOpen(false)}
        onTabChange={setSettingsTab}
        onLocaleChange={setLocale}
        onDisplayModeChange={setDisplayMode}
        onFilterOpenModeChange={setFilterOpenMode}
        onHeaderTrendStatsChange={setHeaderTrendStats}
        refreshIntervalSeconds={refreshIntervalSeconds}
        onRefreshIntervalChange={setRefreshIntervalSeconds}
        onThemeColorChange={setThemeColor}
        onPriceColorModeChange={setPriceColorMode}
        onHeatThemeIdChange={setHeatThemeId}
        onCustomHeatThemesChange={setCustomHeatThemes}
        onShortcutBindingsChange={setShortcutBindings}
        onShortcutRecordingChange={setShortcutRecording}
        onWatchlistAdd={addWatchlistItem}
        onWatchlistRemove={removeWatchlistItem}
        onWatchlistClear={clearWatchlist}
        onWatchlistImportText={importWatchlistFromText}
      />

      {sharePreview && (
        <div className="absolute inset-0 z-[10020] flex items-center justify-center bg-black/72 p-2 backdrop-blur-sm sm:p-3">
          <div className="flex max-h-[min(96vh,100%)] w-full max-w-[min(96vw,90rem)] flex-col border border-border bg-card text-card-foreground shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <h3 className="text-base font-semibold">{messages.sharePreviewTitle}</h3>
              </div>
              <button
                type="button"
                onClick={closeSharePreview}
                className="inline-flex size-9 items-center justify-center border border-border bg-background/70 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label={messages.closePreview}
              >
                <X className="size-4" />
              </button>
            </div>

            <div className={cn("min-h-0 flex-1 overflow-auto p-3 sm:p-4", isLightMode ? "bg-muted/45" : "bg-[#0f1319]")}>
              <img
                src={sharePreview.url}
                alt={messages.sharePreviewTitle}
                className={cn(
                  "mx-auto h-auto max-h-[calc(96vh-9.5rem)] w-auto max-w-full object-contain border shadow-[0_18px_60px_rgba(0,0,0,0.32)]",
                  isLightMode ? "border-border bg-background" : "border-slate-700/80 bg-[#10141b]"
                )}
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-4 py-3">
              <Button
                variant="outline"
                className="rounded-none border-border bg-background/80 text-foreground hover:bg-muted"
                onClick={downloadSharePreview}
              >
                <Download className="mr-2 size-4" />
                {messages.downloadImage}
              </Button>
              <Button
                variant="outline"
                className="rounded-none border-border bg-background/80 text-foreground hover:bg-muted"
                onClick={copySharePreview}
              >
                <Copy className="mr-2 size-4" />
                {messages.copyImage}
              </Button>
              {canShareSystem && (
                <Button
                  className="rounded-none border-transparent bg-brand text-brand-foreground shadow-[0_2px_10px_color-mix(in_srgb,var(--brand)_38%,transparent)] hover:bg-brand/90"
                  onClick={shareSystemPreview}
                >
                  <Share2 className="mr-2 size-4" />
                  {messages.shareToApps}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
