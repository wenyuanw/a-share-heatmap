"use client";

import { useMemo, useState, type SetStateAction } from "react";

import type { QuoteLoadProgress, QuoteMap } from "@/components/heatmap/types";
import type { MarketDataSource, TreemapResponse } from "@/lib/market-heatmap";

type HeatmapViewData = {
  treemapData: TreemapResponse | null;
  quotes: QuoteMap;
  settledQuotes: QuoteMap;
  quoteLoadProgress: QuoteLoadProgress | null;
  dataSource: MarketDataSource | null;
  updatedAt: string;
  loading: boolean;
  error: string | null;
};

const emptyViewData: HeatmapViewData = {
  treemapData: null,
  quotes: {},
  settledQuotes: {},
  quoteLoadProgress: null,
  dataSource: null,
  updatedAt: "",
  loading: true,
  error: null,
};

// Keep all market/period combinations, plus a few recent watchlist revisions.
// This cache belongs to the mounted heatmap, never to the server or localStorage.
const maxCachedViews = 48;

export function useHeatmapViewData(queryKey: string) {
  const [views, setViews] = useState(() => new Map<string, HeatmapViewData>());
  const setters = useMemo(() => {
    // Bind every asynchronous update to the view that started it. A late response
    // can never put watchlist data (or another period's quotes) into the full map.
    function fieldSetter<K extends keyof HeatmapViewData>(field: K) {
      return (value: SetStateAction<HeatmapViewData[K]>) => {
        setViews((current) => {
          const previous = current.get(queryKey) ?? emptyViewData;
          const nextValue = typeof value === "function" ? value(previous[field]) : value;
          if (Object.is(previous[field], nextValue)) return current;

          const next = new Map(current);
          next.delete(queryKey);
          next.set(queryKey, { ...previous, [field]: nextValue });
          if (next.size > maxCachedViews) next.delete(next.keys().next().value!);
          return next;
        });
      };
    }

    return {
      setTreemapData: fieldSetter("treemapData"),
      setQuotes: fieldSetter("quotes"),
      setSettledQuotes: fieldSetter("settledQuotes"),
      setQuoteLoadProgress: fieldSetter("quoteLoadProgress"),
      setDataSource: fieldSetter("dataSource"),
      setUpdatedAt: fieldSetter("updatedAt"),
      setLoading: fieldSetter("loading"),
      setError: fieldSetter("error"),
    };
  }, [queryKey]);

  const data = views.get(queryKey) ?? emptyViewData;
  return {
    ...data,
    ...setters,
    // Revalidation must not replace a usable cached view with a loading screen.
    loading: data.loading && !data.treemapData,
  };
}
