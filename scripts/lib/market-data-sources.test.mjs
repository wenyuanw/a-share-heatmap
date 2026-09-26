import { describe, expect, it, vi } from "vitest";
import { fetchEastmoneyRows, fetchTencentRows, loadMarketRows, parseTencentRows } from "./market-data-sources.mjs";
import { validateSnapshot } from "../refresh-market-data.mjs";

const noSleep = async () => {};
const makeStock = (index) => ({
  code: `${String(600000 + index)}.SH`, exchange: "SH", name: `Stock ${index}`,
  boardName: "银行", price: 10, changePct: 1, totalMarketCap: 2e9, floatMarketCap: 1e9,
});
const makeSnapshot = (count = 10) => ({
  updatedAt: "2026-09-18T07:00:00Z", stocks: Array.from({ length: count }, (_, i) => makeStock(i)),
});
function tencentQuote(code, overrides = {}) {
  const fields = Array(71).fill("");
  Object.assign(fields, { 1: "Stock", 3: "11.25", 30: "20260925153000", 32: "-2.5", 44: "12.3", 45: "23.4", ...overrides });
  return `v_${code.slice(-2).toLowerCase()}${code.slice(0, 6)}="${fields.join("~")}";`;
}
const tencentResponse = (codes) => new Response(codes.map((code) => tencentQuote(code)).join("\n"));
const row = (index) => ({ f12: String(600000 + index), f13: 1, f14: "Stock" });

describe("东方财富分页和数据源切换", () => {
  it("镜像故障后复用可用镜像获取后续页，不请求腾讯", async () => {
    const urls = [];
    const fetchImpl = async (rawUrl) => {
      const url = new URL(rawUrl);
      urls.push(url);
      if (url.hostname === "push2delay.eastmoney.com") return new Response("", { status: 502 });
      const page = Number(url.searchParams.get("pn"));
      return Response.json({ data: { total: 101, diff: page === 1 ? Array.from({ length: 100 }, (_, i) => row(i)) : [row(100)] } });
    };
    const result = await loadMarketRows(makeSnapshot(), { fetchImpl, sleepImpl: noSleep });
    expect(result.source).toBe("eastmoney");
    expect(result.rows).toHaveLength(101);
    expect(urls.map((url) => url.hostname)).toEqual(["push2delay.eastmoney.com", "82.push2.eastmoney.com", "82.push2.eastmoney.com"]);
  });

  it("全部镜像返回 502 时自动刷新腾讯行情并提示名册未更新", async () => {
    const snapshot = makeSnapshot();
    const warn = vi.fn();
    const fetchImpl = vi.fn(async (url) => url.includes("eastmoney.com")
      ? new Response("", { status: 502 }) : tencentResponse(snapshot.stocks.map((s) => s.code)));
    const result = await loadMarketRows(snapshot, { fetchImpl, sleepImpl: noSleep, warn });
    expect(result.source).toBe("tencent");
    expect(result.remoteTotal).toBe(10);
    expect(result.rows[0]).toMatchObject({ f2: 11.25, f3: -2.5, f20: 2.34e9, f21: 1.23e9 });
    expect(fetchImpl).toHaveBeenCalledTimes(6);
    expect(warn.mock.calls.flat().join(" ")).toContain("New listings/delistings");
  });

  it("后续页失败时放弃不完整的主源结果，切换备用源", async () => {
    const snapshot = makeSnapshot();
    const fetchImpl = async (rawUrl) => {
      const url = new URL(rawUrl);
      if (url.hostname === "qt.gtimg.cn") return tencentResponse(snapshot.stocks.map((s) => s.code));
      if (url.searchParams.get("pn") === "1") return Response.json({ data: { total: 101, diff: Array.from({ length: 100 }, (_, i) => row(i)) } });
      return new Response("", { status: 502 });
    };
    const result = await loadMarketRows(snapshot, { fetchImpl, sleepImpl: noSleep, warn: vi.fn() });
    expect(result.source).toBe("tencent");
    expect(result.rows).toHaveLength(10);
  });

  it("主源空响应或分页覆盖不足不能作为成功刷新", async () => {
    const options = { sleepImpl: noSleep, fetchImpl: async () => Response.json({ data: { total: 10, diff: [] } }) };
    await expect(fetchEastmoneyRows(options)).rejects.toThrow("incomplete");
    await expect(fetchEastmoneyRows({ ...options, fetchImpl: async () => Response.json({ data: null }) })).rejects.toThrow("invalid payload");
  });

  it("严格主源模式保留错误，不自动回退；非法来源报错", async () => {
    const fetchImpl = vi.fn(async () => new Response("", { status: 502 }));
    await expect(loadMarketRows(makeSnapshot(), { source: "eastmoney", fetchImpl, sleepImpl: noSleep })).rejects.toThrow("Eastmoney page 1");
    expect(fetchImpl).toHaveBeenCalledTimes(5);
    await expect(loadMarketRows(makeSnapshot(), { source: "bad", fetchImpl })).rejects.toThrow("Invalid data source");
  });
});

describe("腾讯备用源的覆盖率与字段校验", () => {
  it("解析沪深北代码、市值单位及上海时区，不接收非请求股票", () => {
    const codes = new Set(["600519.SH", "000001.SZ", "920000.BJ"]);
    const result = parseTencentRows([...codes, "600000.SH"].map((code) => tencentQuote(code, { 1: "中文名称" })).join("\n"), codes);
    expect([...result.keys()]).toEqual([...codes]);
    expect(result.get("920000.BJ")).toMatchObject({ f12: "920000", f13: 0, f14: "中文名称", f20: 2.34e9, f21: 1.23e9 });
    expect(new Date(result.get("600519.SH").f124 * 1_000).toISOString()).toBe("2026-09-25T07:30:00.000Z");
  });

  it("丢弃无效价格、涨跌和时间，重复记录只计一次", () => {
    const code = "600519.SH";
    for (const overrides of [{ 3: "-" }, { 3: "0" }, { 32: "" }, { 32: "-" }, { 30: "bad" }]) {
      expect(parseTencentRows(tencentQuote(code, overrides), new Set([code])).size).toBe(0);
    }
    expect(parseTencentRows(tencentQuote(code).repeat(2), new Set([code])).size).toBe(1);
  });

  it("有效行情达到 90% 时保留未返回证券及其旧值，避免误判退市", async () => {
    const snapshot = makeSnapshot();
    const warn = vi.fn();
    const result = await fetchTencentRows(snapshot, {
      fetchImpl: async () => tencentResponse(snapshot.stocks.slice(0, 9).map((s) => s.code)), warn,
    });
    expect(result.rows).toHaveLength(10);
    expect(result.rows[9]).toMatchObject({ f12: "600009", f14: "Stock 9", f2: 10, f3: 1, f20: 2e9, f21: 1e9 });
    expect(result.rows[9].f124).toBe(Date.parse(snapshot.updatedAt) / 1_000);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("9/10"));
  });

  it("无效市值使用原股票市值，不把零或缺失值写入快照", async () => {
    const snapshot = makeSnapshot(1);
    const result = await fetchTencentRows(snapshot, {
      fetchImpl: async () => new Response(tencentQuote(snapshot.stocks[0].code, { 44: "-", 45: "0" })), warn: vi.fn(),
    });
    expect(result.rows[0]).toMatchObject({ f20: 2e9, f21: 1e9 });
  });

  it("短暂限流可以重试，覆盖不足则仍然报错", async () => {
    const snapshot = makeSnapshot();
    const fetchImpl = vi.fn().mockResolvedValueOnce(new Response("", { status: 429 }))
      .mockImplementation(async () => tencentResponse(snapshot.stocks.map((s) => s.code)));
    await expect(fetchTencentRows(snapshot, { fetchImpl, sleepImpl: noSleep, warn: vi.fn() })).resolves.toMatchObject({ source: "tencent" });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    await expect(fetchTencentRows(snapshot, {
      fetchImpl: async () => tencentResponse(snapshot.stocks.slice(0, 8).map((s) => s.code)), warn: vi.fn(),
    })).rejects.toThrow("8/10");
  });

  it("两个源均不可用时失败，不伪装成刷新成功", async () => {
    await expect(loadMarketRows(makeSnapshot(), {
      fetchImpl: async () => new Response("", { status: 502 }), sleepImpl: noSleep, warn: vi.fn(),
    })).rejects.toThrow("Tencent quote coverage is too low");
  });

  it("旧交易日行情不能覆盖较新的快照", async () => {
    const snapshot = { ...makeSnapshot(), updatedAt: "2026-09-28T07:00:00Z" };
    await expect(fetchTencentRows(snapshot, {
      fetchImpl: async () => tencentResponse(snapshot.stocks.map((s) => s.code)), warn: vi.fn(),
    })).rejects.toThrow("older than the existing snapshot");
  });
});

describe("写入前的快照保护", () => {
  const stocks = makeSnapshot(5_000).stocks;
  it("保留原来的完整性、市值覆盖率和删除数量检查", () => {
    expect(() => validateSnapshot(stocks, stocks, 5_000)).not.toThrow();
    expect(() => validateSnapshot(stocks.slice(0, 4_999), stocks, 5_000)).toThrow("incomplete");
    expect(() => validateSnapshot(stocks.map((stock) => ({ ...stock, code: "600000.SH" })), stocks, 5_000)).toThrow("not unique");
    expect(() => validateSnapshot(stocks.map((stock) => ({ ...stock, totalMarketCap: 0 })), stocks, 5_000)).toThrow("coverage");
    expect(() => validateSnapshot(stocks, [...stocks, ...makeSnapshot(500).stocks.map((stock) => ({ ...stock, code: `${stock.code}new` }))], 5_000)).toThrow("disappeared");
  });
});
