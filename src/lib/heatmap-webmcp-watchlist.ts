import { resolveStocksByCodes, searchStocks } from "@/lib/market-heatmap";
import { watchlistMaxCount, type HeatmapPeriodKey } from "@/lib/market-heatmap";
import {
  type HeatmapWebMcpContext,
} from "@/lib/heatmap-webmcp-types";
import type { WatchlistItem } from "@/lib/watchlist";

function validateLimit(input: Record<string, unknown>, fallback: number, max: number) {
  const raw = input.limit;
  if (raw === undefined) return fallback;
  if (typeof raw !== "number" || !Number.isInteger(raw) || raw < 1 || raw > max) {
    throw new Error(`limit must be an integer between 1 and ${max}.`);
  }
  return raw;
}

function resolveWatchlistItem(input: Record<string, unknown>): WatchlistItem {
  const code = typeof input.code === "string" ? input.code.trim() : "";
  const query = typeof input.query === "string" ? input.query.trim() : "";
  if ((code && query) || (!code && !query)) {
    throw new Error("Provide either code or query, not both.");
  }

  if (code) {
    const matches = resolveStocksByCodes([code]);
    if (matches.length === 0) throw new Error(`Stock code "${code}" was not found.`);
    if (matches.length > 1) throw new Error(`Stock code "${code}" is ambiguous; use a code with .SH, .SZ, or .BJ.`);
    const stock = matches[0];
    return {
      code: stock.code,
      name: stock.name,
      boardName: stock.boardName,
      subBoardName: stock.subBoardName,
      exchange: stock.exchange,
    };
  }

  const matches = searchStocks(query, 8);
  if (matches.length === 0) throw new Error(`No stock matched query "${query}".`);
  if (matches.length > 1 && !matches.some((stock) => stock.name === query || stock.code === query.toUpperCase())) {
    throw new Error(`Query "${query}" matched multiple stocks; call search_stocks first and use an exact code.`);
  }
  const stock = matches.find((item) => item.name === query || item.code === query.toUpperCase()) ?? matches[0];
  return stock;
}

async function loadWatchlistQuotes(context: HeatmapWebMcpContext, period: HeatmapPeriodKey) {
  const state = context.stateRef.current;
  const codes = state.watchlist.map((item) => item.code);
  if (codes.length === 0) return { quotes: {}, updatedAt: "", source: null };

  try {
    const response = await fetch(`/api/heatmap/quotes?period=${period}&codes=${encodeURIComponent(codes.join(","))}`);
    if (!response.ok) throw new Error(`Quote request failed with status ${response.status}.`);
    const payload = (await response.json()) as {
      updatedAt?: string;
      source?: string;
      quotes?: Record<string, { price: number; changePct: number; turnoverAmount: number }>;
    };
    return {
      quotes: payload.quotes ?? {},
      updatedAt: payload.updatedAt ?? "",
      source: payload.source ?? null,
    };
  } catch {
    return {
      quotes: state.quotes,
      updatedAt: state.updatedAt,
      source: state.dataSource,
    };
  }
}

export function createHeatmapWatchlistWebMcpTools(context: HeatmapWebMcpContext): WebMcpToolDefinition[] {
  const searchTool: WebMcpToolDefinition = {
    name: "search_stocks",
    title: "Search stocks",
    description: "Search the A-share stock directory by name or code before adding a stock to the local watchlist.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", minLength: 1, description: "A Chinese stock name or six-digit stock code." },
        limit: { type: "integer", minimum: 1, maximum: 20, default: 8 },
      },
      required: ["query"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute: async (input) => {
      if (typeof input.query !== "string" || !input.query.trim()) throw new Error("query must be a non-empty string.");
      const limit = validateLimit(input, 8, 20);
      return { query: input.query.trim(), matches: searchStocks(input.query, limit) };
    },
  };

  const getTool: WebMcpToolDefinition = {
    name: "get_watchlist",
    title: "Get watchlist",
    description: "Read the stocks saved in the local A-share watchlist, with the latest available quotes when possible.",
    inputSchema: {
      type: "object",
      properties: { includeQuotes: { type: "boolean", default: true } },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute: async (input) => {
      const state = context.stateRef.current;
      const includeQuotes = input.includeQuotes === undefined ? true : input.includeQuotes;
      if (typeof includeQuotes !== "boolean") throw new Error("includeQuotes must be a boolean.");
      const quoteData = includeQuotes ? await loadWatchlistQuotes(context, state.period) : { quotes: {}, updatedAt: "", source: null };
      return {
        count: state.watchlist.length,
        maxCount: watchlistMaxCount,
        items: state.watchlist.map((item) => ({
          ...item,
          quote: quoteData.quotes[item.code] ?? null,
        })),
        quoteUpdatedAt: quoteData.updatedAt,
        quoteSource: quoteData.source,
      };
    },
  };

  const addTool: WebMcpToolDefinition = {
    name: "add_to_watchlist",
    title: "Add stock to watchlist",
    description: "Add one A-share stock to the locally persisted watchlist by exact code or an unambiguous name query.",
    inputSchema: {
      type: "object",
      oneOf: [
        { type: "object", properties: { code: { type: "string" } }, required: ["code"], additionalProperties: false },
        { type: "object", properties: { query: { type: "string" } }, required: ["query"], additionalProperties: false },
      ],
    },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute: async (input) => {
      const state = context.stateRef.current;
      const item = resolveWatchlistItem(input);
      if (state.watchlist.some((current) => current.code === item.code)) {
        throw new Error(`${item.name} (${item.code}) is already in the watchlist.`);
      }
      if (state.watchlist.length >= watchlistMaxCount) throw new Error(`The watchlist is full; it can contain at most ${watchlistMaxCount} stocks.`);
      if (!context.actionsRef.current.addWatchlistItem(item)) throw new Error(`Unable to add ${item.name} to the watchlist.`);
      context.stateRef.current.watchlist = [...state.watchlist, item];
      return { success: true, item, count: context.stateRef.current.watchlist.length };
    },
  };

  const removeTool: WebMcpToolDefinition = {
    name: "remove_from_watchlist",
    title: "Remove stock from watchlist",
    description: "Remove one stock from the local watchlist by its exact exchange-qualified code when possible.",
    inputSchema: {
      type: "object",
      properties: { code: { type: "string", description: "For example 600519.SH or 000001.SZ." } },
      required: ["code"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute: async (input) => {
      if (typeof input.code !== "string" || !input.code.trim()) throw new Error("code must be a non-empty string.");
      const code = input.code.trim().toUpperCase();
      const state = context.stateRef.current;
      const item = state.watchlist.find((current) => current.code === code);
      if (!item) throw new Error(`Stock "${code}" is not in the watchlist.`);
      context.actionsRef.current.removeWatchlistItem(code);
      context.stateRef.current.watchlist = state.watchlist.filter((current) => current.code !== code);
      return { success: true, removed: item, count: context.stateRef.current.watchlist.length };
    },
  };

  const clearTool: WebMcpToolDefinition = {
    name: "clear_watchlist",
    title: "Clear watchlist",
    description: "Remove every stock from the local watchlist. This requires confirm=true because it affects saved local data.",
    inputSchema: {
      type: "object",
      properties: { confirm: { type: "boolean", const: true, description: "Must be true to clear the watchlist." } },
      required: ["confirm"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: true, untrustedContentHint: false },
    execute: async (input) => {
      if (input.confirm !== true) throw new Error("Clearing the watchlist requires confirm=true.");
      const count = context.stateRef.current.watchlist.length;
      if (count === 0) return { success: true, removedCount: 0, count: 0 };
      context.actionsRef.current.clearWatchlist();
      context.stateRef.current.watchlist = [];
      return { success: true, removedCount: count, count: 0 };
    },
  };

  return [searchTool, getTool, addTool, removeTool, clearTool];
}
