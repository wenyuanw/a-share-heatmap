"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import {
  Camera,
  Copy,
  Download,
  ExternalLink,
  Info,
  Loader2,
  Menu,
  Maximize2,
  Minimize2,
  Moon,
  Palette,
  RotateCcw,
  Settings2,
  Share2,
  Sun,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getMessages, type HeatmapMessages, type Locale } from "@/lib/i18n";
import {
  heatmapPeriodKeys,
  type HeatmapPeriodKey,
  type MarketKey,
  type TreemapResponse,
} from "@/lib/market-heatmap";

type QuoteMap = Record<string, { price: number; changePct: number }>;

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

type BoardRect = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  stockCount: number;
  titleHeight: number;
  changePct: number;
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
type SettingsTab = "appearance" | "help" | "project";

const refreshIntervalMs = 8000;
const marketOptions: MarketKey[] = ["all", "sse", "szse", "hs300", "zza500", "cyb", "kcb"];
const periodOptions: HeatmapPeriodKey[] = [...heatmapPeriodKeys];
const allBoardsValue = "__all__";
const colorLegendSteps = [-4, -3, -2, -1, 0, 1, 2, 3, 4] as const;
const legendTicks = [-4, -2, 0, 2, 4] as const;
const minZoom = 1;
const maxZoom = 3;
const flatThreshold = 0.1;
const githubProjectUrl = "https://github.com/wenyuanw/a-share-heatmap";

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
    activeSubBoardInner: string;
    boardBorder: string;
    highlightOuter: string;
    highlightInner: string;
  }
> = {
  dark: {
    backgroundStart: "#171b22",
    backgroundEnd: "#10141b",
    boardFill: "#20252d",
    subBoardFill: "rgba(18, 23, 31, 0.62)",
    subBoardBorder: "rgba(148, 163, 184, 0.3)",
    activeSubBoardInner: "rgba(8, 47, 73, 0.92)",
    boardBorder: "rgba(148, 163, 184, 0.48)",
    highlightOuter: "rgba(2, 6, 23, 0.92)",
    highlightInner: "#f8fafc",
  },
  light: {
    backgroundStart: "#f8fafc",
    backgroundEnd: "#e9eef5",
    boardFill: "#eef2f7",
    subBoardFill: "rgba(255, 255, 255, 0.72)",
    subBoardBorder: "rgba(100, 116, 139, 0.32)",
    activeSubBoardInner: "rgba(14, 116, 144, 0.42)",
    boardBorder: "rgba(100, 116, 139, 0.42)",
    highlightOuter: "rgba(15, 23, 42, 0.82)",
    highlightInner: "#ffffff",
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

function shortenText(text: string, maxLength: number) {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength)}…`;
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
  return `https://webquotepic.eastmoney.com/GetPic.aspx?nid=${marketId}.${symbol}&imageType=RJY`;
}

function getDailyKlineUrl(code: string) {
  const { symbol, market } = parseStockCode(code);
  const marketPrefix = market === "SH" ? "sh" : market === "SZ" ? "sz" : "bj";
  return `https://image.sinajs.cn/newchart/daily/n/${marketPrefix}${symbol}.gif`;
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

function getMarketLabel(messages: HeatmapMessages, market: MarketKey) {
  if (market === "all") return messages.markets.all;
  if (market === "sse") return messages.markets.sse;
  if (market === "szse") return messages.markets.szse;
  if (market === "hs300") return messages.markets.hs300;
  if (market === "zza500") return messages.markets.zza500;
  if (market === "cyb") return messages.markets.cyb;
  return messages.markets.kcb;
}

function getCompactMarketLabel(messages: HeatmapMessages, market: MarketKey, locale: Locale) {
  if (locale === "en") {
    if (market === "all") return "A-Share";
    if (market === "sse") return "Shanghai";
    if (market === "szse") return "Shenzhen";
    if (market === "hs300") return "CSI 300";
    if (market === "zza500") return "CSI A500";
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

function getHeatColor(changePct: number, colorMode: PriceColorMode) {
  const limit = 10;
  const neutral = "rgb(72, 79, 92)";
  const amplitude = clamp(Math.abs(changePct) / limit, 0, 1);

  if (Math.abs(changePct) < 0.1) {
    return neutral;
  }

  const isRise = changePct > 0;
  const shouldUseRed = colorMode === "red-rise" ? isRise : !isRise;

  if (shouldUseRed) {
    const red = Math.round(140 + amplitude * 115);
    const green = Math.round(72 - amplitude * 42);
    const blue = Math.round(76 - amplitude * 38);
    return `rgb(${red}, ${green}, ${blue})`;
  }

  const red = Math.round(40 - amplitude * 14);
  const green = Math.round(126 + amplitude * 88);
  const blue = Math.round(76 - amplitude * 10);
  return `rgb(${red}, ${green}, ${blue})`;
}

function getLegendGradient(colorMode: PriceColorMode) {
  return `linear-gradient(to right, ${colorLegendSteps
    .map((step, index) => {
      const position = (index / (colorLegendSteps.length - 1)) * 100;
      return `${getHeatColor(step, colorMode)} ${position.toFixed(2)}%`;
    })
    .join(", ")})`;
}

function getBoardHeaderColor(changePct: number, colorMode: PriceColorMode) {
  const amplitude = clamp(Math.abs(changePct) / 10, 0, 1);

  if (Math.abs(changePct) < 0.1) {
    return "rgb(51, 58, 70)";
  }

  const isRise = changePct > 0;
  const shouldUseRed = colorMode === "red-rise" ? isRise : !isRise;

  if (shouldUseRed) {
    return `rgb(${Math.round(120 + amplitude * 60)}, ${Math.round(58 - amplitude * 12)}, ${Math.round(
      66 - amplitude * 10
    )})`;
  }

  return `rgb(${Math.round(46 - amplitude * 10)}, ${Math.round(102 + amplitude * 36)}, ${Math.round(
    70 - amplitude * 6
  )})`;
}

function getChangeTextClass(changePct: number, colorMode: PriceColorMode, tone: "normal" | "soft" | "strong" = "normal") {
  if (Math.abs(changePct) < 0.1) {
    return tone === "strong" ? "text-slate-500" : "text-muted-foreground";
  }

  const isRise = changePct > 0;
  const shouldUseRed = colorMode === "red-rise" ? isRise : !isRise;

  if (shouldUseRed) {
    if (tone === "soft") return "text-red-100";
    if (tone === "strong") return "text-red-500";
    return "text-red-400";
  }

  if (tone === "soft") return "text-emerald-100";
  if (tone === "strong") return "text-emerald-600";
  return "text-emerald-400";
}

function getRiseTextClass(colorMode: PriceColorMode) {
  return colorMode === "red-rise" ? "text-red-400" : "text-emerald-400";
}

function getFallTextClass(colorMode: PriceColorMode) {
  return colorMode === "red-rise" ? "text-emerald-400" : "text-red-400";
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
  messages,
  priceColorMode,
  onClose,
  onSelectStock,
  onOpenXueqiu,
}: {
  title: string | null;
  stock: MobileStockSheetStock | null;
  stocks: MobileStockSheetStock[];
  messages: HeatmapMessages;
  priceColorMode: PriceColorMode;
  onClose: () => void;
  onSelectStock: (code: string) => void;
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
                    className={cn(
                      "text-[15px] font-semibold",
                      getChangeTextClass(stock.changePct, priceColorMode)
                    )}
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
            <div className="mx-4 mb-3 overflow-hidden rounded-md border border-slate-700/80 bg-white">
              <img
                src={getDailyKlineUrl(stock.code)}
                alt={`${stock.name} K-line`}
                className="h-auto w-full object-contain"
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="flex items-center justify-between gap-2 px-4 pb-3">
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
            <div className="flex items-center justify-between px-4 py-2 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">
              <span>{title ?? ""}</span>
              <span className="tabular-nums">{stocks.length}</span>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
              {stocks.map((item) => {
                const isActive = stock?.code === item.code;

                return (
                  <button
                    type="button"
                    key={item.code}
                    onClick={() => onSelectStock(item.code)}
                    className={cn(
                      "flex w-full items-center gap-3 border-b border-slate-800/80 px-4 py-2.5 text-left text-[13px] transition-colors",
                      isActive ? "bg-slate-800/70" : "hover:bg-slate-800/40"
                    )}
                  >
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate font-medium",
                        isActive ? "text-white" : "text-slate-200"
                      )}
                    >
                      {item.name}
                    </span>
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
                      className={cn(
                        "w-16 shrink-0 text-right text-[12px] font-semibold tabular-nums",
                        getChangeTextClass(item.changePct, priceColorMode)
                      )}
                    >
                      {formatChange(item.changePct)}
                    </span>
                  </button>
                );
              })}
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
        isLightMode ? "bg-slate-50/92" : "bg-[#0a0d12]/92"
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
            isLightMode ? "border-slate-200 bg-white/88" : "border-white/[0.07] bg-[#10141b]/90"
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

function SettingsDrawer({
  open,
  tab,
  messages,
  locale,
  displayMode,
  themeColor,
  priceColorMode,
  onClose,
  onTabChange,
  onLocaleChange,
  onDisplayModeChange,
  onThemeColorChange,
  onPriceColorModeChange,
}: {
  open: boolean;
  tab: SettingsTab;
  messages: HeatmapMessages;
  locale: Locale;
  displayMode: DisplayMode;
  themeColor: ThemeColorKey;
  priceColorMode: PriceColorMode;
  onClose: () => void;
  onTabChange: (tab: SettingsTab) => void;
  onLocaleChange: (locale: Locale) => void;
  onDisplayModeChange: (mode: DisplayMode) => void;
  onThemeColorChange: (theme: ThemeColorKey) => void;
  onPriceColorModeChange: (mode: PriceColorMode) => void;
}) {
  if (!open) {
    return null;
  }

  const isEnglish = locale === "en";
  const helpItems = [
    messages.tipArea,
    messages.tipColor,
    messages.tipDoubleClick,
    messages.tipZoom,
    messages.tipDrag,
    messages.tipInspectorScroll,
    messages.tipFullscreen,
  ];
  const tabs: Array<{ key: SettingsTab; label: string; icon: typeof Palette }> = [
    { key: "appearance", label: messages.settingsAppearance, icon: Palette },
    { key: "help", label: messages.settingsHelp, icon: Info },
    { key: "project", label: messages.settingsProject, icon: ExternalLink },
  ];
  const themeLabels: Record<ThemeColorKey, string> = isEnglish
    ? { green: "Green", red: "Red", blue: "Blue", violet: "Violet" }
    : { green: "绿色", red: "红色", blue: "蓝色", violet: "紫色" };

  return (
    <div className="absolute inset-0 z-[10010] flex items-end justify-center bg-black/62 backdrop-blur-sm" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0" aria-label={messages.closeSheet} onClick={onClose} />
      <section className="relative flex h-[82dvh] w-full flex-col overflow-hidden rounded-t-lg border border-b-0 border-border bg-card text-card-foreground shadow-[0_-24px_100px_rgba(0,0,0,0.48)]">
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

          <div className="min-h-0 overflow-y-auto p-4">
            {tab === "appearance" && (
              <div className="space-y-6">
                <section>
                  <h3 className="text-sm font-semibold">{messages.languageLabel}</h3>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => onLocaleChange("zh")}
                      aria-pressed={locale === "zh"}
                      className={cn(
                        "border px-3 py-3 text-left text-sm font-semibold transition-colors",
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
                        "border px-3 py-3 text-left text-sm font-semibold transition-colors",
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
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => onDisplayModeChange("light")}
                      aria-pressed={displayMode === "light"}
                      className={cn(
                        "flex items-center gap-2 border px-3 py-3 text-left text-sm font-semibold transition-colors",
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
                        "flex items-center gap-2 border px-3 py-3 text-left text-sm font-semibold transition-colors",
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
                  <h3 className="text-sm font-semibold">{messages.themeColor}</h3>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
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
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => onPriceColorModeChange("red-rise")}
                      aria-pressed={priceColorMode === "red-rise"}
                      className={cn(
                        "border px-3 py-3 text-left text-sm transition-colors",
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
                        "border px-3 py-3 text-left text-sm transition-colors",
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
              </div>
            )}

            {tab === "help" && (
              <section>
                <h3 className="text-sm font-semibold">{messages.helpTitle}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{messages.helpIntro}</p>
                <div className="mt-4 space-y-2">
                  {helpItems.map((item) => (
                    <div key={item} className="border border-border bg-background/70 px-3 py-2 text-sm text-muted-foreground">
                      {item.replace(/^·\s*/, "")}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {tab === "project" && (
              <section>
                <h3 className="text-sm font-semibold">{messages.githubProject}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{messages.githubProjectDescription}</p>
                <a
                  href={githubProjectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 border border-border bg-background/80 px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                >
                  <ExternalLink className="size-4" />
                  github.com/wenyuanw/a-share-heatmap
                </a>
              </section>
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
  const [themeColor, setThemeColor] = useState<ThemeColorKey>("red");
  const [priceColorMode, setPriceColorMode] = useState<PriceColorMode>("red-rise");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("appearance");
  const [market, setMarket] = useState<MarketKey>("all");
  const [period, setPeriod] = useState<HeatmapPeriodKey>("day");
  const [boardFilter, setBoardFilter] = useState(allBoardsValue);
  const [marketSummaries, setMarketSummaries] = useState<Partial<Record<MarketKey, MarketSummary>>>({});
  const [treemapData, setTreemapData] = useState<TreemapResponse | null>(null);
  const [quotes, setQuotes] = useState<QuoteMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState("");

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
  const [selectedStockCode, setSelectedStockCode] = useState<string | null>(null);
  const [selectedBoardName, setSelectedBoardName] = useState<string | null>(null);
  const [selectedSubBoardName, setSelectedSubBoardName] = useState<string | null>(null);
  const isEnglish = locale === "en";
  const isLightMode = displayMode === "light";
  const isMobile = useIsMobile();
  const legendGradient = useMemo(() => getLegendGradient(priceColorMode), [priceColorMode]);
  const heatmapCanvasTheme = heatmapCanvasThemes[displayMode];
  const brandStyle = useMemo(
    () =>
      ({
        "--brand": themeColors[themeColor].swatch,
        "--brand-foreground": themeColors[themeColor].foreground,
      }) as CSSProperties,
    [themeColor]
  );
  const riseTextClass = getRiseTextClass(priceColorMode);
  const fallTextClass = getFallTextClass(priceColorMode);

  const activeStockCode = isMobile ? selectedStockCode : hoveredStockCode;
  const activeBoardName = isMobile ? selectedBoardName : hoveredBoardName;
  const activeSubBoardName = isMobile ? selectedSubBoardName : hoveredSubBoardName;

  const lastStockRectsRef = useRef<StockRect[]>([]);
  const lastBoardRectsRef = useRef<BoardRect[]>([]);
  const lastSubBoardRectsRef = useRef<SubBoardRect[]>([]);
  const dragStateRef = useRef({
    active: false,
    pointerX: 0,
    pointerY: 0,
  });
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

  const fetchTreemap = useCallback(
    async (nextMarket: MarketKey, nextPeriod: HeatmapPeriodKey) => {
      const response = await fetch(`/api/heatmap/treemap?market=${nextMarket}&period=${nextPeriod}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(messages.errorLoad);
      }

      const payload = (await response.json()) as TreemapResponse;
      setTreemapData(payload);
      setUpdatedAt(payload.updatedAt);
    },
    [messages.errorLoad]
  );

  const fetchQuotes = useCallback(
    async (nextMarket: MarketKey, nextPeriod: HeatmapPeriodKey) => {
      const response = await fetch(`/api/heatmap/quotes?market=${nextMarket}&period=${nextPeriod}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(messages.errorLoad);
      }

      const payload = (await response.json()) as { updatedAt: string; quotes: QuoteMap };
      setQuotes(payload.quotes);
      setUpdatedAt(payload.updatedAt);
    },
    [messages.errorLoad]
  );

  const fetchMarketSummaries = useCallback(async (nextPeriod: HeatmapPeriodKey) => {
    const results = await Promise.all(
      marketOptions.map(async (option) => {
        const response = await fetch(`/api/heatmap/treemap?market=${option}&period=${nextPeriod}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(messages.errorLoad);
        }

        const payload = (await response.json()) as TreemapResponse;
        let weightedSum = 0;
        let totalValue = 0;

        for (const board of payload.nodes) {
          for (const stock of board.children) {
            weightedSum += stock.changePct * stock.value;
            totalValue += stock.value;
          }
        }

        const computedChangePct = totalValue > 0 ? weightedSum / totalValue : 0;
        const indexChangePct = payload.summary.indexChangePct;

        return [
          option,
          {
            changePct: Number.isFinite(indexChangePct) ? indexChangePct : computedChangePct,
            stockCount: payload.stockCount,
            updatedAt: payload.updatedAt,
          },
        ] as const;
      })
    );

    setMarketSummaries(Object.fromEntries(results) as Partial<Record<MarketKey, MarketSummary>>);
  }, [messages.errorLoad]);

  useEffect(() => {
    document.documentElement.classList.add("heatmap-page-active");
    document.body.classList.add("heatmap-page-active");

    return () => {
      document.documentElement.classList.remove("heatmap-page-active");
      document.body.classList.remove("heatmap-page-active");
    };
  }, []);

  useEffect(() => {
    if (!isFullscreen) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsFullscreen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isFullscreen]);

  useEffect(() => {
    if (inspectorListRef.current) {
      inspectorListRef.current.scrollTop = 0;
    }
  }, [activeBoardName]);

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
  }, [canvasSize.height, canvasSize.width]);

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
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadTreemap() {
      setLoading(true);
      setError(null);
      setHoveredStockCode(null);
      setHoveredBoardName(null);
      setHoveredBoardTitleName(null);
      setHoveredSubBoardName(null);
      setSelectedStockCode(null);
      setSelectedBoardName(null);
      setSelectedSubBoardName(null);

      try {
        await fetchTreemap(market, period);
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
  }, [fetchTreemap, market, messages.errorLoad, period]);

  useEffect(() => {
    let cancelled = false;

    async function loadQuotes() {
      try {
        await fetchQuotes(market, period);
      } catch {
        if (!cancelled) {
          setError(messages.errorLoad);
        }
      }
    }

    loadQuotes();
    const timer = window.setInterval(loadQuotes, refreshIntervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [fetchQuotes, market, messages.errorLoad, period]);

  useEffect(() => {
    let cancelled = false;

    async function loadSummaries() {
      try {
        await fetchMarketSummaries(period);
      } catch {
        if (!cancelled) {
          // Keep existing summaries if the refresh fails.
        }
      }
    }

    loadSummaries();
    const timer = window.setInterval(loadSummaries, refreshIntervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [fetchMarketSummaries, period]);

  useEffect(() => {
    if (!treemapData || boardFilter === allBoardsValue) {
      return;
    }

    if (!treemapData.nodes.some((node) => node.name === boardFilter)) {
      setBoardFilter(allBoardsValue);
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
  }, [boardFilter]);

  const boardFilterOptions = useMemo(() => treemapData?.nodes ?? [], [treemapData]);

  const visibleTreemapData = useMemo<TreemapResponse | null>(() => {
    if (!treemapData || boardFilter === allBoardsValue) {
      return treemapData;
    }

    const selectedBoard = treemapData.nodes.find((node) => node.name === boardFilter);
    if (!selectedBoard) {
      return treemapData;
    }

    let advanceCount = 0;
    let flatCount = 0;
    let declineCount = 0;
    let turnoverAmount = 0;

    for (const stock of selectedBoard.children) {
      const changePct = quotes[stock.code]?.changePct ?? stock.changePct;

      if (changePct > flatThreshold) {
        advanceCount += 1;
      } else if (changePct < -flatThreshold) {
        declineCount += 1;
      } else {
        flatCount += 1;
      }

      turnoverAmount += stock.turnoverAmount;
    }

    return {
      ...treemapData,
      stockCount: selectedBoard.stockCount,
      boardCount: 1,
      summary: {
        ...treemapData.summary,
        advanceCount,
        flatCount,
        declineCount,
        turnoverAmount,
        turnoverPreviousAmount: 0,
        turnoverDelta: 0,
        indexChangePct: weightedAverageChange(selectedBoard.children, quotes),
      },
      nodes: [selectedBoard],
    };
  }, [boardFilter, quotes, treemapData]);

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

  const layout = useMemo(() => {
    if (!visibleTreemapData) {
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
      visibleTreemapData.nodes.map((board) => ({ item: board, value: board.value })),
      0,
      0,
      canvasSize.width,
      canvasSize.height,
      6
    );

    for (const boardBox of boardBoxes) {
      const boardChangePct = weightedAverageChange(boardBox.item.children, quotes);
      const titleHeight =
        boardBox.width < 84 || boardBox.height < 54
          ? 0
          : clamp(Math.round(Math.min(Math.max(boardBox.height * 0.09, 14), 24)), 12, 24);
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
      });

      if (contentWidth <= 2 || contentHeight <= 2) {
        continue;
      }

      const subBoards = groupStocksBySubBoard(boardBox.item.children, quotes);
      const shouldNestSubBoards = subBoards.length > 1;

      if (!shouldNestSubBoards) {
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

        continue;
      }

      const subBoardBoxes = binaryTreemap(
        subBoards.map((subBoard) => ({ item: subBoard, value: subBoard.value })),
        contentX,
        contentY,
        contentWidth,
        contentHeight,
        boardBox.width > 96 && boardBox.height > 72 ? 2 : 1
      );

      for (const subBoardBox of subBoardBoxes) {
        const subTitleHeight =
          subBoardBox.width < 52 || subBoardBox.height < 34
            ? 0
            : clamp(Math.round(Math.min(Math.max(subBoardBox.height * 0.11, 10), 18)), 9, 18);
        const subPadding = subBoardBox.width > 82 && subBoardBox.height > 56 ? 2 : 1;
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
        });

        if (subContentWidth <= 2 || subContentHeight <= 2) {
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
  }, [canvasSize.height, canvasSize.width, quotes, visibleTreemapData]);

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
      return [] as Array<{ code: string; name: string; subBoardName: string; price: number; changePct: number }>;
    }

    const board = visibleTreemapData.nodes.find((node) => node.name === activeBoardName);
    if (!board) {
      return [];
    }

    return board.children
      .map((stock) => {
        const quote = quotes[stock.code];
        return {
          code: stock.code,
          name: stock.name,
          subBoardName: stock.subBoardName,
          price: quote?.price ?? stock.price,
          changePct: quote?.changePct ?? stock.changePct,
        };
      })
      .sort((left, right) => Math.abs(right.changePct) - Math.abs(left.changePct));
  }, [activeBoardName, quotes, visibleTreemapData]);

  const inspectorStocks = useMemo(() => {
    if (activeBoardStocks.length === 0) {
      return [] as Array<{
        code: string;
        name: string;
        subBoardName: string;
        price: number;
        changePct: number;
        active: boolean;
      }>;
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
    };

    const rest = activeBoardStocks.filter((stock) => stock.code !== highlightedStock.code);

    return [
      { ...current, active: true },
      ...rest.map((stock) => ({
        ...stock,
        active: false,
      })),
    ];
  }, [activeBoardStocks, highlightedStock]);

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
    if (!inspectorStyle || inspectorStocks.length === 0) {
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
  }, [inspectorStocks.length, inspectorStyle]);

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

    context.setTransform(1, 0, 0, 1, 0, 0);
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
      context.fillStyle = heatmapCanvasTheme.subBoardFill;
      context.fillRect(subBoard.x, subBoard.y, subBoard.width, subBoard.height);
    }

    for (const stock of layout.stockRects) {
      context.fillStyle = getHeatColor(stock.changePct, priceColorMode);
      context.fillRect(stock.x, stock.y, stock.width, stock.height);
      drawStockLabel(context, stock, view.scale);
    }

    for (const subBoard of layout.subBoardRects) {
      const isActiveSubBoard =
        activeSubBoardName === subBoard.name && activeBoardName === subBoard.boardName;

      if (subBoard.titleHeight > 0) {
        context.fillStyle = getBoardHeaderColor(subBoard.changePct, priceColorMode);
        context.fillRect(subBoard.x, subBoard.y, subBoard.width, subBoard.titleHeight);
      }

      context.strokeStyle = isActiveSubBoard ? "#5eead4" : heatmapCanvasTheme.subBoardBorder;
      context.lineWidth = isActiveSubBoard ? 2 : 0.9;
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

      if (subBoard.width > 44 && subBoard.titleHeight > 8) {
        const fontSize = clamp(Math.floor(subBoard.titleHeight * 0.56), 9, 12);
        context.fillStyle = "rgba(247, 250, 252, 0.92)";
        context.textAlign = "left";
        context.textBaseline = "middle";
        context.font = `700 ${fontSize}px Arial, sans-serif`;
        drawClippedText(
          context,
          shortenText(subBoard.name, subBoard.width > 108 ? 8 : 5),
          subBoard.x + 5,
          subBoard.y + subBoard.titleHeight / 2 + fontSize * 0.06,
          subBoard.x + 3,
          subBoard.y + 1,
          Math.max(0, subBoard.width - 6),
          Math.max(0, subBoard.titleHeight - 2)
        );
      }
    }

    for (const board of layout.boardRects) {
      const isActiveBoard = activeBoardName === board.name;
      if (board.titleHeight > 0) {
        context.fillStyle = getBoardHeaderColor(board.changePct, priceColorMode);
        context.fillRect(board.x, board.y, board.width, board.titleHeight);
      }

      context.strokeStyle = isActiveBoard ? "#f6d36d" : heatmapCanvasTheme.boardBorder;
      context.lineWidth = isActiveBoard ? 1.8 : 1;
      context.strokeRect(board.x + 0.5, board.y + 0.5, Math.max(0, board.width - 1), Math.max(0, board.height - 1));

      if (board.width > 56 && board.titleHeight > 10) {
        const fontSize = clamp(Math.floor(board.titleHeight * 0.52), 10, 15);
        context.fillStyle = "rgba(247, 250, 252, 0.96)";
        context.textAlign = "left";
        context.textBaseline = "middle";
        context.font = `700 ${fontSize}px Arial, sans-serif`;
        drawClippedText(
          context,
          shortenText(board.name, board.width > 180 ? 12 : 8),
          board.x + 8,
          board.y + board.titleHeight / 2 + fontSize * 0.08,
          board.x + 4,
          board.y + 2,
          Math.max(0, board.width - 8),
          Math.max(0, board.titleHeight - 4)
        );
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
  }, [
    canvasSize.height,
    canvasSize.width,
    activeBoardName,
    activeSubBoardName,
    highlightedStock,
    heatmapCanvasTheme,
    layout.boardRects,
    layout.subBoardRects,
    layout.stockRects,
    priceColorMode,
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
    (event: ReactWheelEvent<HTMLCanvasElement>) => {
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
    [canvasSize.height, canvasSize.width]
  );

  const handleCanvasTap = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      const bounds = canvas.getBoundingClientRect();
      const world = toWorldPoint(clientX - bounds.left, clientY - bounds.top);
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
    [pickBoard, pickStock, pickSubBoard, toWorldPoint]
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
        setBoardFilter((current) =>
          current === boardTitle.name ? allBoardsValue : boardTitle.name
        );
        return true;
      }

      // On touch devices the title strip is small; fall back to the whole
      // board so users can double-tap anywhere inside a 一级板块 to toggle.
      const board = pickBoard(world.x, world.y);
      if (board) {
        setBoardFilter((current) =>
          current === board.name ? allBoardsValue : board.name
        );
        return true;
      }

      return false;
    },
    [pickBoard, pickBoardTitle, toWorldPoint]
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
            if (event.cancelable) {
              event.preventDefault();
            }
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
  }, [canvasSize.height, canvasSize.width, handleCanvasDoubleTap, handleCanvasTap]);

  const onDoubleClick = useCallback(
    (event: ReactMouseEvent<HTMLCanvasElement>) => {
      if (isMobile) {
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      const bounds = canvas.getBoundingClientRect();
      const world = toWorldPoint(event.clientX - bounds.left, event.clientY - bounds.top);
      const boardTitle = pickBoardTitle(world.x, world.y);
      if (boardTitle) {
        setBoardFilter((current) => (current === boardTitle.name ? allBoardsValue : boardTitle.name));
        return;
      }

      const stock = pickStock(world.x, world.y);
      if (!stock) {
        return;
      }

      window.open(`https://xueqiu.com/S/${toXueqiuSymbol(stock.code)}`, "_blank", "noopener,noreferrer");
    },
    [isMobile, pickBoardTitle, pickStock, toWorldPoint]
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
      const cssFontPx = clamp(baseWidth * 0.012, 11, 16);
      const cssHorizontalPadding = clamp(baseWidth * 0.015, 12, 22);
      const cssTopPadding = cssFontPx * 2 + 8;
      const cssBottomPadding = 18;
      const horizontalPadding = cssHorizontalPadding * pixelRatio;
      const topPadding = cssTopPadding * pixelRatio;
      const bottomPadding = cssBottomPadding * pixelRatio;
      const fontPx = cssFontPx * pixelRatio;
      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = Math.round(sourceCanvas.width + horizontalPadding * 2);
      exportCanvas.height = Math.round(sourceCanvas.height + topPadding + bottomPadding);

      const context = exportCanvas.getContext("2d");
      if (!context) {
        throw new Error("Preview context unavailable");
      }

      const background = context.createLinearGradient(0, 0, exportCanvas.width, exportCanvas.height);
      background.addColorStop(0, isLightMode ? "#f8fafc" : "#151922");
      background.addColorStop(1, isLightMode ? "#e9eef5" : "#0f1319");
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
          ? `大 A 云图 ${getCompactPeriodLabel(period, "zh")} ${formatShareTimestamp(updatedAt)}`
          : `大 A 云图｜${getPeriodLabel(messages, period)} ${formatShareTimestamp(updatedAt)}`;
      const shareUrlLight = isLightMode ? "rgba(15, 23, 42, 0.96)" : "rgba(247, 250, 252, 0.98)";
      const shareUrlParts: { text: string; fillStyle: string }[] = [
        { text: "map.wenyuanw", fillStyle: shareUrlLight },
        { text: ".me", fillStyle: "#22c55e" },
      ];

      const headerY = topPadding / 2;
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

      const leftBlockEnd = urlX;
      const minCenterGap = fontPx * 0.85;
      context.textAlign = "right";
      context.fillStyle = isLightMode ? "rgba(15, 23, 42, 0.92)" : "rgba(247, 250, 252, 0.96)";
      let titleFontPx = fontPx;
      context.font = `600 ${titleFontPx}px Arial, sans-serif`;
      const titleWidth = context.measureText(shareTitle).width;
      const titleMaxWidth = Math.max(0, rightEdge - leftBlockEnd - minCenterGap);
      if (titleWidth > titleMaxWidth && titleMaxWidth > fontPx * 1.5) {
        titleFontPx = Math.max(
          fontPx * 0.62,
          Math.min(titleFontPx, (titleFontPx * titleMaxWidth) / titleWidth)
        );
        context.font = `600 ${titleFontPx}px Arial, sans-serif`;
      }
      context.fillText(shareTitle, rightEdge, headerY);
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

  const lastUpdatedText = updatedAt ? new Date(updatedAt).toLocaleTimeString() : "--:--:--";

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
            : "grid-cols-[1fr] grid-rows-[minmax(0,1fr)_auto] md:grid-cols-[148px_minmax(0,1fr)] lg:grid-cols-[162px_minmax(0,1fr)]"
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
              "row-start-1 flex min-h-0 min-w-0 flex-col border-r border-border bg-card/95 text-card-foreground",
              "fixed inset-y-0 left-0 z-50 w-[280px] transform shadow-2xl transition-transform duration-300",
              sidebarOpen ? "translate-x-0" : "-translate-x-full",
              "md:static md:z-auto md:row-span-2 md:w-auto md:translate-x-0 md:shadow-none md:transition-none"
            )}
            aria-hidden={!sidebarOpen && isMobile}
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
                <span className={cn("font-semibold tabular-nums text-foreground", isEnglish ? "text-[9px]" : "text-[10px]")}>
                  {lastUpdatedText}
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
                          isEnglish ? "text-[10.5px]" : "text-[12px]",
                          getChangeTextClass(summary?.changePct ?? 0, priceColorMode)
                        )}
                      >
                        {summary ? formatCompactChange(summary.changePct) : "--"}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className={cn("mt-1.5 border border-border bg-muted/18 p-1.5", isEnglish && "mt-1 p-[5px]")}>
                <label
                  htmlFor="board-filter"
                  className={cn(
                    "block font-semibold uppercase tracking-[0.12em] text-muted-foreground",
                    isEnglish ? "text-[9px]" : "text-[10px]"
                  )}
                >
                  {messages.boardFilterLabel}
                </label>
                <select
                  id="board-filter"
                  value={boardFilter}
                  onChange={(event) => {
                    setBoardFilter(event.target.value);
                    if (isMobile) {
                      setSidebarOpen(false);
                    }
                  }}
                  className={cn(
                    "mt-1 h-8 w-full min-w-0 border border-border bg-background/85 px-2 font-semibold text-foreground outline-none transition-colors hover:bg-muted focus:border-brand/70",
                    isEnglish ? "text-[10.5px]" : "text-[12px]"
                  )}
                >
                  <option value={allBoardsValue}>{messages.allBoards}</option>
                  {boardFilterOptions.map((board) => (
                    <option key={board.code} value={board.name}>
                      {board.name} ({board.stockCount})
                    </option>
                  ))}
                </select>
              </div>

              <div className={cn("mt-1.5 border border-border bg-muted/18 p-1.5", isEnglish && "mt-1 p-[5px]")}>
                <div className="flex items-center justify-between gap-2">
                  <p
                    className={cn(
                      "font-semibold uppercase tracking-[0.12em] text-muted-foreground",
                      isEnglish ? "text-[9px]" : "text-[10px]"
                    )}
                  >
                    {messages.metricLabel}
                  </p>
                  <span
                    className={cn(
                      "shrink-0 text-right font-semibold tabular-nums text-foreground",
                      isEnglish ? "text-[9.5px]" : "text-[10.5px]"
                    )}
                  >
                    {getPeriodLabel(messages, period)}
                  </span>
                </div>
                <div className={cn("mt-1 grid grid-cols-4 gap-1", isEnglish && "gap-0.5")}>
                  {periodOptions.map((option) => {
                    const isActive = period === option;

                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setPeriod(option)}
                        title={getPeriodLabel(messages, option)}
                        aria-pressed={isActive}
                        className={cn(
                          "h-7 border text-center font-semibold tabular-nums transition-colors",
                          isEnglish ? "text-[10px]" : "text-[12px]",
                          isActive
                            ? "border-brand/70 bg-brand/18 text-foreground shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--brand)_22%,transparent)]"
                            : "border-border bg-background/80 text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        {getCompactPeriodLabel(option, locale)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {marketOverview && (
                <div className={cn("mt-1.5 border border-border bg-muted/28 p-1.5", isEnglish && "mt-1 p-[5px]")}>
                  <div className={cn("grid grid-cols-3 gap-2", isEnglish && "gap-1.5")}>
                    <div className="flex min-w-0 flex-col items-center text-center">
                      <p className={cn("tracking-[0.06em]", riseTextClass, isEnglish ? "text-[10px]" : "text-[11px]")}>
                        {messages.legendRise}
                      </p>
                      <p className={cn("mt-1 font-semibold tabular-nums", riseTextClass, isEnglish ? "text-[13px]" : "text-base")}>
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
                        className={cn(
                          "tracking-[0.06em]",
                          fallTextClass,
                          isEnglish ? "text-[10px]" : "text-[11px]"
                        )}
                      >
                        {messages.legendFall}
                      </p>
                      <p className={cn("mt-1 font-semibold tabular-nums", fallTextClass, isEnglish ? "text-[13px]" : "text-base")}>
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
                            ? riseTextClass
                            : turnoverTrend === "down"
                              ? fallTextClass
                              : "text-muted-foreground";

                        return (
                          <>
                            {isEnglish ? (
                              <div className="space-y-0.5 text-[9px] leading-tight tracking-[0.04em] text-muted-foreground">
                                <span className="block">{messages.comparedToYesterdayLabel}</span>
                                <span className={cn("block font-semibold", turnoverTrendColor)}>
                                  {turnoverTrendLabel}
                                </span>
                              </div>
                            ) : (
                              <p className="text-[10px] leading-tight tracking-[0.04em] text-muted-foreground">
                                {messages.comparedToYesterdayLabel}
                                <span className={cn("ml-1 font-semibold", turnoverTrendColor)}>{turnoverTrendLabel}</span>
                              </p>
                            )}
                            <p
                              className={cn(
                                "mt-auto whitespace-nowrap pt-1 font-semibold tracking-[-0.01em]",
                                isEnglish ? "text-[11.5px] sm:text-[12px]" : "text-[13px] sm:text-[14px]",
                                turnoverTrendColor
                              )}
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
              >
                <Maximize2 className={cn(isEnglish ? "mr-1.5 size-3.5" : "mr-2 size-4")} />
                {messages.enterFullscreen}
              </Button>
              <Button
                variant="outline"
                size={isEnglish ? "xs" : "sm"}
                className={cn(
                  "justify-start rounded-none border-border bg-background/80 text-foreground hover:bg-muted",
                  isEnglish && "min-w-0 px-2 text-[10.5px]"
                )}
                onClick={() => setSettingsOpen(true)}
              >
                <Settings2 className={cn(isEnglish ? "mr-1.5 size-3.5" : "mr-2 size-4")} />
                {messages.settingsTitle}
              </Button>
            </div>
          </aside>
        )}

        <div
          className={cn(
            "relative min-h-0 overflow-hidden",
            isLightMode ? "bg-[#e9eef5]" : "bg-[#10141b]",
            isFullscreen ? "col-start-1 h-full" : "col-start-1 row-start-1 md:col-start-2"
          )}
        >
          <div
            ref={viewportRef}
            className={cn(
              "relative h-full min-h-0 overflow-hidden",
              isLightMode ? "bg-[#e9eef5]" : "bg-[#10141b]"
            )}
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

            {!isFullscreen && !sidebarOpen && (
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                aria-label={messages.expandSidebar}
                className="absolute bottom-3 left-3 z-30 inline-flex size-11 items-center justify-center rounded-full border border-slate-500/70 bg-black/50 text-white shadow-[0_10px_24px_rgba(0,0,0,0.35)] backdrop-blur-sm transition-colors hover:bg-black/70 md:hidden"
              >
                <Menu className="size-5" />
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
                    : (activeStock || hoveredBoardTitleName) && !isMobile
                      ? "pointer"
                      : "default",
              }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseLeave}
              onWheel={onWheel}
              onDoubleClick={onDoubleClick}
            />

            {inspectorStyle && (
              <aside
                className="pointer-events-none absolute z-30 overflow-hidden rounded-none border border-slate-700/80 bg-[#0f1319]/96 text-slate-100 shadow-[0_22px_72px_rgba(0,0,0,0.36)] backdrop-blur-sm"
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
                    <div className="border-b border-slate-700/80 bg-[#356e57] px-3 py-2.5">
                      <p className="text-[13px] font-semibold tracking-[0.02em] text-slate-100">
                        {activeInspectorTitle}
                      </p>
                      <div className="mt-2.5 grid grid-cols-[minmax(0,1fr)_94px] items-end gap-3">
                        <div className="min-w-0">
                          <p className="text-[18px] font-semibold leading-[1.08] text-white [word-break:keep-all]">
                            {activeInspectorStock.name}
                          </p>
                          <img
                            src={getSparklineUrl(activeInspectorStock.code)}
                            alt=""
                            className="mt-1.5 h-7 w-[86px] object-contain opacity-90"
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="text-right">
                          <p className="text-[17px] font-semibold tabular-nums text-white">
                            {formatPrice(activeInspectorStock.price)}
                          </p>
                          <p
                            className={cn(
                              "mt-0.5 text-[16px] font-semibold tabular-nums",
                              getChangeTextClass(activeInspectorStock.changePct, priceColorMode, "soft")
                            )}
                          >
                            {formatChange(activeInspectorStock.changePct)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="border-b border-slate-700/80 bg-white p-1.5">
                      <img
                        src={getDailyKlineUrl(activeInspectorStock.code)}
                        alt={`${activeInspectorStock.name} K-line`}
                        className="h-auto w-full bg-white object-contain"
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    <div className="bg-[#f4f6f7] text-slate-900">
                      <div className="flex items-center justify-between border-b border-slate-300/70 px-3 py-1.5 text-[11px] font-medium tracking-[0.08em] text-slate-500">
                        <span>{activeInspectorTitle ?? activeBoardName}</span>
                        <div className="flex items-center gap-2 text-right">
                          <span className="text-[10px] font-medium tracking-[0.03em] text-slate-400">
                            {messages.inspectorScrollHint}
                          </span>
                          <span>{inspectorStocks.length}</span>
                        </div>
                      </div>
                      <div
                        ref={inspectorListRef}
                        className="overflow-y-auto"
                        style={{ maxHeight: Math.max(170, inspectorStyle.maxHeight - 292) }}
                      >
                        {inspectorStocks.map((stock) => {
                          const isActive = stock.active;

                          return (
                            <div
                              key={stock.code}
                              className={cn(
                                "grid grid-cols-[minmax(0,1fr)_56px_64px_80px] items-center gap-2 border-b border-slate-300/70 px-3 py-1.5 text-[12.5px]",
                                isActive && "bg-slate-100"
                              )}
                            >
                              <span
                                className={cn(
                                  "min-w-0 pr-1 font-medium leading-[1.2] [word-break:keep-all]",
                                  isActive && "font-semibold"
                                )}
                              >
                                {stock.name}
                              </span>
                              <img
                                src={getSparklineUrl(stock.code)}
                                alt=""
                                className="h-5 w-full object-contain"
                                loading="lazy"
                                decoding="async"
                                referrerPolicy="no-referrer"
                              />
                              <span className="text-right text-[11.5px] font-medium tabular-nums text-slate-700">
                                {formatPrice(stock.price)}
                              </span>
                              <span
                                className={cn(
                                  "text-right text-[11.5px] font-medium tabular-nums",
                                  getChangeTextClass(stock.changePct, priceColorMode, "strong")
                                )}
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

            {loading && <HeatmapLoadingOverlay displayMode={displayMode} messages={messages} />}

            {error && !loading && (
              <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/80 text-sm text-destructive backdrop-blur-sm">
                {error}
              </div>
            )}
          </div>
        </div>

        {!isFullscreen && (
          <div
            className={cn(
              "col-span-1 row-start-2 border-t border-border px-3 py-1.5 sm:px-4 md:col-start-2",
              isLightMode ? "bg-card/95" : "bg-[#151a21]"
            )}
          >
            <div className="flex items-center justify-between gap-2 sm:gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <div className="group relative shrink-0">
                  <button
                    type="button"
                    aria-label={messages.operationTipsTitle}
                    onClick={() => {
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
                      "pointer-events-none absolute bottom-full left-0 z-40 mb-2 w-64 border p-2 text-[11px] leading-5 opacity-0 shadow-[0_18px_48px_rgba(0,0,0,0.35)] backdrop-blur-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100",
                      isLightMode
                        ? "border-border bg-popover/96 text-popover-foreground"
                        : "border-slate-700/90 bg-[#0f1319]/96 text-slate-300"
                    )}
                  >
                    <p>{messages.tipArea.replace(/^·\s*/, "")}</p>
                    <p>{messages.tipColor.replace(/^·\s*/, "")}</p>
                    <p>{(isMobile ? messages.tipTap : messages.tipDoubleClick).replace(/^·\s*/, "")}</p>
                    <p>{(isMobile ? messages.tipPinch : messages.tipZoom).replace(/^·\s*/, "")}</p>
                    <p>{messages.tipDrag.replace(/^·\s*/, "")}</p>
                    <p>{messages.tipInspectorScroll.replace(/^·\s*/, "")}</p>
                    <p>{messages.tipFullscreen.replace(/^·\s*/, "")}</p>
                  </div>
                </div>

                <a
                  href={githubProjectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={messages.githubProject}
                  title={messages.githubProject}
                  className={cn(
                    "inline-flex size-7 shrink-0 items-center justify-center bg-transparent transition-colors hover:text-brand focus-visible:text-brand",
                    isLightMode
                      ? "text-muted-foreground hover:bg-muted focus-visible:bg-muted"
                      : "text-slate-400 hover:bg-white/5 focus-visible:bg-white/5"
                  )}
                >
                  <GitHubMark className="size-3.5" />
                </a>

                <a
                  href="https://map.wenyuanw.me"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 truncate text-[11px] font-semibold tracking-tight text-brand transition-colors hover:text-brand/85 sm:text-[12px]"
                >
                  map<span className="text-brand/65">.wenyuanw.me</span>
                </a>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex w-36 items-center gap-1.5 sm:w-52 md:w-56">
                  <TrendingDown
                    className={cn("size-3 shrink-0", fallTextClass)}
                    aria-label={messages.legendFall}
                  />
                  <div className="relative flex-1">
                    <div
                      className="h-3.5 w-full rounded-full shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
                      style={{ background: legendGradient }}
                    />
                    <div
                      className="pointer-events-none absolute inset-0 flex items-center justify-between px-1 text-[8px] font-semibold tabular-nums leading-none text-white md:text-[9px]"
                      style={{ textShadow: "0 1px 2px rgba(0, 0, 0, 0.55)" }}
                    >
                      {legendTicks.map((tick) => (
                        <span key={tick}>{tick === 0 ? "0" : formatCompactChange(tick)}</span>
                      ))}
                    </div>
                  </div>
                  <TrendingUp
                    className={cn("size-3 shrink-0", riseTextClass)}
                    aria-label={messages.legendRise}
                  />
                </div>

                <button
                  type="button"
                  onClick={createSharePreview}
                  disabled={sharePending}
                  aria-label={sharePending ? messages.generatingShareImage : messages.shareToApps}
                  title={messages.shareImage}
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
          messages={messages}
          priceColorMode={priceColorMode}
          onClose={closeMobileSheet}
          onSelectStock={setSelectedStockCode}
          onOpenXueqiu={openXueqiuForStock}
        />
      )}

      <SettingsDrawer
        open={settingsOpen}
        tab={settingsTab}
        messages={messages}
        locale={locale}
        displayMode={displayMode}
        themeColor={themeColor}
        priceColorMode={priceColorMode}
        onClose={() => setSettingsOpen(false)}
        onTabChange={setSettingsTab}
        onLocaleChange={setLocale}
        onDisplayModeChange={setDisplayMode}
        onThemeColorChange={setThemeColor}
        onPriceColorModeChange={setPriceColorMode}
      />

      {sharePreview && (
        <div className="absolute inset-0 z-[10020] flex items-center justify-center bg-black/72 p-4 backdrop-blur-sm">
          <div className="flex max-h-full w-full max-w-5xl flex-col border border-border bg-card text-card-foreground shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
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

            <div className={cn("min-h-0 flex-1 overflow-auto p-4", isLightMode ? "bg-muted/45" : "bg-[#0f1319]")}>
              <img
                src={sharePreview.url}
                alt={messages.sharePreviewTitle}
                className={cn(
                  "mx-auto h-auto max-w-full border shadow-[0_18px_60px_rgba(0,0,0,0.32)]",
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
