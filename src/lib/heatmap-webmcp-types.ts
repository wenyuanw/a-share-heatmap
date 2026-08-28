import type {
  HeatmapPeriodKey,
  HeatmapUniverse,
  MarketDataSource,
  HeatmapStockNode,
  TreemapResponse,
} from "@/lib/market-heatmap";
import type { WatchlistItem } from "@/lib/watchlist";
import type { HeatTheme } from "@/lib/heatmap-themes";

export type HeatmapTrendFilter = "all" | "rising" | "falling";
export type HeatmapSizeMode = "marketCap" | "turnover";

export type HeatmapChangeRange = {
  min: number | null;
  max: number | null;
};

export type HeatmapQuote = {
  price: number;
  changePct: number;
  turnoverAmount: number;
};

export type HeatmapWebMcpState = {
  market: HeatmapUniverse;
  period: HeatmapPeriodKey;
  boardFilter: string[];
  trendFilter: HeatmapTrendFilter;
  changeRangeFilter: HeatmapChangeRange;
  sizeMode: HeatmapSizeMode;
  thumbnailMode: boolean;
  headerTrendStats: boolean;
  refreshIntervalSeconds: number;
  heatThemeId: string;
  customHeatThemes: HeatTheme[];
  watchlist: WatchlistItem[];
  treemapData: TreemapResponse | null;
  visibleTreemapData: TreemapResponse | null;
  quotes: Record<string, HeatmapQuote>;
  marketSummaries: Partial<Record<string, { changePct: number; stockCount: number; updatedAt: string }>>;
  dataSource: MarketDataSource | null;
  updatedAt: string;
  loading: boolean;
  error: string | null;
  view: { scale: number; x: number; y: number };
  selectedStockCode: string | null;
  selectedBoardName: string | null;
  selectedSubBoardName: string | null;
};

export type HeatmapWebMcpActions = {
  setMarket: (market: HeatmapUniverse) => void;
  setPeriod: (period: HeatmapPeriodKey) => void;
  setBoardFilter: (boardNames: string[]) => void;
  setTrendFilter: (filter: HeatmapTrendFilter) => void;
  setChangeRangeFilter: (range: HeatmapChangeRange) => void;
  setSizeMode: (mode: HeatmapSizeMode) => void;
  setThumbnailMode: (enabled: boolean) => void;
  setView: (view: { scale: number; x: number; y: number }) => void;
  selectStock: (code: string | null) => void;
  selectBoard: (name: string | null) => void;
  selectSubBoard: (name: string | null) => void;
  retryDataLoad: () => void;
  resetView: () => void;
  createSharePreview: () => Promise<void>;
  addWatchlistItem: (item: WatchlistItem) => boolean;
  removeWatchlistItem: (code: string) => void;
  clearWatchlist: () => void;
  selectTheme: (theme: HeatTheme) => void;
  createTheme: (theme: HeatTheme) => void;
};

export type HeatmapWebMcpContext = {
  stateRef: { current: HeatmapWebMcpState };
  actionsRef: { current: HeatmapWebMcpActions };
};

export function getCurrentTreemapStocks(context: HeatmapWebMcpContext) {
  const data = context.stateRef.current.visibleTreemapData ?? context.stateRef.current.treemapData;
  if (!data) {
    return [];
  }

  return data.nodes.flatMap((board) =>
    board.children.map((stock: HeatmapStockNode) => {
      const quote = context.stateRef.current.quotes[stock.code];
      return {
        ...stock,
        price: quote?.price ?? stock.price,
        changePct: quote?.changePct ?? stock.changePct,
        turnoverAmount: quote?.turnoverAmount ?? stock.turnoverAmount,
        marketCap: stock.value,
      };
    })
  );
}

export function getDataFreshness(context: HeatmapWebMcpContext) {
  const state = context.stateRef.current;
  const data = state.visibleTreemapData ?? state.treemapData;
  return {
    updatedAt: state.updatedAt || data?.updatedAt || "",
    source: state.dataSource ?? data?.source ?? null,
    loading: state.loading,
  };
}
