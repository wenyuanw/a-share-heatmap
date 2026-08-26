import fallbackMarketSnapshot from "@/lib/data/market-heatmap-fallback.json";
import subboardSnapshot from "@/lib/data/market-heatmap-subboards.json";
import {
  getZza50ConstituentSnapshot,
  getZza50ConstituentStatus,
  type Zza50ConstituentStatus,
} from "@/lib/market-constituents";

export const marketKeys = ["all", "sse", "szse", "hs300", "zza50", "zza500", "main", "cyb", "kcb"] as const;

export type MarketKey = (typeof marketKeys)[number];

export const watchlistUniverseKey = "watchlist" as const;

export type HeatmapUniverse = MarketKey | typeof watchlistUniverseKey;

export const watchlistMaxCount = 80;

export const metricKeys = ["1", "2", "3", "4", "5", "6"] as const;

export type MetricKey = (typeof metricKeys)[number];

export const heatmapPeriodKeys = ["day", "week", "month", "year"] as const;

export type HeatmapPeriodKey = (typeof heatmapPeriodKeys)[number];

export type MarketDataSource = "direct" | "fallback" | "stale";
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
  turnoverAmount: number;
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
  turnoverAmount: number;
};

export type QuotesResponse = {
  market: MarketKey;
  metric?: MetricKey;
  period: HeatmapPeriodKey;
  updatedAt: string;
  quotes: Record<string, QuoteValue>;
  source: MarketDataSource;
};

export type MarketOverviewItem = {
  market: MarketKey;
  changePct: number;
  stockCount: number;
  updatedAt: string;
};

export type MarketOverviewResponse = {
  period: HeatmapPeriodKey;
  updatedAt: string;
  markets: MarketOverviewItem[];
  source: MarketDataSource;
};

const sinaQuoteBaseUrl = "https://hq.sinajs.cn/list=";
// 多周期涨跌优先走 clist；ulist 作为同字段备份。push2 主站常空响应，优先 push2delay。
const eastmoneyClistHosts = [
  "push2delay.eastmoney.com",
  "82.push2.eastmoney.com",
  "7.push2.eastmoney.com",
  "48.push2.eastmoney.com",
  "push2.eastmoney.com",
] as const;
const eastmoneyAsharesFs = "m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23,m:0+t:81+s:2048";
const eastmoneyIndexFs = "m:0+t:5,m:1+t:1";
const upDownDistributionUrl = "https://dq.10jqka.com.cn/fuyao/up_down_distribution/distribution/v2/realtime";
const turnoverSummaryUrl =
  "https://dq.10jqka.com.cn/fuyao/market_analysis_api/chart/v1/get_chart_data?chart_key=turnover_minute";

const marketIndexSymbols: Partial<Record<MarketKey, string>> = {
  all: "sz399317", // 国证 A 指：覆盖 A 股整体走势，比用个股池加权更接近“全部 A 股”指数口径。
  sse: "sh000001", // 上证指数：更符合用户查看“上证”大盘涨跌时的通用口径。
  szse: "sz399107", // 深证 A 指
  hs300: "sh000300",
  zza50: "zz930050", // 中证 A50：采用中证指数口径，聚焦各行业龙头。
  zza500: "sh000510",
  // 沪深主板没有单一权威全市场指数，侧栏涨跌回退到成分股市值加权。
  cyb: "sz399006",
  kcb: "sh000680", // 科创综指，比科创 50 更贴近“科创板”整体口径。
};

const marketIndexSecids: Partial<Record<MarketKey, string>> = {
  all: "0.399317",
  sse: "1.000001",
  szse: "0.399107",
  hs300: "1.000300",
  zza50: "2.930050",
  zza500: "1.000510",
  cyb: "0.399006",
  kcb: "1.000680",
};

const marketIndexCount = Object.keys(marketIndexSymbols).length;

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
const eastmoneyClistPageSize = 100;
const eastmoneyClistConcurrency = 4;
const eastmoneyClistMaxAttempts = 4;
const eastmoneyUlistBatchSize = 180;
const eastmoneyUlistConcurrency = 4;
const eastmoneyUlistMaxAttempts = 4;
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

function parseEastmoneyCode(symbol: number | string | undefined, marketFlag: number | string | undefined) {
  const normalizedSymbol = String(symbol ?? "").trim();
  if (!normalizedSymbol) {
    return null;
  }

  const market = Number(marketFlag) === 1 ? "SH" : /^[489]/.test(normalizedSymbol) ? "BJ" : "SZ";
  return `${normalizedSymbol}.${market}`;
}

function toEastmoneySecid(code: string) {
  const [symbol, exchange] = code.split(".");
  return `${exchange === "SH" ? 1 : 0}.${symbol}`;
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

  const zza50FallbackSet = new Set(sortedByCap.slice(0, 50).map((stock) => stock.code));
  const hs300Set = new Set(sortedByCap.slice(0, 300).map((stock) => stock.code));
  const zza500Set = new Set(sortedByCap.slice(0, 500).map((stock) => stock.code));

  return { zza50FallbackSet, hs300Set, zza500Set };
}

function inMarket(
  stock: StockSnapshot,
  market: MarketKey,
  zza50Set: Set<string>,
  hs300Set: Set<string>,
  zza500Set: Set<string>
) {
  if (market === "all") {
    return true;
  }

  if (market === "sse") {
    return stock.exchange === "SH";
  }

  if (market === "szse") {
    return stock.exchange === "SZ";
  }

  if (market === "main") {
    // 沪深主板：排除创业板（30x）、科创板（688/689）和北交所。
    if (stock.exchange === "BJ") {
      return false;
    }

    if (stock.exchange === "SH" && (stock.code.startsWith("688") || stock.code.startsWith("689"))) {
      return false;
    }

    if (stock.exchange === "SZ" && stock.code.startsWith("30")) {
      return false;
    }

    return stock.exchange === "SH" || stock.exchange === "SZ";
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

  if (market === "zza50") {
    return zza50Set.has(stock.code);
  }

  return zza500Set.has(stock.code);
}

// `baselineStocks` is module-level immutable, so derived index sets and per-market
// filtered slices can be precomputed once instead of on every request.
const {
  zza50FallbackSet: baselineZza50FallbackSet,
  hs300Set: baselineHs300Set,
  zza500Set: baselineZza500Set,
} = buildDynamicIndexSets(baselineStocks);
const baselineStockCodeSet = new Set(baselineStocks.map((stock) => stock.code));
const baselineStockByCode = new Map(baselineStocks.map((stock) => [stock.code, stock]));
const baselineStocksBySymbol = new Map<string, StockSnapshot[]>();

for (const stock of baselineStocks) {
  const symbol = stock.code.split(".")[0];
  const list = baselineStocksBySymbol.get(symbol) ?? [];
  list.push(stock);
  baselineStocksBySymbol.set(symbol, list);
}
const staticStocksByMarket: Record<Exclude<MarketKey, "zza50">, StockSnapshot[]> = {
  all: baselineStocks,
  sse: baselineStocks.filter((stock) =>
    inMarket(stock, "sse", baselineZza50FallbackSet, baselineHs300Set, baselineZza500Set)
  ),
  szse: baselineStocks.filter((stock) =>
    inMarket(stock, "szse", baselineZza50FallbackSet, baselineHs300Set, baselineZza500Set)
  ),
  hs300: baselineStocks.filter((stock) =>
    inMarket(stock, "hs300", baselineZza50FallbackSet, baselineHs300Set, baselineZza500Set)
  ),
  zza500: baselineStocks.filter((stock) =>
    inMarket(stock, "zza500", baselineZza50FallbackSet, baselineHs300Set, baselineZza500Set)
  ),
  main: baselineStocks.filter((stock) =>
    inMarket(stock, "main", baselineZza50FallbackSet, baselineHs300Set, baselineZza500Set)
  ),
  cyb: baselineStocks.filter((stock) =>
    inMarket(stock, "cyb", baselineZza50FallbackSet, baselineHs300Set, baselineZza500Set)
  ),
  kcb: baselineStocks.filter((stock) =>
    inMarket(stock, "kcb", baselineZza50FallbackSet, baselineHs300Set, baselineZza500Set)
  ),
};

async function getZza50Set(stocks: StockSnapshot[], fallbackSet: Set<string>) {
  const allowedCodes = new Set(stocks.map((stock) => stock.code));
  const snapshot = await getZza50ConstituentSnapshot({
    allowedCodes: stocks === baselineStocks ? baselineStockCodeSet : allowedCodes,
  });

  if (snapshot.count > 0) {
    return new Set(snapshot.codes);
  }

  return fallbackSet;
}

async function filterStocks(stocks: StockSnapshot[], market: MarketKey) {
  if (market !== "zza50" && stocks === baselineStocks) {
    return staticStocksByMarket[market];
  }

  const { zza50FallbackSet, hs300Set, zza500Set } = buildDynamicIndexSets(stocks);
  const zza50Set = market === "zza50" ? await getZza50Set(stocks, zza50FallbackSet) : zza50FallbackSet;

  return stocks.filter((stock) => inMarket(stock, market, zza50Set, hs300Set, zza500Set));
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
) {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (true) {
        const current = nextIndex;
        nextIndex += 1;
        if (current >= items.length) {
          return;
        }

        results[current] = await worker(items[current], current);
      }
    })
  );

  return results;
}

async function fetchEastmoneyClistPage(fs: string, page: number, pageSize = eastmoneyClistPageSize) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= eastmoneyClistMaxAttempts; attempt += 1) {
    // Prefer push2delay on first attempt; only rotate to other mirrors on retry.
    const host = eastmoneyClistHosts[(attempt - 1) % eastmoneyClistHosts.length];
    const params = new URLSearchParams({
      pn: String(page),
      pz: String(pageSize),
      po: "1",
      np: "1",
      ut: "bd1d9ddb04089700cf9c27f6f7426281",
      fltt: "2",
      invt: "2",
      fid: "f12",
      fs,
      fields: eastmoneyQuoteFields.join(","),
    });

    try {
      const response = await fetch(`https://${host}/api/qt/clist/get?${params.toString()}`, {
        headers: eastmoneyRequestHeaders,
        next: { revalidate: 0 },
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        throw new Error(`Eastmoney clist request failed: ${response.status}`);
      }

      const payload = await response.json();
      if (!Array.isArray((payload as { data?: { diff?: unknown[] } }).data?.diff)) {
        throw new Error("Eastmoney clist payload is invalid");
      }

      return payload;
    } catch (error) {
      lastError = error;
      await sleep(120 * attempt * attempt);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Eastmoney clist request failed");
}

async function fetchEastmoneyUlistBatch(secids: string[]) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= eastmoneyUlistMaxAttempts; attempt += 1) {
    const host = eastmoneyClistHosts[(attempt - 1) % eastmoneyClistHosts.length];
    const params = new URLSearchParams({
      secids: secids.join(","),
      ut: "bd1d9ddb04089700cf9c27f6f7426281",
      fltt: "2",
      invt: "2",
      fields: eastmoneyQuoteFields.join(","),
    });

    try {
      const response = await fetch(`https://${host}/api/qt/ulist.np/get?${params.toString()}`, {
        headers: eastmoneyRequestHeaders,
        next: { revalidate: 0 },
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        throw new Error(`Eastmoney ulist request failed: ${response.status}`);
      }

      const payload = await response.json();
      if (!Array.isArray((payload as { data?: { diff?: unknown[] } }).data?.diff)) {
        throw new Error("Eastmoney ulist payload is invalid");
      }

      return payload;
    } catch (error) {
      lastError = error;
      await sleep(120 * attempt * attempt);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Eastmoney ulist request failed");
}

async function fetchEastmoneyClistPages(fs: string) {
  const firstPayload = await fetchEastmoneyClistPage(fs, 1);
  const total = toFiniteNumber((firstPayload as { data?: { total?: number | string } }).data?.total) ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / eastmoneyClistPageSize));
  const pageNumbers = Array.from({ length: pageCount }, (_, index) => index + 1);
  const payloads = await mapWithConcurrency(pageNumbers, eastmoneyClistConcurrency, async (page) => {
    if (page === 1) {
      return firstPayload;
    }

    try {
      return await fetchEastmoneyClistPage(fs, page);
    } catch {
      return null;
    }
  });

  const successfulPayloads = payloads.filter((payload): payload is NonNullable<typeof payload> => payload !== null);
  if (successfulPayloads.length === 0) {
    throw new Error("Eastmoney clist pages are empty");
  }

  // Require most pages to succeed so week/month/year coverage stays meaningful.
  if (successfulPayloads.length < pageCount * 0.8) {
    throw new Error(
      `Eastmoney clist pages incomplete: ${successfulPayloads.length}/${pageCount}`
    );
  }

  return successfulPayloads;
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

async function fetchEastmoneyMarketIndexSnapshotFromClist(): Promise<MarketIndexSnapshot> {
  const payloads = await fetchEastmoneyClistPages(eastmoneyIndexFs);
  const summaries: Partial<Record<MarketKey, MarketIndexValue>> = {};

  for (const payload of payloads) {
    Object.assign(summaries, parseEastmoneyIndexBatch(payload));
  }

  if (Object.keys(summaries).length < marketIndexCount * 0.75) {
    throw new Error("Eastmoney index snapshot is incomplete");
  }

  return {
    timestamp: Date.now(),
    updatedAt: new Date().toISOString(),
    summaries,
    source: "direct",
  };
}

async function fetchEastmoneyMarketIndexSnapshotFromUlist(): Promise<MarketIndexSnapshot> {
  const payload = await fetchEastmoneyUlistBatch(Object.values(marketIndexSecids).filter(Boolean));
  const summaries = parseEastmoneyIndexBatch(payload);

  if (Object.keys(summaries).length < marketIndexCount * 0.75) {
    throw new Error("Eastmoney ulist index snapshot is incomplete");
  }

  return {
    timestamp: Date.now(),
    updatedAt: new Date().toISOString(),
    summaries,
    source: "direct",
  };
}

async function fetchEastmoneyMarketIndexSnapshotFromRemote(): Promise<MarketIndexSnapshot> {
  try {
    return await fetchEastmoneyMarketIndexSnapshotFromClist();
  } catch {
    return fetchEastmoneyMarketIndexSnapshotFromUlist();
  }
}

async function fetchSinaMarketIndexSnapshotFromRemote(): Promise<MarketIndexSnapshot> {
  const symbols = Object.values(marketIndexSymbols)
    .filter(Boolean)
    .map((symbol) => `s_${symbol}`);
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

  if (Object.keys(summaries).length < marketIndexCount * 0.75) {
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

async function fetchEastmoneyQuoteSnapshotFromClist(): Promise<QuoteSnapshot> {
  const payloads = await fetchEastmoneyClistPages(eastmoneyAsharesFs);
  const quotes: Record<string, RemoteQuoteValue> = {};
  let updatedAt = "";

  for (const payload of payloads) {
    const result = parseEastmoneyQuoteBatch(payload);
    Object.assign(quotes, result.quotes);
    if (result.updatedAt && (!updatedAt || result.updatedAt > updatedAt)) {
      updatedAt = result.updatedAt;
    }
  }

  if (Object.keys(quotes).length === 0) {
    throw new Error("Eastmoney clist quote snapshot is empty");
  }

  return {
    timestamp: Date.now(),
    updatedAt: updatedAt || new Date().toISOString(),
    quotes,
    source: "direct",
  };
}

async function fetchEastmoneyQuoteSnapshotFromUlist(): Promise<QuoteSnapshot> {
  const secids = baselineStocks.map((stock) => toEastmoneySecid(stock.code));
  const batches: string[][] = [];

  for (let index = 0; index < secids.length; index += eastmoneyUlistBatchSize) {
    batches.push(secids.slice(index, index + eastmoneyUlistBatchSize));
  }

  const payloads = await mapWithConcurrency(batches, eastmoneyUlistConcurrency, async (batch) => {
    try {
      return await fetchEastmoneyUlistBatch(batch);
    } catch {
      return null;
    }
  });

  const quotes: Record<string, RemoteQuoteValue> = {};
  let updatedAt = "";
  let successfulBatches = 0;

  for (const payload of payloads) {
    if (!payload) {
      continue;
    }

    successfulBatches += 1;
    const result = parseEastmoneyQuoteBatch(payload);
    Object.assign(quotes, result.quotes);
    if (result.updatedAt && (!updatedAt || result.updatedAt > updatedAt)) {
      updatedAt = result.updatedAt;
    }
  }

  if (successfulBatches < batches.length * 0.8 || Object.keys(quotes).length === 0) {
    throw new Error(
      `Eastmoney ulist quote snapshot incomplete: ${successfulBatches}/${batches.length}`
    );
  }

  return {
    timestamp: Date.now(),
    updatedAt: updatedAt || new Date().toISOString(),
    quotes,
    source: "direct",
  };
}

async function fetchEastmoneyQuoteSnapshotFromRemote(): Promise<QuoteSnapshot> {
  try {
    return await fetchEastmoneyQuoteSnapshotFromClist();
  } catch {
    // Same period fields as clist; used when list pagination is unavailable.
    return fetchEastmoneyQuoteSnapshotFromUlist();
  }
}

async function fetchSinaQuoteSnapshotFromRemote(): Promise<QuoteSnapshot> {
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

function countBaselineQuoteCoverage(quotes: Record<string, RemoteQuoteValue>) {
  return baselineStocks.reduce((count, stock) => (quotes[stock.code] ? count + 1 : count), 0);
}

function mergeQuoteSnapshots(
  primary: QuoteSnapshot,
  secondary: QuoteSnapshot | null
): QuoteSnapshot {
  if (!secondary) {
    return primary;
  }

  const quotes: Record<string, RemoteQuoteValue> = { ...primary.quotes };

  for (const [code, secondaryQuote] of Object.entries(secondary.quotes)) {
    const primaryQuote = quotes[code];
    if (!primaryQuote) {
      quotes[code] = secondaryQuote;
      continue;
    }

    quotes[code] = {
      price: primaryQuote.price || secondaryQuote.price,
      turnoverAmount: primaryQuote.turnoverAmount || secondaryQuote.turnoverAmount,
      changes: {
        day: primaryQuote.changes.day ?? secondaryQuote.changes.day,
        week: primaryQuote.changes.week ?? secondaryQuote.changes.week,
        month: primaryQuote.changes.month ?? secondaryQuote.changes.month,
        year: primaryQuote.changes.year ?? secondaryQuote.changes.year,
      },
    };
  }

  return {
    timestamp: Date.now(),
    updatedAt:
      primary.updatedAt && secondary.updatedAt
        ? primary.updatedAt > secondary.updatedAt
          ? primary.updatedAt
          : secondary.updatedAt
        : primary.updatedAt || secondary.updatedAt,
    quotes,
    source: "direct",
  };
}

async function fetchQuoteSnapshotFromRemote(): Promise<QuoteSnapshot> {
  const sinaPromise = fetchSinaQuoteSnapshotFromRemote()
    .then((snapshot) => ({ snapshot, error: null as Error | null }))
    .catch((error: unknown) => ({
      snapshot: null as QuoteSnapshot | null,
      error: error instanceof Error ? error : new Error("Sina quote snapshot failed"),
    }));

  // Eastmoney can be slow or flaky from some runtimes; bound the wait so Sina can still serve day data.
  const eastmoneyPromise = Promise.race([
    fetchEastmoneyQuoteSnapshotFromRemote()
      .then((snapshot) => ({ snapshot, error: null as Error | null }))
      .catch((error: unknown) => ({
        snapshot: null as QuoteSnapshot | null,
        error: error instanceof Error ? error : new Error("Eastmoney quote snapshot failed"),
      })),
    sleep(25_000).then(() => ({
      snapshot: null as QuoteSnapshot | null,
      error: new Error("Eastmoney quote snapshot timed out"),
    })),
  ]);

  const [eastmoneyResult, sinaResult] = await Promise.all([eastmoneyPromise, sinaPromise]);
  const eastmoneySnapshot = eastmoneyResult.snapshot;
  const sinaSnapshot = sinaResult.snapshot;

  // Prefer Eastmoney as the primary source because it carries week/month/year changes.
  if (eastmoneySnapshot && countBaselineQuoteCoverage(eastmoneySnapshot.quotes) >= baselineStocks.length * 0.9) {
    return mergeQuoteSnapshots(eastmoneySnapshot, sinaSnapshot);
  }

  if (sinaSnapshot && countBaselineQuoteCoverage(sinaSnapshot.quotes) >= baselineStocks.length * 0.9) {
    // Merge any partial Eastmoney period fields onto the reliable Sina day snapshot.
    return mergeQuoteSnapshots(sinaSnapshot, eastmoneySnapshot);
  }

  if (eastmoneySnapshot && countBaselineQuoteCoverage(eastmoneySnapshot.quotes) > 0) {
    return mergeQuoteSnapshots(eastmoneySnapshot, sinaSnapshot);
  }

  if (sinaSnapshot) {
    return sinaSnapshot;
  }

  throw eastmoneyResult.error ?? sinaResult.error ?? new Error("Quote snapshot is unavailable");
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
      turnoverAmount: quote?.turnoverAmount ?? getStockTurnoverAmount(stock),
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
    changePct: 0,
  }));
}

function getFallbackQuoteDataFromStocks(
  stocks: StockSnapshot[],
  period: HeatmapPeriodKey,
  metric?: MetricKey
): QuotesResponse {
  const quotes: Record<string, QuoteValue> = {};

  for (const stock of stocks) {
    quotes[stock.code] = {
      price: stock.price,
      changePct: stock.changePct,
      turnoverAmount: getStockTurnoverAmount(stock) || estimateFallbackTurnoverAmount(stock),
    };
  }

  return {
    market: "all",
    period,
    metric,
    updatedAt: fallbackSnapshotSeed.updatedAt,
    quotes,
    source: "fallback",
  };
}

function getFallbackTreemapDataFromStocks(
  stocks: StockSnapshot[],
  period: HeatmapPeriodKey
): TreemapResponse {
  const snapshot = stocks.map((stock) => ({
    ...stock,
    turnoverAmount: getStockTurnoverAmount(stock) || estimateFallbackTurnoverAmount(stock),
  }));
  const nodes = buildNodesFromStocks(snapshot, {}, period);

  return {
    market: "all",
    period,
    updatedAt: fallbackSnapshotSeed.updatedAt,
    stockCount: snapshot.length,
    boardCount: nodes.length,
    summary: {
      ...summarizeStocks(snapshot, {}, period),
      indexChangePct: weightedChangePct(snapshot, {}, period),
    },
    nodes,
    source: "fallback",
  };
}

export function isMarketKey(value: string): value is MarketKey {
  return marketKeys.includes(value as MarketKey);
}

export function isHeatmapUniverse(value: string): value is HeatmapUniverse {
  return value === watchlistUniverseKey || isMarketKey(value);
}

export function isMetricKey(value: string): value is MetricKey {
  return metricKeys.includes(value as MetricKey);
}

export function isHeatmapPeriodKey(value: string): value is HeatmapPeriodKey {
  return heatmapPeriodKeys.includes(value as HeatmapPeriodKey);
}

export type StockSearchItem = {
  code: string;
  name: string;
  boardName: string;
  subBoardName: string;
  exchange: ExchangeCode;
};

function normalizeStockToken(raw: string) {
  return raw.trim().toUpperCase().replace(/[\s_-]+/g, "");
}

export function parseStockCodeList(raw: string | null | undefined, maxCount = watchlistMaxCount) {
  if (!raw) {
    return [];
  }

  const tokens = raw
    .split(/[,;|\s]+/)
    .map((token) => normalizeStockToken(token))
    .filter(Boolean);

  return tokens.slice(0, maxCount);
}

function rankStockSearchMatch(stock: StockSnapshot, query: string, token: string) {
  const symbol = stock.code.split(".")[0];
  const codeUpper = stock.code.toUpperCase();
  const sinaSymbol = `${stock.exchange}${symbol}`;
  const name = stock.name;

  if (codeUpper === token || symbol === token || sinaSymbol === token) {
    return 1;
  }

  if (token.length >= 3 && /^\d+$/.test(token) && symbol.startsWith(token)) {
    return 2;
  }

  if (name === query) {
    return 3;
  }

  if (name.startsWith(query)) {
    return 4;
  }

  if (query.length >= 1 && name.includes(query)) {
    return 5;
  }

  return 0;
}

export function searchStocks(query: string, limit = 12): StockSearchItem[] {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const token = normalizeStockToken(trimmed);
  const matches: Array<{ stock: StockSnapshot; rank: number }> = [];

  for (const stock of baselineStocks) {
    const rank = rankStockSearchMatch(stock, trimmed, token);
    if (rank > 0) {
      matches.push({ stock, rank });
    }
  }

  matches.sort((left, right) => {
    if (left.rank !== right.rank) {
      return left.rank - right.rank;
    }

    return getStockValue(right.stock) - getStockValue(left.stock);
  });

  const unique = new Map<string, StockSnapshot>();
  for (const match of matches) {
    if (!unique.has(match.stock.code)) {
      unique.set(match.stock.code, match.stock);
    }
    if (unique.size >= limit) {
      break;
    }
  }

  return Array.from(unique.values()).map((stock) => ({
    code: stock.code,
    name: stock.name,
    boardName: stock.boardName,
    subBoardName: stock.subBoardName,
    exchange: stock.exchange,
  }));
}

export function resolveStocksByCodes(rawCodes: string[]) {
  const resolved: StockSnapshot[] = [];
  const seen = new Set<string>();

  for (const raw of rawCodes) {
    const token = normalizeStockToken(raw);
    if (!token) {
      continue;
    }

    let matches: StockSnapshot[] = [];
    const dotted = token.match(/^(\d{6})\.(SH|SZ|BJ)$/);
    const prefixed = token.match(/^(SH|SZ|BJ)(\d{6})$/);

    if (dotted) {
      const stock = baselineStockByCode.get(`${dotted[1]}.${dotted[2]}`);
      if (stock) {
        matches = [stock];
      }
    } else if (prefixed) {
      const stock = baselineStockByCode.get(`${prefixed[2]}.${prefixed[1]}`);
      if (stock) {
        matches = [stock];
      }
    } else if (/^\d{6}$/.test(token)) {
      matches = baselineStocksBySymbol.get(token) ?? [];
    } else {
      const stock = baselineStockByCode.get(token);
      if (stock) {
        matches = [stock];
      }
    }

    for (const stock of matches) {
      if (seen.has(stock.code)) {
        continue;
      }
      seen.add(stock.code);
      resolved.push(stock);
      if (resolved.length >= watchlistMaxCount) {
        return resolved;
      }
    }
  }

  return resolved;
}

async function getFallbackQuoteData(
  market: MarketKey,
  period: HeatmapPeriodKey,
  metric?: MetricKey
): Promise<QuotesResponse> {
  const snapshot = getFallbackSnapshot();
  const marketStocks = await filterStocks(snapshot, market);
  return getFallbackQuoteDataFromStocks(marketStocks, period, metric);
}

// Synchronous, dependency-free snapshot: lets the client paint a full Canvas on the
// very first frame (zero round-trips). Same shape/structure as a live treemap so the
// render pipeline treats it identically; it is built on the zeroed snapshot so every
// placeholder block reads 0% until real quotes arrive.
export function getBundledSnapshotTreemap(period: HeatmapPeriodKey = "day"): TreemapResponse {
  const stocks = getFallbackSnapshot();
  const { advanceCount, flatCount, declineCount, turnoverAmount } = summarizeStocks(stocks, {}, period);
  const nodes = buildNodesFromStocks(stocks, {}, period);

  return {
    market: "all",
    period,
    updatedAt: fallbackSnapshotSeed.updatedAt,
    stockCount: stocks.length,
    boardCount: nodes.length,
    summary: {
      advanceCount,
      flatCount,
      declineCount,
      turnoverAmount,
      turnoverPreviousAmount: 0,
      turnoverDelta: 0,
      indexChangePct: 0,
    },
    nodes,
    source: "fallback",
  };
}

async function getFallbackTreemapData(
  market: MarketKey,
  period: HeatmapPeriodKey,
  indexChangePct?: number
): Promise<TreemapResponse> {
  const snapshot = getFallbackSnapshot();
  const marketStocks = await filterStocks(snapshot, market);
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

export async function getMarketConstituentStatus(options?: {
  market?: MarketKey;
  forceRefresh?: boolean;
}): Promise<Zza50ConstituentStatus | null> {
  if ((options?.market ?? "zza50") !== "zza50") {
    return null;
  }

  return getZza50ConstituentStatus({
    forceRefresh: options?.forceRefresh,
    allowedCodes: baselineStockCodeSet,
  });
}

export async function getTreemapData(
  market: MarketKey,
  period: HeatmapPeriodKey = "day"
): Promise<TreemapResponse> {
  // First paint paints instantly on a bundled snapshot, so the very first load of a
  // cold visit shows a real heatmap instead of a waiting screen. Stale snapshots are
  // intentionally not cached, so hot (warm-module / shared-cache) visits go straight
  // to live data.
  if (!quoteCache && !quotePromise) {
    // Kick the live fetch off in the background so it's cached by the time the first
    // poll lands; the next call then serves real data instead of this snapshot.
    void getQuoteSnapshot().catch(() => {});
    return getFallbackTreemapData(market, period);
  }

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

  const marketStocks = await filterStocks(baselineStocks, market);
  const nodes = buildNodesFromStocks(marketStocks, quoteResult.value.quotes, period);
  const computedSummary = summarizeStocks(marketStocks, quoteResult.value.quotes, period);
  const computedIndexChangePct = weightedChangePct(marketStocks, quoteResult.value.quotes, period);
  const remoteSummary = summaryResult.status === "fulfilled" ? summaryResult.value : null;
  const liveUpdatedAt = remoteSummary?.updatedAt ?? quoteResult.value.updatedAt;

  return {
    market,
    period,
    updatedAt: liveUpdatedAt,
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
    source: quoteResult.value.source === "direct" ? "direct" : "stale",
  };
}

export async function getQuoteData(
  market: MarketKey,
  period: HeatmapPeriodKey = "day",
  metric?: MetricKey
): Promise<QuotesResponse> {
  // First paint always paints instantly on a bundled snapshot: a cold visit shows a
  // familiar heatmap shape right away while live data streams in (ballooned by the
  // browser fetch that started on the same request) instead of a waiting screen.
  // Stale snapshots are never cached, so warm (warm-module / shared-cache) visits
  // go straight to live data.
  if (!quoteCache && !quotePromise) {
    // Kick the live fetch off in the background so the next poll serves real data.
    void getQuoteSnapshot().catch(() => {});
    return getFallbackQuoteData(market, period, metric);
  }

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

  const marketStocks = await filterStocks(baselineStocks, market);
  const quotes: Record<string, QuoteValue> = {};

  for (const stock of marketStocks) {
    const quote = quoteResult[0].value.quotes[stock.code];
    quotes[stock.code] = {
      price: quote?.price ?? stock.price,
      changePct: getChangeForPeriod(quote?.changes, period, stock.changePct),
      turnoverAmount: quote?.turnoverAmount ?? getStockTurnoverAmount(stock),
    };
  }

  return {
    market,
    period,
    metric,
    updatedAt: quoteResult[0].value.updatedAt,
    quotes,
    source: quoteResult[0].value.source === "direct" ? "direct" : "stale",
  };
}

export async function getTreemapDataByCodes(
  rawCodes: string[],
  period: HeatmapPeriodKey = "day"
): Promise<TreemapResponse> {
  const stocks = resolveStocksByCodes(rawCodes);
  const quoteResult = await Promise.allSettled([getQuoteSnapshot()]);

  if (quoteResult[0].status !== "fulfilled") {
    if (!hasLoggedFallbackWarning) {
      console.warn("Falling back to bundled watchlist heatmap snapshot:", {
        quotes: quoteResult[0].reason,
      });
      hasLoggedFallbackWarning = true;
    }

    return getFallbackTreemapDataFromStocks(stocks, period);
  }

  hasLoggedFallbackWarning = false;

  const liveQuotes = quoteResult[0].value.quotes;
  const nodes = buildNodesFromStocks(stocks, liveQuotes, period);
  const computedSummary = summarizeStocks(stocks, liveQuotes, period);

  return {
    market: "all",
    period,
    updatedAt: quoteResult[0].value.updatedAt,
    stockCount: stocks.length,
    boardCount: nodes.length,
    summary: {
      ...computedSummary,
      indexChangePct: weightedChangePct(stocks, liveQuotes, period),
    },
    nodes,
    source: "direct",
  };
}

export async function getQuoteDataByCodes(
  rawCodes: string[],
  period: HeatmapPeriodKey = "day",
  metric?: MetricKey
): Promise<QuotesResponse> {
  const stocks = resolveStocksByCodes(rawCodes);
  const quoteResult = await Promise.allSettled([getQuoteSnapshot()]);

  if (quoteResult[0].status !== "fulfilled") {
    if (!hasLoggedFallbackWarning) {
      console.warn("Falling back to bundled watchlist heatmap quotes:", {
        quotes: quoteResult[0].reason,
      });
      hasLoggedFallbackWarning = true;
    }

    return getFallbackQuoteDataFromStocks(stocks, period, metric);
  }

  hasLoggedFallbackWarning = false;

  const quotes: Record<string, QuoteValue> = {};

  for (const stock of stocks) {
    const quote = quoteResult[0].value.quotes[stock.code];
    quotes[stock.code] = {
      price: quote?.price ?? stock.price,
      changePct: getChangeForPeriod(quote?.changes, period, stock.changePct),
      turnoverAmount: quote?.turnoverAmount ?? getStockTurnoverAmount(stock),
    };
  }

  return {
    market: "all",
    period,
    metric,
    updatedAt: quoteResult[0].value.updatedAt,
    quotes,
    source: quoteResult[0].value.source === "direct" ? "direct" : "stale",
  };
}

export async function getOverviewData(
  period: HeatmapPeriodKey = "day"
): Promise<MarketOverviewResponse> {
  // First paint paints instantly on a bundled snapshot (see getTreemapData).
  if (!quoteCache && !quotePromise) {
    // Kick the live fetch off in the background so the next poll serves real data.
    void getQuoteSnapshot().catch(() => {});
    const fallbackMarkets: MarketOverviewItem[] = await Promise.all(
      marketKeys.map(async (market) => {
        const stocks = await filterStocks(baselineStocks, market);
        const changePct = weightedChangePct(stocks, {}, period);
        return {
          market,
          changePct: Number.isFinite(changePct) ? changePct : 0,
          stockCount: stocks.length,
          updatedAt: fallbackSnapshotSeed.updatedAt,
        };
      })
    );

    return {
      period,
      updatedAt: fallbackSnapshotSeed.updatedAt,
      markets: fallbackMarkets,
      source: "fallback",
    };
  }

  const [quoteResult, indexResult] = await Promise.allSettled([
    getQuoteSnapshot(),
    getMarketIndexSnapshot(),
  ]);

  if (quoteResult.status !== "fulfilled") {
    if (!hasLoggedFallbackWarning) {
      console.warn("Falling back to bundled market heatmap overview:", {
        quotes: quoteResult.reason,
      });
      hasLoggedFallbackWarning = true;
    }

    const fallbackMarkets: MarketOverviewItem[] = await Promise.all(
      marketKeys.map(async (market) => {
        const stocks = await filterStocks(baselineStocks, market);
        const changePct = weightedChangePct(stocks, {}, period);
        return {
          market,
          changePct: Number.isFinite(changePct) ? changePct : 0,
          stockCount: stocks.length,
          updatedAt: fallbackSnapshotSeed.updatedAt,
        };
      })
    );

    return {
      period,
      updatedAt: fallbackSnapshotSeed.updatedAt,
      markets: fallbackMarkets,
      source: "fallback",
    };
  }

  hasLoggedFallbackWarning = false;

  const liveQuotes = quoteResult.value.quotes;
  const indexSummaries = indexResult.status === "fulfilled" ? indexResult.value.summaries : null;

  const markets: MarketOverviewItem[] = await Promise.all(
    marketKeys.map(async (market) => {
      const stocks = await filterStocks(baselineStocks, market);
      const remoteIndex = indexSummaries?.[market];
      const remoteIndexChange = getChangeForPeriod(remoteIndex?.changes, period, Number.NaN);
      const changePct = Number.isFinite(remoteIndexChange)
        ? remoteIndexChange
        : weightedChangePct(stocks, liveQuotes, period);

      return {
        market,
        changePct: Number.isFinite(changePct) ? changePct : 0,
        stockCount: stocks.length,
        updatedAt: quoteResult.value.updatedAt,
      };
    })
  );

  return {
    period,
    updatedAt: quoteResult.value.updatedAt,
    markets,
    source: quoteResult.value.source === "direct" ? "direct" : "stale",
  };
}
