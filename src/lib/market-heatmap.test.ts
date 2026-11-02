import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/data/market-heatmap-fallback.json", () => ({ default: {
  updatedAt: "2026-11-02T06:00:00Z", stockCount: 4, boardCount: 1,
  stocks: [
    { code: "601299.SH", exchange: "SH", name: "中国北车" },
    { code: "600001.SH", exchange: "SH", name: "正常股票" },
    { code: "000001.SZ", exchange: "SZ", name: "停牌股票" },
    { code: "920285.BJ", exchange: "BJ", name: "未分类新股" },
  ].map((stock) => ({ ...stock, boardName: "其他", price: 10, changePct: 0, totalMarketCap: 2e9, floatMarketCap: 1e9 })),
} }));
vi.mock("@/lib/data/market-heatmap-subboards.json", () => ({ default: { subboards: {} } }));
vi.mock("@/lib/data/stock-listing-status.json", () => ({ default: {
  stocks: [{ code: "601299.SH", delistedOn: "2015-05-20" }],
} }));

import { getBundledSnapshotTreemap, resolveStocksByCodes, searchStocks } from "./market-heatmap";

afterEach(() => { vi.unstubAllGlobals(); });

describe("退市证券不会进入首屏、自选检索和实时行情", () => {
  it("旧快照中残留的退市记录也被过滤，其他板块和停牌股正常保留", () => {
    const tree = getBundledSnapshotTreemap();
    expect(tree.nodes.flatMap((node) => node.children.map((stock) => stock.code))).toEqual([
      "600001.SH", "000001.SZ", "920285.BJ",
    ]);
    expect(tree.stockCount).toBe(3);
    expect(searchStocks("中国北车")).toEqual([]);
    expect(resolveStocksByCodes(["601299.SH", "000001.SZ"]).map((stock) => stock.code)).toEqual(["000001.SZ"]);
  });

  it.each([true, false])("完整实时行情不会误删停牌股或复活退市代码（源含退市记录：%s）", async (withRetired) => {
    vi.resetModules();
    const { getQuoteData } = await import("./market-heatmap");
    vi.stubGlobal("fetch", vi.fn(async (rawUrl: string) => {
      if (rawUrl.includes("eastmoney.com")) {
        return Response.json({ data: { total: withRetired ? 3 : 2, diff: [
          ...(withRetired ? [{ f12: "601299", f13: 1, f14: "中国北车" }] : []),
          { f12: "600001", f13: 1, f14: "正常股票" },
          { f12: "603999", f13: 1, f14: "当日新股" },
        ].map((row) => ({ ...row, f2: 12, f3: 1, f20: 2e9, f21: 1e9, f124: 1793599200 })) } });
      }
      // Other quote sources are unavailable; exercise the full-market source.
      return new Response("");
    }));
    await getQuoteData("all"); // first paint starts the live fetch
    const live = await getQuoteData("all");
    expect(live.source).toBe("direct");
    expect(Object.keys(live.quotes).sort()).toEqual(["000001.SZ", "600001.SH", "603999.SH", "920285.BJ"]);
    expect(live.quotes["000001.SZ"].price).toBe(10);
    expect(live.quotes["603999.SH"].price).toBe(12);
  });
});
