import type { HeatmapMessages, Locale } from "@/lib/i18n";
import { formatShortcutLabel, type ShortcutActionId } from "@/lib/heatmap-shortcuts";
import { watchlistUniverseKey, type HeatmapPeriodKey, type HeatmapUniverse } from "@/lib/market-heatmap";

import { inspectorSortKeys, type InspectorSortKey, type InspectorStockItem, type QuoteMap } from "./types";

export function trimTrailingZeros(text: string) {
  return text.replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
}

export function formatPrice(value: number) {
  return value.toFixed(value >= 100 ? 1 : 2);
}

export function formatChange(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }
  if (value > 0) {
    return `+${value.toFixed(2)}%`;
  }

  return `${value.toFixed(2)}%`;
}

export function formatCompactChange(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }
  const absValue = Math.abs(value);
  const digits = absValue >= 10 ? 1 : 2;
  const text = trimTrailingZeros(value.toFixed(digits));
  return value > 0 ? `+${text}%` : `${text}%`;
}

export function formatBoardTrendCounts(messages: HeatmapMessages, advanceCount: number, declineCount: number) {
  return messages.boardTrendCounts.replace("{advance}", String(advanceCount)).replace("{decline}", String(declineCount));
}

export function formatCount(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en-US").format(value);
}

export function formatTurnoverAmount(value: number, locale: Locale) {
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

export function getTurnoverTrend(delta: number) {
  if (delta > 0) {
    return "up";
  }

  if (delta < 0) {
    return "down";
  }

  return "flat";
}

export function getLiveTurnoverAmount(code: string, fallback: number, quotes: QuoteMap) {
  if (code in quotes) {
    const live = quotes[code].turnoverAmount;
    return Number.isFinite(live) && live >= 0 ? live : fallback;
  }

  return fallback;
}

export function toXueqiuSymbol(code: string) {
  const [symbol, market] = code.split(".");
  return `${market}${symbol}`;
}

export function parseStockCode(code: string) {
  const [symbol = "", market = "SH"] = code.split(".");
  return {
    symbol,
    market: market.toUpperCase(),
  };
}

export function getSparklineUrl(code: string) {
  const { symbol, market } = parseStockCode(code);
  const marketId = market === "SH" ? "1" : "0";
  // RJY 带横/竖虚线网格；线色已按 A 股涨红跌绿绘制。
  return `https://webquotepic.eastmoney.com/GetPic.aspx?nid=${marketId}.${symbol}&imageType=RJY`;
}

export function getDailyKlineUrl(code: string) {
  const { symbol, market } = parseStockCode(code);
  const marketPrefix = market === "SH" ? "sh" : market === "SZ" ? "sz" : "bj";
  return `https://image.sinajs.cn/newchart/daily/n/${marketPrefix}${symbol}.gif`;
}

export function getInspectorSortLabel(messages: HeatmapMessages, sortKey: InspectorSortKey) {
  if (sortKey === "changeAbs") return messages.inspectorSortChangeAbs;
  if (sortKey === "changeDesc") return messages.inspectorSortChangeDesc;
  if (sortKey === "changeAsc") return messages.inspectorSortChangeAsc;
  if (sortKey === "turnover") return messages.inspectorSortTurnover;
  return messages.inspectorSortName;
}

export function compareInspectorStocks(left: InspectorStockItem, right: InspectorStockItem, sortKey: InspectorSortKey) {
  if (sortKey === "changeDesc" || sortKey === "changeAsc" || sortKey === "changeAbs") {
    if (left.changePct === null) return right.changePct === null ? 0 : 1;
    if (right.changePct === null) return -1;
  }
  if (sortKey === "changeDesc") {
    return right.changePct! - left.changePct!;
  }

  if (sortKey === "changeAsc") {
    return left.changePct! - right.changePct!;
  }

  if (sortKey === "turnover") {
    return right.turnoverAmount - left.turnoverAmount;
  }

  if (sortKey === "name") {
    return left.name.localeCompare(right.name, "zh");
  }

  return Math.abs(right.changePct!) - Math.abs(left.changePct!);
}

export function cycleInspectorSortKey(current: InspectorSortKey, direction: 1 | -1): InspectorSortKey {
  const index = inspectorSortKeys.indexOf(current);
  const nextIndex = (index + direction + inspectorSortKeys.length) % inspectorSortKeys.length;
  return inspectorSortKeys[nextIndex];
}

export function formatShareTimestamp(value: string) {
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

export function getShortcutActionLabel(messages: HeatmapMessages, action: ShortcutActionId) {
  if (action === "share") return messages.shortcutActionShare;
  if (action === "resetView") return messages.shortcutActionResetView;
  if (action === "fullscreen") return messages.shortcutActionFullscreen;
  if (action === "settings") return messages.shortcutActionSettings;
  if (action === "sidebar") return messages.shortcutActionSidebar;
  if (action === "filters") return messages.shortcutActionFilters;
  if (action === "toggleWatchlist") return messages.shortcutActionToggleWatchlist;
  return messages.shortcutActionDisplayMode;
}

export function withShortcutTitle(label: string, key: string) {
  return `${label} (${formatShortcutLabel(key)})`;
}

export function getMarketLabel(messages: HeatmapMessages, market: HeatmapUniverse) {
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

export function getCompactMarketLabel(messages: HeatmapMessages, market: HeatmapUniverse, locale: Locale) {
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

export function getPeriodLabel(messages: HeatmapMessages, period: HeatmapPeriodKey) {
  if (period === "day") return messages.metrics.day;
  if (period === "week") return messages.metrics.week;
  if (period === "month") return messages.metrics.month;
  return messages.metrics.year;
}

export function getCompactPeriodLabel(period: HeatmapPeriodKey, locale: Locale) {
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
