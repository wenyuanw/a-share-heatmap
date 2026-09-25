import { describe, expect, it } from "vitest";

import type { HeatmapStockNode, TreemapResponse } from "@/lib/market-heatmap";

import {
  applySizeModeToTreemapData,
  binaryTreemap,
  buildSectorVisualStats,
  countStockTrends,
  createEmptyWatchlistTreemap,
  filterTreemapByStockPredicate,
  getStockSizeValue,
  groupStocksBySubBoard,
  insetRect,
  sectorStatsKey,
  weightedAverageChange,
} from "./treemap";
import type { QuoteMap } from "./types";

function makeStock(overrides: Partial<HeatmapStockNode> = {}): HeatmapStockNode {
  return {
    code: "600000.SH",
    name: "测试股",
    boardName: "银行",
    subBoardName: "股份制银行",
    value: 100,
    exchange: "SH",
    price: 10,
    changePct: 1,
    turnoverAmount: 50,
    ...overrides,
  };
}

function makeTreemap(nodes: TreemapResponse["nodes"]): TreemapResponse {
  return {
    market: "all",
    period: "day",
    updatedAt: "2026-09-25T00:00:00Z",
    stockCount: nodes.reduce((sum, node) => sum + node.stockCount, 0),
    boardCount: nodes.length,
    summary: {
      advanceCount: 0,
      flatCount: 0,
      declineCount: 0,
      turnoverAmount: 0,
      turnoverPreviousAmount: 0,
      turnoverDelta: 0,
    },
    nodes,
    source: "direct",
  };
}

describe("createEmptyWatchlistTreemap", () => {
  it("返回零值空树图", () => {
    const data = createEmptyWatchlistTreemap("week");
    expect(data.market).toBe("all");
    expect(data.period).toBe("week");
    expect(data.nodes).toEqual([]);
    expect(data.stockCount).toBe(0);
    expect(data.boardCount).toBe(0);
    expect(data.summary.advanceCount).toBe(0);
  });
});

describe("countStockTrends", () => {
  it("按 flatThreshold 划分涨平跌", () => {
    const stocks = [
      { code: "a", changePct: 2 },
      { code: "b", changePct: 0.05 },
      { code: "c", changePct: -2 },
      { code: "d", changePct: null },
    ];
    expect(countStockTrends(stocks, {})).toEqual({ advanceCount: 1, flatCount: 1, declineCount: 1 });
  });

  it("实时行情优先于静态涨跌幅", () => {
    const quotes: QuoteMap = {
      a: { price: 1, changePct: -3, turnoverAmount: 0 },
      b: { price: 1, changePct: 5, turnoverAmount: 0 },
    };
    const stocks = [
      { code: "a", changePct: 2 },
      { code: "b", changePct: null },
    ];
    expect(countStockTrends(stocks, quotes)).toEqual({ advanceCount: 1, flatCount: 0, declineCount: 1 });
  });
});

describe("weightedAverageChange", () => {
  it("按市值加权平均", () => {
    const stocks = [
      { code: "a", value: 100, changePct: 2 },
      { code: "b", value: 300, changePct: 4 },
    ];
    expect(weightedAverageChange(stocks, {})).toBe(3.5);
  });

  it("无有效数据时返回 null", () => {
    expect(weightedAverageChange([], {})).toBeNull();
    expect(weightedAverageChange([{ code: "a", value: 0, changePct: null }], {})).toBeNull();
  });
});

describe("binaryTreemap", () => {
  type Item = { name: string };

  const items = [
    { name: "a", value: 40 },
    { name: "b", value: 30 },
    { name: "c", value: 20 },
    { name: "d", value: 10 },
  ].map(({ name, value }) => ({ item: { name } as Item, value }));

  function assertNoOverlap(rects: Array<{ x: number; y: number; width: number; height: number }>) {
    for (let i = 0; i < rects.length; i += 1) {
      for (let j = i + 1; j < rects.length; j += 1) {
        const a = rects[i];
        const b = rects[j];
        const overlap =
          a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
        expect(overlap).toBe(false);
      }
    }
  }

  it("铺满目标区域且矩形互不重叠", () => {
    const rects = binaryTreemap(items, 0, 0, 100, 100);
    expect(rects).toHaveLength(4);
    assertNoOverlap(rects);
    const area = rects.reduce((sum, rect) => sum + rect.width * rect.height, 0);
    expect(area).toBeCloseTo(10000, 6);
    for (const rect of rects) {
      expect(rect.x).toBeGreaterThanOrEqual(0);
      expect(rect.y).toBeGreaterThanOrEqual(0);
      expect(rect.x + rect.width).toBeLessThanOrEqual(100);
      expect(rect.y + rect.height).toBeLessThanOrEqual(100);
    }
  });

  it("面积与权重成正比", () => {
    const rects = binaryTreemap(items, 0, 0, 100, 100);
    const byName = new Map(rects.map((rect) => [rect.item.name, rect]));
    const a = byName.get("a")!;
    const d = byName.get("d")!;
    expect((a.width * a.height) / (d.width * d.height)).toBeCloseTo(4, 6);
  });

  it("保留间隙后矩形仍在界内且互不重叠", () => {
    const rects = binaryTreemap(items, 0, 0, 100, 100, 4);
    assertNoOverlap(rects);
    const area = rects.reduce((sum, rect) => sum + rect.width * rect.height, 0);
    expect(area).toBeLessThan(10000);
  });

  it("过滤零值并处理空输入", () => {
    expect(binaryTreemap([], 0, 0, 100, 100)).toEqual([]);
    const withZero = [...items, { item: { name: "z" } as Item, value: 0 }];
    const rects = binaryTreemap(withZero, 0, 0, 100, 100);
    expect(rects.map((rect) => rect.item.name)).not.toContain("z");
  });
});

describe("insetRect", () => {
  it("四周收缩指定间隙", () => {
    const rect = insetRect({ item: "x", x: 0, y: 0, width: 10, height: 10 }, 2);
    expect(rect).toEqual({ item: "x", x: 1, y: 1, width: 8, height: 8 });
  });

  it("间隙过大时不产生负尺寸", () => {
    const rect = insetRect({ item: "x", x: 0, y: 0, width: 2, height: 2 }, 10);
    expect(rect.width).toBe(0);
    expect(rect.height).toBe(0);
  });
});

describe("groupStocksBySubBoard", () => {
  it("按二级行业分组、组内组间都按市值降序", () => {
    const stocks = [
      makeStock({ code: "1", subBoardName: "城商行", value: 10, changePct: 1 }),
      makeStock({ code: "2", subBoardName: "股份制银行", value: 30, changePct: 3 }),
      makeStock({ code: "3", subBoardName: "股份制银行", value: 50, changePct: 2 }),
      makeStock({ code: "4", subBoardName: "", boardName: "银行", value: 20, changePct: 4 }),
    ];
    const groups = groupStocksBySubBoard(stocks);
    expect(groups.map((group) => group.name)).toEqual(["股份制银行", "银行", "城商行"]);
    const major = groups[0];
    expect(major.stockCount).toBe(2);
    expect(major.value).toBe(80);
    expect(major.children.map((stock) => stock.code)).toEqual(["3", "2"]);
    expect(major.changePct).toBeCloseTo((30 * 3 + 50 * 2) / 80, 6);
  });
});

describe("getStockSizeValue 与 applySizeModeToTreemapData", () => {
  it("市值模式直接返回原始 value", () => {
    const stock = { code: "a", value: 100, turnoverAmount: 30 };
    expect(getStockSizeValue(stock, {}, "marketCap")).toBe(100);
  });

  it("成交额模式优先使用实时成交额", () => {
    const stock = { code: "a", value: 100, turnoverAmount: 30 };
    const quotes: QuoteMap = { a: { price: 1, changePct: 1, turnoverAmount: 88 } };
    expect(getStockSizeValue(stock, quotes, "turnover")).toBe(88);
    expect(getStockSizeValue(stock, {}, "turnover")).toBe(30);
  });

  it("市值模式下返回原数据引用", () => {
    const data = makeTreemap([]);
    expect(applySizeModeToTreemapData(data, {}, "marketCap")).toBe(data);
  });

  it("成交模式下按实时成交额重设面积并整体降序", () => {
    const data = makeTreemap([
      {
        code: "board-a",
        name: "银行",
        value: 300,
        stockCount: 2,
        children: [
          makeStock({ code: "a", value: 200, turnoverAmount: 10 }),
          makeStock({ code: "b", value: 100, turnoverAmount: 50 }),
        ],
      },
      {
        code: "board-b",
        name: "电子",
        value: 500,
        stockCount: 1,
        children: [makeStock({ code: "c", boardName: "电子", value: 500, turnoverAmount: 20 })],
      },
    ]);
    const resized = applySizeModeToTreemapData(data, {}, "turnover");
    // 银行板块成交额 60 > 电子板块 20，重排后银行在前
    expect(resized.nodes.map((node) => node.name)).toEqual(["银行", "电子"]);
    const bank = resized.nodes[0];
    expect(bank.children.map((stock) => stock.code)).toEqual(["b", "a"]);
    expect(bank.value).toBe(60);
  });
});

describe("filterTreemapByStockPredicate", () => {
  it("过滤不满足条件的个股并重算统计", () => {
    const data = makeTreemap([
      {
        code: "board-a",
        name: "银行",
        value: 300,
        stockCount: 3,
        children: [
          makeStock({ code: "a", value: 100, changePct: 2, turnoverAmount: 10 }),
          makeStock({ code: "b", value: 100, changePct: -5, turnoverAmount: 20 }),
          makeStock({ code: "c", value: 100, changePct: 0.01, turnoverAmount: 30 }),
        ],
      },
    ]);
    const filtered = filterTreemapByStockPredicate(data, {}, (changePct) => changePct > 0);
    // 0.01 满足 > 0 谓词被保留，但按 flatThreshold 计入平盘统计
    expect(filtered.nodes).toHaveLength(1);
    expect(filtered.nodes[0].children.map((stock) => stock.code)).toEqual(["a", "c"]);
    expect(filtered.nodes[0].stockCount).toBe(2);
    expect(filtered.nodes[0].value).toBe(200);
    expect(filtered.stockCount).toBe(2);
    expect(filtered.boardCount).toBe(1);
    expect(filtered.summary.advanceCount).toBe(1);
    expect(filtered.summary.flatCount).toBe(1);
    expect(filtered.summary.declineCount).toBe(0);
    expect(filtered.summary.turnoverAmount).toBe(40);
  });

  it("板块全部被过滤后整块移除", () => {
    const data = makeTreemap([
      {
        code: "board-a",
        name: "银行",
        value: 100,
        stockCount: 1,
        children: [makeStock({ code: "a", value: 100, changePct: -5 })],
      },
    ]);
    const filtered = filterTreemapByStockPredicate(data, {}, (changePct) => changePct > 0);
    expect(filtered.nodes).toEqual([]);
    expect(filtered.boardCount).toBe(0);
  });
});

describe("buildSectorVisualStats", () => {
  it("按板块与二级板块生成视觉统计", () => {
    const data = makeTreemap([
      {
        code: "board-a",
        name: "银行",
        value: 300,
        stockCount: 2,
        children: [
          makeStock({ code: "a", value: 100, changePct: 2, subBoardName: "股份制银行" }),
          makeStock({ code: "b", value: 200, changePct: -2, subBoardName: "城商行" }),
        ],
      },
    ]);
    const stats = buildSectorVisualStats(data, {});
    const bank = stats.boards.get("银行");
    expect(bank).toEqual({ advanceCount: 1, flatCount: 0, declineCount: 1, changePct: expect.any(Number) });
    expect(bank!.changePct).toBeCloseTo((100 * 2 - 200 * 2) / 300, 6);
    const sub = stats.subBoards.get(sectorStatsKey("银行", "城商行"));
    expect(sub).toEqual({ advanceCount: 0, flatCount: 0, declineCount: 1, changePct: -2 });
  });

  it("空数据返回空 Map", () => {
    const stats = buildSectorVisualStats(null, {});
    expect(stats.boards.size).toBe(0);
    expect(stats.subBoards.size).toBe(0);
  });
});

describe("sectorStatsKey", () => {
  it("组合键可区分同名二级板块", () => {
    expect(sectorStatsKey("银行", "城商行")).not.toBe(sectorStatsKey("电子", "城商行"));
    expect(sectorStatsKey("银行", "城商行")).toBe(sectorStatsKey("银行", "城商行"));
  });
});
