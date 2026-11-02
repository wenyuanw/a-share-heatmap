import supplement from "./listing-status-supplement.json" with { type: "json" };

// Only the exchanges' terminated-listing tables and verified announcements are authoritative here.
// Missing quotes, zero changes, ST names and missing industries are NOT delistings.
export const listingStatusSources = {
  SH: "https://www.sse.com.cn/assortment/stock/list/delisting/",
  SZ: "https://www.szse.cn/market/stock/suspend/index.html",
};

function dateOnly(raw) {
  const value = String(raw ?? "").replace(/^(\d{4})(\d{2})(\d{2})$/, "$1-$2-$3");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) ||
      new Date(value).toISOString().slice(0, 10) !== value) {
    throw new Error(`Invalid delisting date: ${raw}`);
  }
  return value;
}

export function parseShanghaiDelistings(payload) {
  const rows = payload?.result;
  const total = Number(payload?.pageHelp?.total);
  if (!Array.isArray(rows) || !Number.isInteger(total) || total < 100 || rows.length !== total) {
    throw new Error("Incomplete Shanghai terminated-listing table");
  }
  for (const row of rows) {
    if (!["1", "2", "8"].includes(String(row.STOCK_TYPE)) ||
        (String(row.STOCK_TYPE) !== "2" && !/^6\d{5}$/.test(row.A_STOCK_CODE))) {
      throw new Error("Invalid Shanghai security type/code");
    }
  }
  return rows.filter((row) => ["1", "8"].includes(String(row.STOCK_TYPE))).map((row) => {
    if (String(row.STATE_CODE) !== "3") throw new Error("Shanghai table contains a non-terminated listing");
    return { code: `${row.A_STOCK_CODE}.SH`, name: row.COMPANY_ABBR, delistedOn: dateOnly(row.DELIST_DATE) };
  });
}

export function parseShenzhenDelistingPage(payload, page) {
  const table = Array.isArray(payload) ? payload.find((tab) => tab.metadata?.tabkey === "tab2") : null;
  const meta = table?.metadata;
  if (meta?.name !== "终止上市" || Number(meta.pageno) !== page || !Array.isArray(table.data) || table.error) {
    throw new Error("Invalid Shenzhen terminated-listing table");
  }
  const total = Number(meta.recordcount);
  const pages = Number(meta.pagecount);
  const pageSize = Number(meta.pagesize);
  if (!Number.isInteger(total) || total < 100 || !Number.isInteger(pageSize) || pageSize <= 0 ||
      pages !== Math.ceil(total / pageSize) || page < 1 || page > pages ||
      table.data.length !== Math.min(pageSize, total - (page - 1) * pageSize)) {
    throw new Error("Incomplete Shenzhen terminated-listing table");
  }
  // B shares are outside this application's universe.
  if (table.data.some((row) => !/^[023]\d{5}$/.test(row.zqdm))) throw new Error("Invalid Shenzhen security code");
  const stocks = table.data.filter((row) => /^[03]\d{5}$/.test(row.zqdm)).map((row) => ({
    code: `${row.zqdm}.SZ`, name: row.zqjc.replace(/&nbsp;/g, " "), delistedOn: dateOnly(row.zzrq),
  }));
  return { stocks, total, pages };
}

export async function fetchListingStatus({ fetchImpl = fetch, previous = null, now = new Date() } = {}) {
  const preferredHosts = new Map();
  const get = async (url, referer, mirrorHosts = []) => {
    const originalHost = new URL(url).hostname;
    const hosts = [...new Set([preferredHosts.get(originalHost), originalHost, ...mirrorHosts].filter(Boolean))];
    let lastError;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      for (const host of hosts) {
        const requestUrl = new URL(url);
        requestUrl.hostname = host;
        try {
          const response = await fetchImpl(requestUrl.href, {
            headers: { Referer: referer, "User-Agent": "Mozilla/5.0", Accept: "application/json" },
            signal: AbortSignal.timeout(15_000),
          });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const payload = await response.json();
          preferredHosts.set(originalHost, host);
          return payload;
        } catch (error) {
          const details = error?.cause?.errors?.map((cause) => `${cause.code} ${cause.address}:${cause.port}`).join(", ");
          lastError = `${host}: ${error}${error?.cause ? ` (${error.cause.code ?? error.cause.message})` : ""}${details ? ` [${details}]` : ""}`;
        }
      }
    }
    throw new Error(`Listing status unavailable (${originalHost}): ${lastError}`);
  };
  const shUrl = new URL("https://query.sse.com.cn/commonQuery.do");
  shUrl.search = new URLSearchParams({
    sqlId: "COMMON_SSE_CP_GPJCTPZ_GPLB_GP_L", COMPANY_STATUS: "3", isPagination: "true",
    "pageHelp.pageSize": "1000", "pageHelp.pageNo": "1",
  }).toString();
  const szUrl = (page) => `https://www.szse.cn/api/report/ShowReport/data?SHOWTYPE=JSON&CATALOGID=1793_ssgs&TABKEY=tab2&tab2PAGENO=${page}`;
  // Shenzhen's official alternate domain serves the same report API and is
  // reachable from runners where the primary domain resets the connection.
  const getSzPage = (page) => get(szUrl(page), listingStatusSources.SZ, ["www.sse.org.cn"])
    .then((payload) => parseShenzhenDelistingPage(payload, page));
  const [sh, first] = await Promise.all([
    get(shUrl.href, listingStatusSources.SH).then(parseShanghaiDelistings),
    getSzPage(1),
  ]);
  const sz = [...first.stocks];
  for (let page = 2; page <= first.pages; page += 1) {
    const result = await getSzPage(page);
    if (result.total !== first.total || result.pages !== first.pages) throw new Error("Shenzhen table changed during pagination");
    sz.push(...result.stocks);
  }
  for (const stock of supplement.stocks) {
    if (!/^\d{6}\.(SH|SZ|BJ)$/.test(stock.code) || !stock.source?.startsWith("https://")) {
      throw new Error("Invalid supplemental listing-status record");
    }
    dateOnly(stock.delistedOn);
  }
  const officialStocks = [...sh, ...sz];
  const officialCodes = new Set(officialStocks.map((stock) => stock.code));
  if (officialCodes.size !== officialStocks.length) throw new Error("Duplicate terminated-listing codes");
  const stocks = [...officialStocks, ...supplement.stocks.filter((stock) => !officialCodes.has(stock.code))]
    .sort((a, b) => a.code.localeCompare(b.code));
  if (new Set(stocks.map((stock) => stock.code)).size !== stocks.length) throw new Error("Duplicate terminated-listing codes");
  for (const exchange of ["SH", "SZ"]) {
    const count = stocks.filter((stock) => stock.code.endsWith(`.${exchange}`)).length;
    const previousCount = previous?.stocks.filter((stock) => stock.code.endsWith(`.${exchange}`)).length ?? 0;
    if (count < 100 || count < previousCount * 0.95) throw new Error(`Terminated-listing coverage dropped for ${exchange}`);
  }
  const codes = new Set(stocks.map((stock) => stock.code));
  const missing = previous?.stocks.filter((stock) => !codes.has(stock.code)) ?? [];
  if (missing.length) {
    // Disappearance from a table alone is not proof of relisting. Require an
    // explicit review instead of allowing a stale quote to resurrect the code.
    throw new Error(`Terminated-listing records disappeared; verify relisting before updating the saved register: ${missing.map((stock) => stock.code).join(", ")}`);
  }
  return {
    updatedAt: now.toISOString(), sources: listingStatusSources,
    supplementalReviewedAt: supplement.reviewedAt,
    coverage: { SH: "exchange-table", SZ: "exchange-table", BJ: "verified-announcements" },
    stocks,
  };
}
