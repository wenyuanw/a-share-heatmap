import {
  heatmapPeriodKeys,
  isHeatmapPeriodKey,
  isHeatmapUniverse,
  marketKeys,
  type HeatmapUniverse,
} from "@/lib/market-heatmap";
import {
  getCurrentTreemapStocks,
  getDataFreshness,
  type HeatmapSizeMode,
  type HeatmapTrendFilter,
  type HeatmapWebMcpContext,
} from "@/lib/heatmap-webmcp-types";

const marketLabels: Record<HeatmapUniverse, { nameZh: string; nameEn: string }> = {
  all: { nameZh: "全部 A 股", nameEn: "All A-shares" },
  sse: { nameZh: "上证 A 股", nameEn: "SSE A-shares" },
  szse: { nameZh: "深证 A 股", nameEn: "SZSE A-shares" },
  hs300: { nameZh: "沪深 300", nameEn: "CSI 300" },
  zza50: { nameZh: "中证 A50", nameEn: "CSI A50" },
  zza500: { nameZh: "中证 A500", nameEn: "CSI A500" },
  main: { nameZh: "主板", nameEn: "Main board" },
  cyb: { nameZh: "创业板", nameEn: "ChiNext" },
  kcb: { nameZh: "科创板", nameEn: "STAR Market" },
  watchlist: { nameZh: "自选股", nameEn: "Watchlist" },
};

const trendLabels: Record<HeatmapTrendFilter, { nameZh: string; nameEn: string }> = {
  all: { nameZh: "全部", nameEn: "All" },
  rising: { nameZh: "上涨", nameEn: "Rising" },
  falling: { nameZh: "下跌", nameEn: "Falling" },
};

function optionalBoolean(input: Record<string, unknown>, key: string) {
  const value = input[key];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "boolean") {
    throw new Error(`${key} must be a boolean.`);
  }
  return value;
}

function validateLimit(input: Record<string, unknown>, fallback: number, max: number) {
  const raw = input.limit;
  if (raw === undefined) {
    return fallback;
  }
  if (typeof raw !== "number" || !Number.isInteger(raw) || raw < 1 || raw > max) {
    throw new Error(`limit must be an integer between 1 and ${max}.`);
  }
  return raw;
}

function formatStock(stock: ReturnType<typeof getCurrentTreemapStocks>[number]) {
  return {
    code: stock.code,
    name: stock.name,
    boardName: stock.boardName,
    subBoardName: stock.subBoardName,
    exchange: stock.exchange,
    price: stock.price,
    changePct: stock.changePct,
    turnoverAmount: stock.turnoverAmount,
    marketCap: stock.marketCap,
  };
}

function getBoardRankings(context: HeatmapWebMcpContext, limit: number, sortBy: string) {
  const stocks = getCurrentTreemapStocks(context);
  const groups = new Map<string, typeof stocks>();

  for (const stock of stocks) {
    const current = groups.get(stock.boardName) ?? [];
    current.push(stock);
    groups.set(stock.boardName, current);
  }

  const rankings = Array.from(groups, ([name, boardStocks]) => {
    const marketCap = boardStocks.reduce((sum, stock) => sum + stock.marketCap, 0);
    const turnoverAmount = boardStocks.reduce((sum, stock) => sum + stock.turnoverAmount, 0);
    const changePct = marketCap > 0
      ? boardStocks.reduce((sum, stock) => sum + stock.changePct * stock.marketCap, 0) / marketCap
      : boardStocks.reduce((sum, stock) => sum + stock.changePct, 0) / Math.max(1, boardStocks.length);
    const advanceCount = boardStocks.filter((stock) => stock.changePct > 0.1).length;
    const declineCount = boardStocks.filter((stock) => stock.changePct < -0.1).length;

    return {
      name,
      stockCount: boardStocks.length,
      changePct,
      turnoverAmount,
      marketCap,
      advanceCount,
      flatCount: boardStocks.length - advanceCount - declineCount,
      declineCount,
    };
  });

  rankings.sort((left, right) => {
    if (sortBy === "stockCount") return right.stockCount - left.stockCount;
    if (sortBy === "turnoverAmount") return right.turnoverAmount - left.turnoverAmount;
    if (sortBy === "marketCap") return right.marketCap - left.marketCap;
    return right.changePct - left.changePct;
  });

  return rankings.slice(0, limit);
}

export function createHeatmapViewWebMcpTools(context: HeatmapWebMcpContext): WebMcpToolDefinition[] {
  const getStateTool: WebMcpToolDefinition = {
    name: "get_heatmap_state",
    title: "Get heatmap state",
    description:
      "Read the current A-share heatmap view, filters, selected item, loaded data summary, and data freshness.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute: async () => {
      const state = context.stateRef.current;
      const data = state.visibleTreemapData ?? state.treemapData;
      const freshness = getDataFreshness(context);
      return {
        market: state.market,
        marketName: marketLabels[state.market],
        period: state.period,
        availableMarkets: ([...marketKeys, "watchlist"] as HeatmapUniverse[]).map((market) => ({
          id: market,
          ...marketLabels[market],
        })),
        availablePeriods: heatmapPeriodKeys,
        filters: {
          boardNames: state.boardFilter,
          trend: state.trendFilter,
          trendName: trendLabels[state.trendFilter],
          changeRangePct: state.changeRangeFilter,
        },
        display: {
          sizeMode: state.sizeMode,
          thumbnailMode: state.thumbnailMode,
          headerTrendStats: state.headerTrendStats,
          refreshIntervalSeconds: state.refreshIntervalSeconds,
          view: state.view,
        },
        selection: {
          stockCode: state.selectedStockCode,
          boardName: state.selectedBoardName,
          subBoardName: state.selectedSubBoardName,
        },
        data: data
          ? {
              stockCount: data.stockCount,
              boardCount: data.boardCount,
              summary: data.summary,
              availableBoardNames: data.nodes.map((board) => board.name),
            }
          : null,
        ...freshness,
        error: state.error,
      };
    },
  };

  const setViewTool: WebMcpToolDefinition = {
    name: "set_heatmap_view",
    title: "Set heatmap view",
    description:
      "Change the heatmap market universe, performance period, area metric, or thumbnail mode. Omitted values stay unchanged.",
    inputSchema: {
      type: "object",
      properties: {
        market: { type: "string", enum: [...marketKeys, "watchlist"] },
        period: { type: "string", enum: heatmapPeriodKeys },
        sizeMode: { type: "string", enum: ["marketCap", "turnover"] },
        thumbnailMode: { type: "boolean" },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute: async (input) => {
      const changes: Record<string, unknown> = {};
      const market = input.market;
      if (market !== undefined) {
        if (typeof market !== "string" || !isHeatmapUniverse(market)) throw new Error(`Unknown market "${String(market)}".`);
        context.actionsRef.current.setMarket(market);
        changes.market = market;
      }
      const period = input.period;
      if (period !== undefined) {
        if (typeof period !== "string" || !isHeatmapPeriodKey(period)) throw new Error(`Unknown period "${String(period)}".`);
        context.actionsRef.current.setPeriod(period);
        changes.period = period;
      }
      const sizeMode = input.sizeMode;
      if (sizeMode !== undefined) {
        if (sizeMode !== "marketCap" && sizeMode !== "turnover") throw new Error(`Unknown sizeMode "${String(sizeMode)}".`);
        context.actionsRef.current.setSizeMode(sizeMode as HeatmapSizeMode);
        changes.sizeMode = sizeMode;
      }
      const thumbnailMode = optionalBoolean(input, "thumbnailMode");
      if (thumbnailMode !== undefined) {
        context.actionsRef.current.setThumbnailMode(thumbnailMode);
        changes.thumbnailMode = thumbnailMode;
      }
      if (Object.keys(changes).length === 0) throw new Error("Provide at least one view property to change.");
      return { success: true, changes };
    },
  };

  const setFiltersTool: WebMcpToolDefinition = {
    name: "set_heatmap_filters",
    title: "Set heatmap filters",
    description:
      "Set board, rising/falling, and percentage-change filters. Omitted values stay unchanged; use an empty boardNames array or trend all to clear filters.",
    inputSchema: {
      type: "object",
      properties: {
        boardNames: { type: "array", items: { type: "string" }, maxItems: 30 },
        trend: { type: "string", enum: ["all", "rising", "falling"] },
        minChangePct: { type: ["number", "null"] },
        maxChangePct: { type: ["number", "null"] },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute: async (input) => {
      const state = context.stateRef.current;
      const changes: Record<string, unknown> = {};
      if (input.boardNames !== undefined) {
        if (!Array.isArray(input.boardNames) || input.boardNames.some((name) => typeof name !== "string")) {
          throw new Error("boardNames must be an array of board name strings.");
        }
        const available = new Set((state.treemapData ?? state.visibleTreemapData)?.nodes.map((board) => board.name) ?? []);
        const boardNames = input.boardNames.map((name) => name.trim()).filter(Boolean);
        const unknown = boardNames.filter((name) => !available.has(name));
        if (unknown.length > 0) throw new Error(`Unknown board name(s): ${unknown.join(", ")}.`);
        context.actionsRef.current.setBoardFilter(boardNames);
        changes.boardNames = boardNames;
      }
      if (input.trend !== undefined) {
        if (input.trend !== "all" && input.trend !== "rising" && input.trend !== "falling") {
          throw new Error(`Unknown trend "${String(input.trend)}".`);
        }
        context.actionsRef.current.setTrendFilter(input.trend as HeatmapTrendFilter);
        changes.trend = input.trend;
      }
      const min = input.minChangePct === undefined ? state.changeRangeFilter.min : input.minChangePct;
      const max = input.maxChangePct === undefined ? state.changeRangeFilter.max : input.maxChangePct;
      if (input.minChangePct !== undefined || input.maxChangePct !== undefined) {
        if (min !== null && (typeof min !== "number" || !Number.isFinite(min))) throw new Error("minChangePct must be a finite number or null.");
        if (max !== null && (typeof max !== "number" || !Number.isFinite(max))) throw new Error("maxChangePct must be a finite number or null.");
        if (typeof min === "number" && typeof max === "number" && min > max) throw new Error("minChangePct cannot be greater than maxChangePct.");
        context.actionsRef.current.setChangeRangeFilter({ min: min as number | null, max: max as number | null });
        changes.minChangePct = min;
        changes.maxChangePct = max;
      }
      if (Object.keys(changes).length === 0) throw new Error("Provide at least one filter property to change.");
      return { success: true, changes };
    },
  };

  const topStocksTool: WebMcpToolDefinition = {
    name: "get_top_stocks",
    title: "Get top stocks",
    description: "List the leading stocks in the currently loaded heatmap by change percentage, turnover, or market-cap area.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 50, default: 10 },
        sortBy: { type: "string", enum: ["changePct", "turnoverAmount", "marketCap"], default: "changePct" },
        direction: { type: "string", enum: ["desc", "asc"], default: "desc" },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute: async (input) => {
      const limit = validateLimit(input, 10, 50);
      const sortBy = input.sortBy ?? "changePct";
      if (sortBy !== "changePct" && sortBy !== "turnoverAmount" && sortBy !== "marketCap") throw new Error(`Unknown sortBy "${String(sortBy)}".`);
      const direction = input.direction ?? "desc";
      if (direction !== "desc" && direction !== "asc") throw new Error(`Unknown direction "${String(direction)}".`);
      const stocks = getCurrentTreemapStocks(context);
      stocks.sort((left, right) => {
        const leftValue = left[sortBy as "changePct" | "turnoverAmount" | "marketCap"];
        const rightValue = right[sortBy as "changePct" | "turnoverAmount" | "marketCap"];
        return (direction === "desc" ? rightValue - leftValue : leftValue - rightValue);
      });
      return {
        ...getDataFreshness(context),
        market: context.stateRef.current.market,
        period: context.stateRef.current.period,
        sortBy,
        direction,
        stocks: stocks.slice(0, limit).map(formatStock),
      };
    },
  };

  const boardRankingsTool: WebMcpToolDefinition = {
    name: "get_board_rankings",
    title: "Get board rankings",
    description: "Rank the industry boards represented in the current heatmap by weighted change, turnover, market cap, or stock count.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 50, default: 10 },
        sortBy: { type: "string", enum: ["changePct", "turnoverAmount", "marketCap", "stockCount"], default: "changePct" },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute: async (input) => {
      const limit = validateLimit(input, 10, 50);
      const sortBy = input.sortBy ?? "changePct";
      if (!["changePct", "turnoverAmount", "marketCap", "stockCount"].includes(String(sortBy))) throw new Error(`Unknown sortBy "${String(sortBy)}".`);
      return {
        ...getDataFreshness(context),
        market: context.stateRef.current.market,
        period: context.stateRef.current.period,
        sortBy,
        boards: getBoardRankings(context, limit, String(sortBy)),
      };
    },
  };

  return [getStateTool, setViewTool, setFiltersTool, topStocksTool, boardRankingsTool];
}
