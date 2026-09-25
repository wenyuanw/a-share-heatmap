import type { ProgressiveQuoteEvent } from "@/lib/market-heatmap";

export type QuoteMap = Record<string, { price: number; changePct: number; turnoverAmount: number }>;

export type QuoteStreamEvent =
  | ProgressiveQuoteEvent
  | {
      type: "error";
      message: string;
    };

export type QuoteLoadProgress = {
  active: boolean;
  loadedCount: number;
  totalCount: number;
};

export type PendingQuoteCommit = {
  quotes: QuoteMap;
  loadedCount: number;
  totalCount: number;
  updatedAt: string;
};

export const inspectorSortKeys = ["changeDesc", "changeAsc", "changeAbs", "turnover", "name"] as const;
export type InspectorSortKey = (typeof inspectorSortKeys)[number];

export type InspectorStockItem = {
  code: string;
  name: string;
  subBoardName: string;
  price: number;
  changePct: number | null;
  turnoverAmount: number;
  marketCap: number;
};

export type StockRect = {
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
  changePct: number | null;
};

export type BoardTrendStats = {
  advanceCount: number;
  flatCount: number;
  declineCount: number;
};

export type SectorVisualStats = BoardTrendStats & {
  changePct: number | null;
};

export type BoardRect = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  stockCount: number;
  titleHeight: number;
  changePct: number | null;
  advanceCount: number;
  flatCount: number;
  declineCount: number;
};

export type SubBoardRect = {
  name: string;
  boardName: string;
  x: number;
  y: number;
  width: number;
  height: number;
  stockCount: number;
  titleHeight: number;
  changePct: number | null;
  advanceCount: number;
  flatCount: number;
  declineCount: number;
};

export type TreemapInput<T> = {
  item: T;
  value: number;
};

export type TreemapRect<T> = {
  item: T;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Bounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type MarketSummary = {
  changePct: number;
  stockCount: number;
  updatedAt: string;
};

export type MarketOverview = {
  advanceCount: number;
  flatCount: number;
  declineCount: number;
  turnoverAmount: number;
  turnoverPreviousAmount: number;
  turnoverDelta: number;
};

export type ScreenshotPreview = {
  url: string;
  filename: string;
  blob: Blob;
};

export type PriceColorMode = "red-rise" | "green-rise";
export type ThemeColorKey = "green" | "red" | "blue" | "violet";
export type DisplayMode = "dark" | "light";
export type FilterOpenMode = "click" | "hover";
export type SettingsTab = "appearance" | "watchlist" | "shortcuts" | "help" | "webmcp" | "project";
export type HeatmapSizeMode = "marketCap" | "turnover";

export type ChangeRangeFilter = {
  min: number | null;
  max: number | null;
};

export type ShareLogoRaster =
  | { kind: "bitmap"; bitmap: ImageBitmap }
  | { kind: "image"; image: HTMLImageElement };

export type CanvasTextLine = {
  text: string;
  font: string;
};
