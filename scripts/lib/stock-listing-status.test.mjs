import { describe, expect, it, vi } from "vitest";
import { fetchListingStatus, parseShanghaiDelistings, parseShenzhenDelistingPage } from "./stock-listing-status.mjs";
import { getDelistedCodes, isAShareCode, mergeEligibleStocks } from "../../src/lib/stock-listing-status.mjs";

const shRows = Array.from({ length: 100 }, (_, i) => ({
  A_STOCK_CODE: String(600000 + i), STOCK_TYPE: "1", STATE_CODE: "3", COMPANY_ABBR: `SH ${i}`, DELIST_DATE: "20260105",
}));
const shPayload = (rows = shRows) => ({ result: rows, pageHelp: { total: rows.length } });
const szPayload = (page = 1) => [{
  metadata: { tabkey: "tab1", name: "暂停上市" }, data: [{ zqdm: "000999", zzrq: "2020-01-01" }],
}, {
  metadata: { tabkey: "tab2", name: "终止上市", pageno: page, recordcount: 100, pagesize: 20, pagecount: 5 },
  data: Array.from({ length: 20 }, (_, i) => ({
    zqdm: String((page - 1) * 20 + i).padStart(6, "0"), zqjc: "SZ", zzrq: "2026-01-05",
  })),
}];
const exchangeFetch = vi.fn(async (rawUrl) => {
  const url = new URL(rawUrl);
  return Response.json(url.hostname === "query.sse.com.cn" ? shPayload() : szPayload(Number(url.searchParams.get("tab2PAGENO"))));
});

describe("交易所终止上市名册", () => {
  it("深交所主域名连接失败时切换官方备用域名，后续分页复用备用域名", async () => {
    const requestedHosts = [];
    const snapshot = await fetchListingStatus({ fetchImpl: async (url) => {
      const host = new URL(url).hostname;
      requestedHosts.push(host);
      if (host === "www.szse.cn") throw new TypeError("fetch failed", { cause: { code: "ECONNRESET" } });
      return exchangeFetch(url);
    } });
    expect(snapshot.stocks.some((stock) => stock.code === "000099.SZ")).toBe(true);
    expect(requestedHosts.filter((host) => host === "www.szse.cn")).toHaveLength(1);
    expect(requestedHosts.filter((host) => host === "www.sse.org.cn")).toHaveLength(5);
  });

  it("区分暂停上市/终止上市及 A/B 股，保留科创板退市记录", () => {
    const payload = shPayload([...shRows,
      { ...shRows[0], A_STOCK_CODE: "688086", STOCK_TYPE: "8" },
      { ...shRows[0], STOCK_TYPE: "2", B_STOCK_CODE: "900000" },
    ]);
    const sh = parseShanghaiDelistings(payload);
    expect(sh).toHaveLength(101);
    expect(sh.at(-1)).toMatchObject({ code: "688086.SH", delistedOn: "2026-01-05" });
    const sz = parseShenzhenDelistingPage(szPayload(), 1);
    expect(sz.stocks).toHaveLength(20);
    expect(sz.stocks.map((s) => s.code)).not.toContain("000999.SZ");
  });

  it("拒绝空表、截断、错误分页、错误状态和无效日期", () => {
    expect(() => parseShanghaiDelistings({ result: [], pageHelp: { total: 100 } })).toThrow("Incomplete");
    expect(() => parseShanghaiDelistings(shPayload([{ ...shRows[0], STATE_CODE: "2" }, ...shRows.slice(1)]))).toThrow("non-terminated");
    expect(() => parseShanghaiDelistings(shPayload([{ ...shRows[0], DELIST_DATE: "20260230" }, ...shRows.slice(1)]))).toThrow("date");
    expect(() => parseShenzhenDelistingPage(szPayload(1), 2)).toThrow("Invalid");
    const payload = szPayload();
    payload[1].data.pop();
    expect(() => parseShenzhenDelistingPage(payload, 1)).toThrow("Incomplete");
    expect(() => parseShenzhenDelistingPage([], 1)).toThrow("Invalid");
  });

  it("抓取所有分页；失败、重复页、名册异常缩减均中止刷新", async () => {
    const snapshot = await fetchListingStatus({ fetchImpl: exchangeFetch });
    expect(snapshot.stocks.some((stock) => stock.code === "000099.SZ")).toBe(true);
    expect(snapshot.stocks.some((stock) => stock.code === "920680.BJ")).toBe(true);
    await expect(fetchListingStatus({ fetchImpl: async () => new Response("", { status: 502 }) })).rejects.toThrow("unavailable");
    await expect(fetchListingStatus({ fetchImpl: async (rawUrl) => {
      const url = new URL(rawUrl);
      if (url.hostname === "query.sse.com.cn") return Response.json(shPayload());
      const payload = szPayload(Number(url.searchParams.get("tab2PAGENO")));
      payload[1].data = szPayload()[1].data;
      return Response.json(payload);
    } })).rejects.toThrow("Duplicate");
    await expect(fetchListingStatus({ fetchImpl: exchangeFetch, previous: {
      stocks: Array.from({ length: 150 }, (_, i) => ({ code: `${600000 + i}.SH` })),
    } })).rejects.toThrow("coverage dropped");
    await expect(fetchListingStatus({ fetchImpl: exchangeFetch, previous: {
      stocks: [{ code: "601299.SH" }],
    } })).rejects.toThrow("verify relisting");
  });
});

describe("股票池只按已生效的上市状态清理", () => {
  const status = { stocks: [
    { code: "601299.SH", delistedOn: "2015-05-20" },
    { code: "002731.SZ", delistedOn: "2026-11-13" },
  ] };
  const excluded = getDelistedCodes(status, new Date("2026-11-02T06:00:00Z"));
  const retained = [
    { code: "000001.SZ", name: "长期停牌", price: 10, changePct: 0, boardName: "银行" },
    { code: "920285.BJ", name: "新股", price: 0, changePct: 0, boardName: "其他" },
    { code: "002731.SZ", name: "萃华退", price: 1, changePct: 0, boardName: "其他" },
    { code: "600000.SH", name: "*ST正常上市", price: 2, changePct: 0, boardName: "其他" },
  ];

  it("保留无行情停牌股、零价格新股、ST、行业未知及尚未摘牌的整理期股票", () => {
    expect(mergeEligibleStocks(retained, [], excluded)).toEqual(retained);
    expect(excluded.has("002731.SZ")).toBe(false);
    expect(getDelistedCodes(status, new Date("2026-11-12T16:00:00Z")).has("002731.SZ")).toBe(true);
  });

  it("旧快照和任意行情源均不能带回退市代码；新代码即使没有行情也保留", () => {
    const delisted = { code: "601299.SH", name: "中国北车", price: 29.98, changePct: 0 };
    const newIpo = { code: "603999.SH", name: "新上市", price: 0, changePct: 0 };
    const bond = { code: "810014.BJ", name: "莱特定转", price: 100, changePct: 0 };
    expect(mergeEligibleStocks([...retained, delisted, bond], [delisted, newIpo, bond], excluded))
      .toEqual([...retained, newIpo]);
    expect(isAShareCode("301999.SZ")).toBe(true);
    expect(isAShareCode("688999.SH")).toBe(true);
    expect(isAShareCode("920999.BJ")).toBe(true);
    expect(isAShareCode("900901.SH")).toBe(false);
  });

  it("重新上市后从已验证名册移除的代码可重新纳入", () => {
    const relisted = { code: "601299.SH", name: "重新上市" };
    expect(mergeEligibleStocks([], [relisted], getDelistedCodes({ stocks: [] }))).toEqual([relisted]);
  });
});
