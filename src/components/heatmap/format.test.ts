import { describe, expect, it } from "vitest";

import { getMessages } from "@/lib/i18n";
import { formatShortcutLabel } from "@/lib/heatmap-shortcuts";

import {
  compareInspectorStocks,
  cycleInspectorSortKey,
  formatBoardTrendCounts,
  formatChange,
  formatCompactChange,
  formatCount,
  formatPrice,
  formatShareTimestamp,
  formatTurnoverAmount,
  getCompactMarketLabel,
  getCompactPeriodLabel,
  getDailyKlineUrl,
  getInspectorSortLabel,
  getLiveTurnoverAmount,
  getMarketLabel,
  getPeriodLabel,
  getShortcutActionLabel,
  getSparklineUrl,
  getTurnoverTrend,
  parseStockCode,
  toXueqiuSymbol,
  trimTrailingZeros,
  withShortcutTitle,
} from "./format";

const messages = getMessages("zh").heatmap;

describe("数值格式化", () => {
  it("trimTrailingZeros 去掉小数尾部零", () => {
    expect(trimTrailingZeros("10.00")).toBe("10");
    expect(trimTrailingZeros("1.230")).toBe("1.23");
    expect(trimTrailingZeros("100")).toBe("100");
    expect(trimTrailingZeros("0.500")).toBe("0.5");
  });

  it("formatChange 带符号与缺数据占位符", () => {
    expect(formatChange(2.5)).toBe("+2.50%");
    expect(formatChange(-2.5)).toBe("-2.50%");
    expect(formatChange(0)).toBe("0.00%");
    expect(formatChange(null)).toBe("—");
    expect(formatChange(Number.NaN)).toBe("—");
  });

  it("formatCompactChange 大值收窄到一位小数", () => {
    expect(formatCompactChange(12.34)).toBe("+12.3%");
    expect(formatCompactChange(-3.456)).toBe("-3.46%");
    expect(formatCompactChange(9.999)).toBe("+10%");
    expect(formatCompactChange(null)).toBe("—");
  });

  it("formatPrice 按价格档位选择精度", () => {
    expect(formatPrice(8.88)).toBe("8.88");
    expect(formatPrice(99.5)).toBe("99.50");
    expect(formatPrice(100.26)).toBe("100.3");
  });

  it("formatCount 使用千分位", () => {
    expect(formatCount(5917, "zh")).toBe("5,917");
    expect(formatCount(5917, "en")).toBe("5,917");
  });

  it("formatTurnoverAmount 中文按万亿/亿/万分级", () => {
    expect(formatTurnoverAmount(1.5e12, "zh")).toBe("1.5 万亿");
    expect(formatTurnoverAmount(5e8, "zh")).toBe("5 亿");
    expect(formatTurnoverAmount(3.5e4, "zh")).toBe("3.5 万");
    expect(formatTurnoverAmount(999, "zh")).toBe("999");
  });

  it("formatTurnoverAmount 英文使用紧凑计数", () => {
    expect(formatTurnoverAmount(1500, "en")).toBe("1.5K");
    expect(formatTurnoverAmount(2.5e6, "en")).toBe("2.5M");
  });

  it("formatTurnoverAmount 非法输入返回占位符", () => {
    expect(formatTurnoverAmount(0, "zh")).toBe("--");
    expect(formatTurnoverAmount(Number.NaN, "en")).toBe("--");
  });

  it("formatShareTimestamp 输出上海时区时间", () => {
    expect(formatShareTimestamp("2026-09-25T00:30:00Z")).toBe("2026-09-25 08:30:00");
    expect(formatShareTimestamp("")).toBe("--");
    expect(formatShareTimestamp("not-a-date")).toBe("not-a-date");
  });
});

describe("行情派生值", () => {
  it("getTurnoverTrend 判断量能方向", () => {
    expect(getTurnoverTrend(1)).toBe("up");
    expect(getTurnoverTrend(-1)).toBe("down");
    expect(getTurnoverTrend(0)).toBe("flat");
  });

  it("getLiveTurnoverAmount 无效实时值时回退", () => {
    const quotes = {
      live: { price: 1, changePct: 1, turnoverAmount: 88 },
      broken: { price: 1, changePct: 1, turnoverAmount: Number.NaN },
    };
    expect(getLiveTurnoverAmount("live", 10, quotes)).toBe(88);
    expect(getLiveTurnoverAmount("broken", 10, quotes)).toBe(10);
    expect(getLiveTurnoverAmount("missing", 10, quotes)).toBe(10);
  });
});

describe("代码与外部链接", () => {
  it("parseStockCode 拆分代码与市场并补默认值", () => {
    expect(parseStockCode("600000.SH")).toEqual({ symbol: "600000", market: "SH" });
    expect(parseStockCode("000001.sz")).toEqual({ symbol: "000001", market: "SZ" });
    expect(parseStockCode("600000")).toEqual({ symbol: "600000", market: "SH" });
  });

  it("toXueqiuSymbol 转换为雪球格式", () => {
    expect(toXueqiuSymbol("600000.SH")).toBe("SH600000");
    expect(toXueqiuSymbol("000001.SZ")).toBe("SZ000001");
  });

  it("getSparklineUrl 与 getDailyKlineUrl 指向正确的市场前缀", () => {
    expect(getSparklineUrl("600000.SH")).toContain("nid=1.600000");
    expect(getSparklineUrl("000001.SZ")).toContain("nid=0.000001");
    expect(getDailyKlineUrl("600000.SH")).toContain("/sh600000.gif");
    expect(getDailyKlineUrl("000001.SZ")).toContain("/sz000001.gif");
    expect(getDailyKlineUrl("830001.BJ")).toContain("/bj830001.gif");
  });
});

describe("文案映射", () => {
  it("getMarketLabel 使用当前语言文案", () => {
    expect(getMarketLabel(messages, "all")).toBe(messages.markets.all);
    expect(getMarketLabel(messages, "hs300")).toBe(messages.markets.hs300);
    expect(getMarketLabel(messages, "watchlist")).toBe(messages.markets.watchlist);
  });

  it("getCompactMarketLabel 英文使用紧凑文案", () => {
    expect(getCompactMarketLabel(messages, "all", "en")).toBe("A-Share");
    expect(getCompactMarketLabel(messages, "hs300", "en")).toBe("CSI 300");
    expect(getCompactMarketLabel(messages, "hs300", "zh")).toBe(messages.markets.hs300);
  });

  it("getPeriodLabel 与 getCompactPeriodLabel", () => {
    expect(getPeriodLabel(messages, "day")).toBe(messages.metrics.day);
    expect(getCompactPeriodLabel("day", "en")).toBe("1D");
    expect(getCompactPeriodLabel("year", "zh")).toBe("年");
  });

  it("getShortcutActionLabel 与 getInspectorSortLabel 使用当前语言文案", () => {
    expect(getShortcutActionLabel(messages, "share")).toBe(messages.shortcutActionShare);
    expect(getInspectorSortLabel(messages, "turnover")).toBe(messages.inspectorSortTurnover);
  });

  it("formatBoardTrendCounts 填充涨跌家数", () => {
    const text = formatBoardTrendCounts(messages, 12, 34);
    expect(text).toContain("12");
    expect(text).toContain("34");
  });

  it("withShortcutTitle 拼接快捷键提示", () => {
    expect(withShortcutTitle("截图", "c")).toBe(`截图 (${formatShortcutLabel("c")})`);
  });
});

describe("个股列表排序", () => {
  const base = { code: "1", name: "a", subBoardName: "", price: 1, turnoverAmount: 0, marketCap: 0 };

  it("compareInspectorStocks 涨跌幅降序且 null 排在最后", () => {
    const high = { ...base, changePct: 5 };
    const low = { ...base, changePct: 2 };
    const missing = { ...base, changePct: null };
    expect(compareInspectorStocks(low, high, "changeDesc")).toBe(3);
    expect(compareInspectorStocks(missing, high, "changeDesc")).toBe(1);
    expect(compareInspectorStocks(high, missing, "changeDesc")).toBe(-1);
  });

  it("compareInspectorStocks 支持成交额与绝对涨跌幅", () => {
    const big = { ...base, changePct: -5, turnoverAmount: 100 };
    const small = { ...base, changePct: 2, turnoverAmount: 10 };
    // 降序比较器：大值在前时返回负数
    expect(compareInspectorStocks(big, small, "turnover")).toBe(-90);
    expect(compareInspectorStocks(big, small, "changeAbs")).toBe(-3);
  });

  it("cycleInspectorSortKey 循环切换并支持回绕", () => {
    expect(cycleInspectorSortKey("changeDesc", 1)).toBe("changeAsc");
    expect(cycleInspectorSortKey("name", 1)).toBe("changeDesc");
    expect(cycleInspectorSortKey("changeDesc", -1)).toBe("name");
  });
});
