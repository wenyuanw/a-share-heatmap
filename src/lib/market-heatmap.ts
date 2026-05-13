import fallbackMarketSnapshot from "@/lib/data/market-heatmap-fallback.json";
import subboardSnapshot from "@/lib/data/market-heatmap-subboards.json";

export const marketKeys = ["all", "sse", "szse", "hs300", "zza500", "cyb", "kcb"] as const;

export type MarketKey = (typeof marketKeys)[number];

export const metricKeys = ["1", "2", "3", "4", "5", "6"] as const;

export type MetricKey = (typeof metricKeys)[number];

export const heatmapPeriodKeys = ["day", "week", "month", "year"] as const;

export type HeatmapPeriodKey = (typeof heatmapPeriodKeys)[number];

type MarketDataSource = "direct" | "fallback";
type ExchangeCode = "SH" | "SZ" | "BJ";

type RemoteQuoteValue = {
  price: number;
  changes: Partial<Record<HeatmapPeriodKey, number>>;
  turnoverAmount: number;
};

type QuoteSnapshot = {
  timestamp: number;
  updatedAt: string;
  quotes: Record<string, RemoteQuoteValue>;
  source: "direct";
};

type UpDownDistributionResponse = {
  data?: {
    last_update_time?: string;
    up?: number | string;
    flat?: number | string;
    down?: number | string;
  };
};

type TurnoverResponse = {
  data?: {
    charts?: {
      header?: Array<{
        key?: string;
        val?: number | string;
      }>;
    };
  };
};

type MarketSummarySnapshot = {
  timestamp: number;
  updatedAt: string;
  advanceCount: number;
  flatCount: number;
  declineCount: number;
  turnoverAmount: number;
  turnoverPreviousAmount: number;
  turnoverDelta: number;
  source: "direct";
};

type MarketIndexValue = {
  name: string;
  price: number;
  changes: Partial<Record<HeatmapPeriodKey, number>>;
};

type MarketIndexSnapshot = {
  timestamp: number;
  updatedAt: string;
  summaries: Partial<Record<MarketKey, MarketIndexValue>>;
  source: "direct";
};

type StockSnapshot = {
  code: string;
  exchange: ExchangeCode;
  name: string;
  boardName: string;
  subBoardName: string;
  price: number;
  changePct: number;
  totalMarketCap: number;
  floatMarketCap: number;
  turnoverAmount?: number;
};

export type HeatmapStockNode = {
  code: string;
  name: string;
  boardName: string;
  subBoardName: string;
  value: number;
  exchange: ExchangeCode;
  price: number;
  changePct: number;
};

export type HeatmapBoardNode = {
  code: string;
  name: string;
  value: number;
  stockCount: number;
  children: HeatmapStockNode[];
};

export type TreemapResponse = {
  market: MarketKey;
  period: HeatmapPeriodKey;
  updatedAt: string;
  stockCount: number;
  boardCount: number;
  summary: {
    advanceCount: number;
    flatCount: number;
    declineCount: number;
    turnoverAmount: number;
    turnoverPreviousAmount: number;
    turnoverDelta: number;
    indexChangePct?: number;
  };
  nodes: HeatmapBoardNode[];
  source: MarketDataSource;
};

export type QuoteValue = {
  price: number;
  changePct: number;
};

export type QuotesResponse = {
  market: MarketKey;
  metric?: MetricKey;
  period: HeatmapPeriodKey;
  updatedAt: string;
  quotes: Record<string, QuoteValue>;
  source: MarketDataSource;
};

const sinaQuoteBaseUrl = "https://hq.sinajs.cn/list=";
const eastmoneyQuoteBaseUrl = "https://push2.eastmoney.com/api/qt/ulist.np/get";
const upDownDistributionUrl = "https://dq.10jqka.com.cn/fuyao/up_down_distribution/distribution/v2/realtime";
const turnoverSummaryUrl =
  "https://dq.10jqka.com.cn/fuyao/market_analysis_api/chart/v1/get_chart_data?chart_key=turnover_minute";

const marketIndexSymbols: Record<MarketKey, string> = {
  all: "sz399317", // 国证 A 指：覆盖 A 股整体走势，比用个股池加权更接近“全部 A 股”指数口径。
  sse: "sh000001", // 上证指数：更符合用户查看“上证”大盘涨跌时的通用口径。
  szse: "sz399107", // 深证 A 指
  hs300: "sh000300",
  zza500: "sh000510",
  cyb: "sz399006",
  kcb: "sh000680", // 科创综指，比科创 50 更贴近“科创板”整体口径。
};

const marketIndexSecids: Record<MarketKey, string> = {
  all: "0.399317",
  sse: "1.000001",
  szse: "0.399107",
  hs300: "1.000300",
  zza500: "1.000510",
  cyb: "0.399006",
  kcb: "1.000680",
};

const sinaRequestHeaders = {
  Referer: "https://finance.sina.com.cn/",
  "User-Agent": "Mozilla/5.0 (compatible; AShareHeatmap/1.0)",
  Accept: "*/*",
};

const eastmoneyRequestHeaders = {
  Referer: "https://quote.eastmoney.com/",
  "User-Agent": "Mozilla/5.0 (compatible; AShareHeatmap/1.0)",
  Accept: "application/json, text/plain, */*",
};

const summaryRequestHeaders = {
  Referer: "https://q.10jqka.com.cn/",
  "User-Agent": "Mozilla/5.0 (compatible; AShareHeatmap/1.0)",
  Accept: "application/json, text/plain, */*",
};

const quoteCacheMs = 8_000;
const summaryCacheMs = 8_000;
const sinaBatchSize = 220;
const eastmoneyBatchSize = 180;
const flatThreshold = 0.1;
const eastmoneyQuoteFields = [
  "f2", // latest price
  "f3", // day change
  "f6", // turnover amount
  "f12",
  "f13",
  "f14",
  "f18",
  "f24", // 60-day change, used only as a defensive fallback for month
  "f25", // year-to-date change
  "f109", // 5-trading-day change
  "f110", // 20-trading-day change
  "f124", // quote timestamp
  "f127", // 3-trading-day change
  "f160", // 10-trading-day change
] as const;

const fallbackSnapshotSeed = fallbackMarketSnapshot as {
  updatedAt: string;
  stockCount: number;
  boardCount: number;
  stocks: Array<Omit<StockSnapshot, "subBoardName">>;
};

const subboardSeed = subboardSnapshot as {
  updatedAt: string;
  count: number;
  subboards: Record<string, { sectorName: string; subBoardName: string }>;
};

const baselineStocks: StockSnapshot[] = fallbackSnapshotSeed.stocks.map((stock) => {
  const mapped = subboardSeed.subboards[stock.code];
  return {
    ...stock,
    boardName: mapped?.sectorName ?? stock.boardName,
    subBoardName: mapped?.subBoardName ?? stock.boardName,
  };
});

let quoteCache: QuoteSnapshot | null = null;
let quotePromise: Promise<QuoteSnapshot> | null = null;
let summaryCache: MarketSummarySnapshot | null = null;
let summaryPromise: Promise<MarketSummarySnapshot> | null = null;
let indexCache: MarketIndexSnapshot | null = null;
let indexPromise: Promise<MarketIndexSnapshot> | null = null;
let hasLoggedFallbackWarning = false;

function toNumber(value: number | string | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function toFiniteNumber(value: number | string | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function getChangeForPeriod(
  changes: Partial<Record<HeatmapPeriodKey, number>> | undefined,
  period: HeatmapPeriodKey,
  fallback = 0
) {
  const selected = changes?.[period];
  if (typeof selected === "number" && Number.isFinite(selected)) {
    return selected;
  }

  const day = changes?.day;
  return typeof day === "number" && Number.isFinite(day) ? day : fallback;
}

export function periodFromMetricKey(metric: MetricKey): HeatmapPeriodKey {
  if (metric === "3") {
    return "week";
  }

  if (metric === "4") {
    return "month";
  }

  if (metric === "5" || metric === "6") {
    return "year";
  }

  return "day";
}

function toEastmoneySecid(code: string) {
  const [symbol, exchange] = code.split(".");
  return `${exchange === "SH" ? 1 : 0}.${symbol}`;
}

function parseEastmoneyCode(symbol: number | string | undefined, marketFlag: number | string | undefined) {
  const normalizedSymbol = String(symbol ?? "").trim();
  if (!normalizedSymbol) {
    return null;
  }

  const market = Number(marketFlag) === 1 ? "SH" : /^[489]/.test(normalizedSymbol) ? "BJ" : "SZ";
  return `${normalizedSymbol}.${market}`;
}

function parseEastmoneyTimestamp(value: number | string | undefined) {
  const seconds = toFiniteNumber(value);
  if (!seconds || seconds <= 0) {
    return "";
  }

  return new Date(seconds * 1000).toISOString();
}

function parseShanghaiTimestamp(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return new Date().toISOString();
  }

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return `${trimmed.replace(" ", "T")}+08:00`;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }

  return parsed.toISOString();
}

function parseSinaTimestamp(dateText: string | undefined, timeText: string | undefined) {
  const normalizedDate = String(dateText ?? "").trim();
  const normalizedTime = String(timeText ?? "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate) || !/^\d{2}:\d{2}:\d{2}$/.test(normalizedTime)) {
    return new Date().toISOString();
  }

  return `${normalizedDate}T${normalizedTime}+08:00`;
}

function normalizeValue(value: number) {
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function getStockValue(stock: StockSnapshot) {
  return normalizeValue(stock.floatMarketCap || stock.totalMarketCap || stock.price * 1_000_000);
}

function getStockTurnoverAmount(stock: StockSnapshot) {
  return Number.isFinite(stock.turnoverAmount) && (stock.turnoverAmount ?? 0) > 0 ? stock.turnoverAmount ?? 0 : 0;
}

function estimateFallbackTurnoverAmount(stock: StockSnapshot) {
  const cap = stock.floatMarketCap || stock.totalMarketCap || stock.price * 1_000_000;
  const activityRatio = 0.012 + Math.min(Math.abs(stock.changePct), 10) * 0.002;
  return Math.round(cap * activityRatio);
}

function buildDynamicIndexSets(stocks: StockSnapshot[]) {
  const sortedByCap = [...stocks].sort(
    (left, right) => (right.floatMarketCap || right.totalMarketCap) - (left.floatMarketCap || left.totalMarketCap)
  );

  const hs300Set = new Set(sortedByCap.slice(0, 300).map((stock) => stock.code));
  const zza500Set = new Set(sortedByCap.slice(0, 500).map((stock) => stock.code));

  return { hs300Set, zza500Set };
}

function inMarket(stock: StockSnapshot, market: MarketKey, hs300Set: Set<string>, zza500Set: Set<string>) {
  if (market === "all") {
    return true;
  }

  if (market === "sse") {
    return stock.exchange === "SH";
  }

  if (market === "szse") {
    return stock.exchange === "SZ";
  }

  if (market === "cyb") {
    return stock.exchange === "SZ" && stock.code.startsWith("300");
  }

  if (market === "kcb") {
    return stock.exchange === "SH" && stock.code.startsWith("688");
  }

  if (market === "hs300") {
    return hs300Set.has(stock.code);
  }

  return zza500Set.has(stock.code);
}

function filterStocks(stocks: StockSnapshot[], market: MarketKey) {
  const { hs300Set, zza500Set } = buildDynamicIndexSets(stocks);
  return stocks.filter((stock) => inMarket(stock, market, hs300Set, zza500Set));
}

function toBoardCode(name: string) {
  return name
    .split("")
    .reduce((hash, ch) => ((hash * 33 + ch.charCodeAt(0)) >>> 0), 5381)
    .toString(16)
    .padStart(8, "0");
}

function toSinaSymbol(code: string) {
  const [symbol, exchange] = code.split(".");
  return `${exchange.toLowerCase()}${symbol}`;
}

function parseSinaCode(symbol: string) {
  if (symbol.startsWith("sh")) {
    return `${symbol.slice(2)}.SH`;
  }

  if (symbol.startsWith("sz")) {
    return `${symbol.slice(2)}.SZ`;
  }

  if (symbol.startsWith("bj")) {
    return `${symbol.slice(2)}.BJ`;
  }

  return null;
}

function parseSinaQuoteBatch(rawText: string) {
  const quotes: Record<string, RemoteQuoteValue> = {};
  let updatedAt = "";
  const pattern = /var hq_str_([a-z]{2}\d+)="([^"]*)";/g;

  for (const match of rawText.matchAll(pattern)) {
    const code = parseSinaCode(match[1]);
    if (!code) {
      continue;
    }

    const fields = match[2].split(",");
    if (fields.length < 32) {
      continue;
    }

    const price = toNumber(fields[3]);
    const previousClose = toNumber(fields[2]);
    const turnoverAmount = toNumber(fields[9]);

    if (price <= 0 || previousClose <= 0) {
      continue;
    }

    const changePct = ((price - previousClose) / previousClose) * 100;
    quotes[code] = {
      price,
      changes: {
        day: changePct,
      },
      turnoverAmount,
    };

    if (!updatedAt) {
      updatedAt = parseSinaTimestamp(fields[30], fields[31]);
    }
  }

  return {
    updatedAt: updatedAt || new Date().toISOString(),
    quotes,
  };
}

function parseEastmoneyQuoteBatch(payload: unknown) {
  const quotes: Record<string, RemoteQuoteValue> = {};
  let updatedAt = "";
  const diff = (payload as { data?: { diff?: unknown[] } }).data?.diff;

  if (!Array.isArray(diff)) {
    return {
      updatedAt: new Date().toISOString(),
      quotes,
    };
  }

  for (const item of diff) {
    const row = item as Record<string, number | string | undefined>;
    const code = parseEastmoneyCode(row.f12, row.f13);
    if (!code) {
      continue;
    }

    const price = toFiniteNumber(row.f2) ?? 0;
    const previousClose = toFiniteNumber(row.f18) ?? 0;
    if (price <= 0) {
      continue;
    }

    const dayChangePct =
      toFiniteNumber(row.f3) ?? (previousClose > 0 ? ((price - previousClose) / previousClose) * 100 : 0);
    const weekChangePct = toFiniteNumber(row.f109) ?? dayChangePct;
    const monthChangePct = toFiniteNumber(row.f110) ?? toFiniteNumber(row.f24) ?? dayChangePct;
    const yearChangePct = toFiniteNumber(row.f25) ?? dayChangePct;
    const turnoverAmount = toFiniteNumber(row.f6) ?? 0;

    quotes[code] = {
      price,
      changes: {
        day: dayChangePct,
        week: weekChangePct,
        month: monthChangePct,
        year: yearChangePct,
      },
      turnoverAmount,
    };

    const timestamp = parseEastmoneyTimestamp(row.f124);
    if (timestamp && (!updatedAt || timestamp > updatedAt)) {
      updatedAt = timestamp;
    }
  }

  return {
    updatedAt: updatedAt || new Date().toISOString(),
    quotes,
  };
}

async function fetchSinaQuoteBatch(symbols: string[]) {
  const response = await fetch(`${sinaQuoteBaseUrl}${symbols.join(",")}`, {
    headers: sinaRequestHeaders,
    next: { revalidate: 0 },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Sina quote request failed: ${response.status}`);
  }

  const rawText = Buffer.from(await response.arrayBuffer()).toString("latin1");
  return parseSinaQuoteBatch(rawText);
}

async function fetchEastmoneyQuoteBatch(secids: string[]) {
  const params = new URLSearchParams({
    secids: secids.join(","),
    ut: "bd1d9ddb04089700cf9c27f6f7426281",
    fltt: "2",
    invt: "2",
    fields: eastmoneyQuoteFields.join(","),
  });
  const response = await fetch(`${eastmoneyQuoteBaseUrl}?${params.toString()}`, {
    headers: eastmoneyRequestHeaders,
    next: { revalidate: 0 },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Eastmoney quote request failed: ${response.status}`);
  }

  return parseEastmoneyQuoteBatch(await response.json());
}

function parseSinaIndexBatch(rawText: string) {
  const symbolToMarket = new Map(
    Object.entries(marketIndexSymbols).map(([market, symbol]) => [symbol, market as MarketKey])
  );
  const summaries: Partial<Record<MarketKey, MarketIndexValue>> = {};
  const pattern = /var hq_str_s_([a-z]{2}\d+)="([^"]*)";/g;

  for (const match of rawText.matchAll(pattern)) {
    const market = symbolToMarket.get(match[1]);
    if (!market) {
      continue;
    }

    const fields = match[2].split(",");
    if (fields.length < 4) {
      continue;
    }

    const name = fields[0]?.trim();
    const price = toNumber(fields[1]);
    const changePct = toNumber(fields[3]);

    if (!name || price <= 0 || !Number.isFinite(changePct)) {
      continue;
    }

    summaries[market] = {
      name,
      price,
      changes: {
        day: changePct,
      },
    };
  }

  return summaries;
}

function parseEastmoneyIndexBatch(payload: unknown) {
  const secidToMarket = new Map(
    Object.entries(marketIndexSecids).map(([market, secid]) => [secid, market as MarketKey])
  );
  const summaries: Partial<Record<MarketKey, MarketIndexValue>> = {};
  const diff = (payload as { data?: { diff?: unknown[] } }).data?.diff;

  if (!Array.isArray(diff)) {
    return summaries;
  }

  for (const item of diff) {
    const row = item as Record<string, number | string | undefined>;
    const symbol = String(row.f12 ?? "").trim();
    const marketFlag = Number(row.f13);
    const market = secidToMarket.get(`${marketFlag}.${symbol}`);
    if (!market) {
      continue;
    }

    const name = String(row.f14 ?? "").trim();
    const price = toFiniteNumber(row.f2) ?? 0;
    const dayChangePct = toFiniteNumber(row.f3);

    if (!name || price <= 0 || dayChangePct === null) {
      continue;
    }

    summaries[market] = {
      name,
      price,
      changes: {
        day: dayChangePct,
        week: toFiniteNumber(row.f109) ?? dayChangePct,
        month: toFiniteNumber(row.f110) ?? toFiniteNumber(row.f24) ?? dayChangePct,
        year: toFiniteNumber(row.f25) ?? dayChangePct,
      },
    };
  }

  return summaries;
}

async function fetchEastmoneyMarketIndexSnapshotFromRemote(): Promise<MarketIndexSnapshot> {
  const params = new URLSearchParams({
    secids: Object.values(marketIndexSecids).join(","),
    ut: "bd1d9ddb04089700cf9c27f6f7426281",
    fltt: "2",
    invt: "2",
    fields: eastmoneyQuoteFields.join(","),
  });
  const response = await fetch(`${eastmoneyQuoteBaseUrl}?${params.toString()}`, {
    headers: eastmoneyRequestHeaders,
    next: { revalidate: 0 },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Eastmoney index request failed: ${response.status}`);
  }

  const summaries = parseEastmoneyIndexBatch(await response.json());

  if (Object.keys(summaries).length < marketKeys.length * 0.75) {
    throw new Error("Eastmoney index snapshot is incomplete");
  }

  return {
    timestamp: Date.now(),
    updatedAt: new Date().toISOString(),
    summaries,
    source: "direct",
  };
}

async function fetchSinaMarketIndexSnapshotFromRemote(): Promise<MarketIndexSnapshot> {
  const symbols = Object.values(marketIndexSymbols).map((symbol) => `s_${symbol}`);
  const response = await fetch(`${sinaQuoteBaseUrl}${symbols.join(",")}`, {
    headers: sinaRequestHeaders,
    next: { revalidate: 0 },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Sina index request failed: ${response.status}`);
  }

  const rawText = Buffer.from(await response.arrayBuffer()).toString("latin1");
  const summaries = parseSinaIndexBatch(rawText);

  if (Object.keys(summaries).length < marketKeys.length * 0.75) {
    throw new Error("Sina index snapshot is incomplete");
  }

  return {
    timestamp: Date.now(),
    updatedAt: new Date().toISOString(),
    summaries,
    source: "direct",
  };
}

async function fetchMarketIndexSnapshotFromRemote(): Promise<MarketIndexSnapshot> {
  try {
    return await fetchEastmoneyMarketIndexSnapshotFromRemote();
  } catch {
    return fetchSinaMarketIndexSnapshotFromRemote();
  }
}

async function fetchQuoteSnapshotFromRemote(): Promise<QuoteSnapshot> {
  const secids = baselineStocks.map((stock) => toEastmoneySecid(stock.code));
  const eastmoneyBatches: string[][] = [];

  for (let index = 0; index < secids.length; index += eastmoneyBatchSize) {
    eastmoneyBatches.push(secids.slice(index, index + eastmoneyBatchSize));
  }

  try {
    const eastmoneyResults = await Promise.all(
      eastmoneyBatches.map((batch) => fetchEastmoneyQuoteBatch(batch))
    );
    const eastmoneyQuotes: Record<string, RemoteQuoteValue> = {};
    let eastmoneyUpdatedAt = "";

    for (const result of eastmoneyResults) {
      Object.assign(eastmoneyQuotes, result.quotes);
      if (result.updatedAt && (!eastmoneyUpdatedAt || result.updatedAt > eastmoneyUpdatedAt)) {
        eastmoneyUpdatedAt = result.updatedAt;
      }
    }

    if (Object.keys(eastmoneyQuotes).length < baselineStocks.length * 0.9) {
      throw new Error("Eastmoney quote snapshot is incomplete");
    }

    return {
      timestamp: Date.now(),
      updatedAt: eastmoneyUpdatedAt || new Date().toISOString(),
      quotes: eastmoneyQuotes,
      source: "direct",
    };
  } catch {
    // Sina remains a day-change fallback so the map can still render if Eastmoney is temporarily unavailable.
  }

  const symbols = baselineStocks.map((stock) => toSinaSymbol(stock.code));
  const batches: string[][] = [];

  for (let index = 0; index < symbols.length; index += sinaBatchSize) {
    batches.push(symbols.slice(index, index + sinaBatchSize));
  }

  const results = await Promise.all(batches.map((batch) => fetchSinaQuoteBatch(batch)));
  const quotes: Record<string, RemoteQuoteValue> = {};
  let updatedAt = "";

  for (const result of results) {
    Object.assign(quotes, result.quotes);
    if (result.updatedAt && (!updatedAt || result.updatedAt > updatedAt)) {
      updatedAt = result.updatedAt;
    }
  }

  if (Object.keys(quotes).length < baselineStocks.length * 0.9) {
    throw new Error("Sina quote snapshot is incomplete");
  }

  return {
    timestamp: Date.now(),
    updatedAt: updatedAt || new Date().toISOString(),
    quotes,
    source: "direct",
  };
}

async function getMarketIndexSnapshot() {
  const now = Date.now();

  if (indexCache && now - indexCache.timestamp < quoteCacheMs) {
    return indexCache;
  }

  if (indexPromise) {
    return indexPromise;
  }

  indexPromise = fetchMarketIndexSnapshotFromRemote()
    .then((snapshot) => {
      indexCache = snapshot;
      return snapshot;
    })
    .catch((error) => {
      if (indexCache) {
        return indexCache;
      }

      throw error;
    })
    .finally(() => {
      indexPromise = null;
    });

  return indexPromise;
}

async function getQuoteSnapshot() {
  const now = Date.now();

  if (quoteCache && now - quoteCache.timestamp < quoteCacheMs) {
    return quoteCache;
  }

  if (quotePromise) {
    return quotePromise;
  }

  quotePromise = fetchQuoteSnapshotFromRemote()
    .then((snapshot) => {
      quoteCache = snapshot;
      return snapshot;
    })
    .catch((error) => {
      if (quoteCache) {
        return quoteCache;
      }

      throw error;
    })
    .finally(() => {
      quotePromise = null;
    });

  return quotePromise;
}

async function fetchMarketSummaryFromRemote(): Promise<MarketSummarySnapshot> {
  const [distributionResponse, turnoverResponse] = await Promise.all([
    fetch(upDownDistributionUrl, {
      headers: summaryRequestHeaders,
      next: { revalidate: 0 },
      cache: "no-store",
    }),
    fetch(turnoverSummaryUrl, {
      headers: summaryRequestHeaders,
      next: { revalidate: 0 },
      cache: "no-store",
    }),
  ]);

  if (!distributionResponse.ok) {
    throw new Error(`Up/down summary request failed: ${distributionResponse.status}`);
  }

  if (!turnoverResponse.ok) {
    throw new Error(`Turnover summary request failed: ${turnoverResponse.status}`);
  }

  const distribution = (await distributionResponse.json()) as UpDownDistributionResponse;
  const turnover = (await turnoverResponse.json()) as TurnoverResponse;
  const turnoverAmount = toNumber(
    turnover.data?.charts?.header?.find((item) => item.key === "turnover")?.val
  );
  const turnoverPreviousAmount = toNumber(
    turnover.data?.charts?.header?.find((item) => item.key === "turnover_pre")?.val
  );
  const turnoverDelta = toNumber(
    turnover.data?.charts?.header?.find((item) => item.key === "turnover_change")?.val
  );

  return {
    timestamp: Date.now(),
    updatedAt: parseShanghaiTimestamp(distribution.data?.last_update_time),
    advanceCount: toNumber(distribution.data?.up),
    flatCount: toNumber(distribution.data?.flat),
    declineCount: toNumber(distribution.data?.down),
    turnoverAmount,
    turnoverPreviousAmount,
    turnoverDelta,
    source: "direct",
  };
}

async function getMarketSummary() {
  const now = Date.now();

  if (summaryCache && now - summaryCache.timestamp < summaryCacheMs) {
    return summaryCache;
  }

  if (summaryPromise) {
    return summaryPromise;
  }

  summaryPromise = fetchMarketSummaryFromRemote()
    .then((snapshot) => {
      summaryCache = snapshot;
      return snapshot;
    })
    .catch((error) => {
      if (summaryCache) {
        return summaryCache;
      }

      throw error;
    })
    .finally(() => {
      summaryPromise = null;
    });

  return summaryPromise;
}

function buildNodesFromStocks(
  stocks: StockSnapshot[],
  liveQuotes: Record<string, RemoteQuoteValue>,
  period: HeatmapPeriodKey
) {
  const boardMap = new Map<string, HeatmapStockNode[]>();

  for (const stock of stocks) {
    const current = boardMap.get(stock.boardName) ?? [];
    const quote = liveQuotes[stock.code];

    current.push({
      code: stock.code,
      name: stock.name,
      boardName: stock.boardName,
      subBoardName: stock.subBoardName,
      value: getStockValue(stock),
      exchange: stock.exchange,
      price: quote?.price ?? stock.price,
      changePct: getChangeForPeriod(quote?.changes, period, stock.changePct),
    });

    boardMap.set(stock.boardName, current);
  }

  return Array.from(boardMap.entries())
    .map(([name, children]) => {
      children.sort((left, right) => right.value - left.value);
      const total = children.reduce((sum, stock) => sum + stock.value, 0);

      return {
        code: toBoardCode(name),
        name,
        value: total,
        stockCount: children.length,
        children,
      };
    })
    .sort((left, right) => right.value - left.value);
}

function summarizeStocks(
  stocks: StockSnapshot[],
  liveQuotes: Record<string, RemoteQuoteValue>,
  period: HeatmapPeriodKey
) {
  let advanceCount = 0;
  let flatCount = 0;
  let declineCount = 0;
  let turnoverAmount = 0;

  for (const stock of stocks) {
    const quote = liveQuotes[stock.code];
    const changePct = getChangeForPeriod(quote?.changes, period, stock.changePct);

    if (changePct > flatThreshold) {
      advanceCount += 1;
    } else if (changePct < -flatThreshold) {
      declineCount += 1;
    } else {
      flatCount += 1;
    }

    turnoverAmount += quote?.turnoverAmount ?? getStockTurnoverAmount(stock);
  }

  return {
    advanceCount,
    flatCount,
    declineCount,
    turnoverAmount,
    turnoverPreviousAmount: 0,
    turnoverDelta: 0,
  };
}

function weightedChangePct(
  stocks: StockSnapshot[],
  liveQuotes: Record<string, RemoteQuoteValue>,
  period: HeatmapPeriodKey
) {
  let weightedSum = 0;
  let totalValue = 0;

  for (const stock of stocks) {
    const value = getStockValue(stock);
    const quote = liveQuotes[stock.code];
    const changePct = getChangeForPeriod(quote?.changes, period, stock.changePct);
    weightedSum += changePct * value;
    totalValue += value;
  }

  return totalValue > 0 ? weightedSum / totalValue : 0;
}

function getFallbackSnapshot() {
  return baselineStocks.map((stock) => ({
    ...stock,
    turnoverAmount: estimateFallbackTurnoverAmount(stock),
  }));
}

function getFallbackTreemapData(
  market: MarketKey,
  period: HeatmapPeriodKey,
  indexChangePct?: number
): TreemapResponse {
  const snapshot = getFallbackSnapshot();
  const marketStocks = filterStocks(snapshot, market);
  const nodes = buildNodesFromStocks(marketStocks, {}, period);
  const fallbackIndexChangePct = weightedChangePct(marketStocks, {}, period);

  return {
    market,
    period,
    updatedAt: fallbackSnapshotSeed.updatedAt,
    stockCount: marketStocks.length,
    boardCount: nodes.length,
    summary: {
      ...summarizeStocks(marketStocks, {}, period),
      indexChangePct: Number.isFinite(indexChangePct) ? indexChangePct : fallbackIndexChangePct,
    },
    nodes,
    source: "fallback",
  };
}

function getFallbackQuoteData(
  market: MarketKey,
  period: HeatmapPeriodKey,
  metric?: MetricKey
): QuotesResponse {
  const snapshot = getFallbackSnapshot();
  const marketStocks = filterStocks(snapshot, market);
  const quotes: Record<string, QuoteValue> = {};

  for (const stock of marketStocks) {
    quotes[stock.code] = {
      price: stock.price,
      changePct: stock.changePct,
    };
  }

  return {
    market,
    period,
    metric,
    updatedAt: fallbackSnapshotSeed.updatedAt,
    quotes,
    source: "fallback",
  };
}

export function isMarketKey(value: string): value is MarketKey {
  return marketKeys.includes(value as MarketKey);
}

export function isMetricKey(value: string): value is MetricKey {
  return metricKeys.includes(value as MetricKey);
}

export function isHeatmapPeriodKey(value: string): value is HeatmapPeriodKey {
  return heatmapPeriodKeys.includes(value as HeatmapPeriodKey);
}

export async function getTreemapData(
  market: MarketKey,
  period: HeatmapPeriodKey = "day"
): Promise<TreemapResponse> {
  const [quoteResult, summaryResult, indexResult] = await Promise.allSettled([
    getQuoteSnapshot(),
    getMarketSummary(),
    getMarketIndexSnapshot(),
  ]);
  const remoteIndexSummary =
    indexResult.status === "fulfilled" ? indexResult.value.summaries[market] : null;
  const remoteIndexChangePct = getChangeForPeriod(remoteIndexSummary?.changes, period, Number.NaN);

  if (quoteResult.status !== "fulfilled") {
    if (!hasLoggedFallbackWarning) {
      console.warn("Falling back to bundled market heatmap snapshot:", {
        quotes: quoteResult.reason,
      });
      hasLoggedFallbackWarning = true;
    }

    return getFallbackTreemapData(market, period, remoteIndexChangePct);
  }

  hasLoggedFallbackWarning = false;

  const marketStocks = filterStocks(baselineStocks, market);
  const nodes = buildNodesFromStocks(marketStocks, quoteResult.value.quotes, period);
  const computedSummary = summarizeStocks(marketStocks, quoteResult.value.quotes, period);
  const computedIndexChangePct = weightedChangePct(marketStocks, quoteResult.value.quotes, period);
  const remoteSummary = summaryResult.status === "fulfilled" ? summaryResult.value : null;

  return {
    market,
    period,
    updatedAt: remoteSummary?.updatedAt ?? quoteResult.value.updatedAt,
    stockCount: marketStocks.length,
    boardCount: nodes.length,
    summary: {
      advanceCount:
        market === "all" && period === "day" && remoteSummary
          ? remoteSummary.advanceCount
          : computedSummary.advanceCount,
      flatCount:
        market === "all" && period === "day" && remoteSummary ? remoteSummary.flatCount : computedSummary.flatCount,
      declineCount:
        market === "all" && period === "day" && remoteSummary
          ? remoteSummary.declineCount
          : computedSummary.declineCount,
      turnoverAmount: market === "all" && remoteSummary ? remoteSummary.turnoverAmount : computedSummary.turnoverAmount,
      turnoverPreviousAmount:
        market === "all" && remoteSummary ? remoteSummary.turnoverPreviousAmount : computedSummary.turnoverPreviousAmount,
      turnoverDelta: market === "all" && remoteSummary ? remoteSummary.turnoverDelta : computedSummary.turnoverDelta,
      indexChangePct: Number.isFinite(remoteIndexChangePct) ? remoteIndexChangePct : computedIndexChangePct,
    },
    nodes,
    source: "direct",
  };
}

export async function getQuoteData(
  market: MarketKey,
  period: HeatmapPeriodKey = "day",
  metric?: MetricKey
): Promise<QuotesResponse> {
  const quoteResult = await Promise.allSettled([getQuoteSnapshot()]);

  if (quoteResult[0].status !== "fulfilled") {
    if (!hasLoggedFallbackWarning) {
      console.warn("Falling back to bundled market heatmap quotes:", {
        quotes: quoteResult[0].reason,
      });
      hasLoggedFallbackWarning = true;
    }

    return getFallbackQuoteData(market, period, metric);
  }

  hasLoggedFallbackWarning = false;

  const marketStocks = filterStocks(baselineStocks, market);
  const quotes: Record<string, QuoteValue> = {};

  for (const stock of marketStocks) {
    const quote = quoteResult[0].value.quotes[stock.code];
    quotes[stock.code] = {
      price: quote?.price ?? stock.price,
      changePct: getChangeForPeriod(quote?.changes, period, stock.changePct),
    };
  }

  return {
    market,
    period,
    metric,
    updatedAt: quoteResult[0].value.updatedAt,
    quotes,
    source: "direct",
  };
}
