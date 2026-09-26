const eastmoneyHosts = [
  "push2delay.eastmoney.com",
  "82.push2.eastmoney.com",
  "7.push2.eastmoney.com",
  "48.push2.eastmoney.com",
  "push2.eastmoney.com",
];
const pageSize = 100;
const headers = {
  Referer: "https://quote.eastmoney.com/",
  "User-Agent": "Mozilla/5.0 (compatible; AShareHeatmapDataRefresh/1.0)",
  Accept: "application/json, text/plain, */*",
};
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function mapWithConcurrency(items, workerCount, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;
  let stopped = false;
  await Promise.all(
    Array.from({ length: Math.min(workerCount, items.length) }, async () => {
      while (!stopped && nextIndex < items.length) {
        const index = nextIndex++;
        try {
          results[index] = await worker(items[index]);
        } catch (error) {
          stopped = true;
          throw error;
        }
      }
    })
  );
  return results;
}

export async function fetchEastmoneyRows({ fetchImpl = fetch, sleepImpl = sleep } = {}) {
  let preferredHost = 0;
  const fetchPage = async (page) => {
    let lastError;
    const startHost = preferredHost;
    for (let attempt = 0; attempt < eastmoneyHosts.length; attempt += 1) {
      const hostIndex = (startHost + attempt) % eastmoneyHosts.length;
      const params = new URLSearchParams({
        pn: String(page), pz: String(pageSize), po: "1", np: "1",
        ut: "bd1d9ddb04089700cf9c27f6f7426281", fltt: "2", invt: "2", fid: "f12",
        fs: "m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23,m:0+t:81+s:2048",
        fields: "f2,f3,f6,f12,f13,f14,f20,f21,f100,f124",
      });
      try {
        const response = await fetchImpl(`https://${eastmoneyHosts[hostIndex]}/api/qt/clist/get?${params}`, {
          headers, signal: AbortSignal.timeout(12_000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();
        if (!Array.isArray(payload?.data?.diff)) throw new Error("invalid payload");
        preferredHost = hostIndex;
        return payload;
      } catch (error) {
        lastError = error;
        if (attempt + 1 < eastmoneyHosts.length) await sleepImpl(200 * (attempt + 1) ** 2);
      }
    }
    throw new Error(`Unable to fetch Eastmoney page ${page}: ${lastError instanceof Error ? lastError.message : lastError}`);
  };

  const first = await fetchPage(1);
  const remoteTotal = Number(first.data.total);
  if (!Number.isInteger(remoteTotal) || remoteTotal <= 0) throw new Error("Eastmoney returned an invalid stock count");
  const pages = Array.from({ length: Math.ceil(remoteTotal / pageSize) - 1 }, (_, i) => i + 2);
  // Lower concurrency and reuse the working mirror to avoid repeatedly hitting a failing host.
  const payloads = [first, ...(await mapWithConcurrency(pages, 2, fetchPage))];
  const rows = payloads.flatMap((payload) => payload.data.diff);
  if (rows.length < remoteTotal * 0.98) throw new Error(`Eastmoney snapshot is incomplete: ${rows.length}/${remoteTotal}`);
  return { rows, remoteTotal, source: "eastmoney" };
}

function positiveNumber(raw, fallback) {
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function parseTencentRows(raw, expectedCodes) {
  const rows = new Map();
  for (const match of raw.matchAll(/v_((?:sh|sz|bj)\d{6})="([^"]*)";/g)) {
    const symbol = match[1];
    const code = `${symbol.slice(2)}.${symbol.slice(0, 2).toUpperCase()}`;
    if (!expectedCodes.has(code)) continue;
    const fields = match[2].split("~");
    const price = Number(fields[3]);
    const changePct = Number(fields[32]);
    const time = fields[30];
    if (fields.length <= 45 || !fields[1]?.trim() || !/^\d{14}$/.test(time ?? "")) continue;
    if (!fields[3]?.trim() || !fields[32]?.trim() || !Number.isFinite(price) || price <= 0 || !Number.isFinite(changePct)) continue;
    const timestamp = Date.parse(
      `${time.slice(0, 4)}-${time.slice(4, 6)}-${time.slice(6, 8)}T${time.slice(8, 10)}:${time.slice(10, 12)}:${time.slice(12, 14)}+08:00`
    ) / 1_000;
    if (!Number.isFinite(timestamp)) continue;
    rows.set(code, {
      f12: symbol.slice(2), f13: symbol.startsWith("sh") ? 1 : 0,
      f14: fields[1].trim(), f2: price, f3: changePct,
      // Tencent reports both market-cap fields in 亿元; the snapshot uses 元.
      f20: positiveNumber(fields[45], 0) * 100_000_000,
      f21: positiveNumber(fields[44], 0) * 100_000_000,
      f124: timestamp,
    });
  }
  return rows;
}

export async function fetchTencentRows(previousSnapshot, {
  fetchImpl = fetch, sleepImpl = sleep, warn = console.warn,
} = {}) {
  const stocks = previousSnapshot.stocks;
  const expectedCodes = new Set(stocks.map((stock) => stock.code));
  const symbols = stocks.map((stock) => stock.code.slice(-2).toLowerCase() + stock.code.slice(0, 6));
  const batches = [];
  for (let i = 0; i < symbols.length; i += 100) batches.push(symbols.slice(i, i + 100));
  const payloads = await mapWithConcurrency(batches, 2, async (batch) => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await fetchImpl(`https://qt.gtimg.cn/q=${batch.join(",")}`, {
          headers: { ...headers, Referer: "https://gu.qq.com/" },
          signal: AbortSignal.timeout(10_000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const raw = new TextDecoder("gb18030").decode(await response.arrayBuffer());
        const rows = parseTencentRows(raw, expectedCodes);
        if (rows.size === 0) throw new Error("Tencent returned no valid quotes");
        return rows;
      } catch {
        if (attempt < 2) await sleepImpl(500 * (attempt + 1) ** 2);
      }
    }
    return new Map();
  });
  const quotes = new Map(payloads.flatMap((rows) => [...rows]));
  // Suspended/unlisted securities can have no quote. Large gaps must still fail
  // instead of making a stale snapshot look like a successful refresh.
  if (stocks.length === 0 || quotes.size < stocks.length * 0.9) {
    throw new Error(`Tencent quote coverage is too low: ${quotes.size}/${stocks.length}`);
  }
  const previousTimestamp = Date.parse(previousSnapshot.updatedAt) / 1_000;
  const latestTimestamp = Math.max(...[...quotes.values()].map((quote) => quote.f124));
  const shanghaiDay = (timestamp) => Math.floor((timestamp + 8 * 3_600) / 86_400);
  if (Number.isFinite(previousTimestamp) && shanghaiDay(latestTimestamp) < shanghaiDay(previousTimestamp)) {
    throw new Error("Tencent quotes are older than the existing snapshot");
  }
  const rows = stocks.map((stock) => {
    const quote = quotes.get(stock.code);
    return {
      f12: stock.code.slice(0, 6), f13: stock.exchange === "SH" ? 1 : 0,
      f14: stock.name, f2: stock.price, f3: stock.changePct,
      f124: Number.isFinite(previousTimestamp) ? previousTimestamp : 0,
      ...quote,
      f20: quote?.f20 || stock.totalMarketCap,
      f21: quote?.f21 || stock.floatMarketCap,
    };
  });
  warn(`Tencent refreshed ${quotes.size}/${stocks.length} stocks; retained the existing stock universe and industry mappings. New listings/delistings will be synchronized when Eastmoney recovers.`);
  return { rows, remoteTotal: stocks.length, source: "tencent" };
}

export async function loadMarketRows(previousSnapshot, options = {}) {
  const { source = "auto", warn = console.warn } = options;
  if (!["auto", "eastmoney", "tencent"].includes(source)) throw new Error(`Invalid data source: ${source}`);
  if (source !== "tencent") {
    try {
      return await fetchEastmoneyRows(options);
    } catch (error) {
      if (source === "eastmoney") throw error;
      warn(`Eastmoney unavailable: ${error instanceof Error ? error.message : error}. Trying Tencent quotes.`);
    }
  }
  return fetchTencentRows(previousSnapshot, options);
}
