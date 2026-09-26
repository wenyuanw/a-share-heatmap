#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadMarketRows } from "./lib/market-data-sources.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fallbackPath = path.join(repositoryRoot, "src/lib/data/market-heatmap-fallback.json");
const subboardsPath = path.join(repositoryRoot, "src/lib/data/market-heatmap-subboards.json");
const checkOnly = process.argv.includes("--check");
const source = process.argv.find((arg) => arg.startsWith("--source="))?.slice("--source=".length) ?? "auto";

function finiteNumber(value, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeCode(symbol, marketFlag) {
  const normalizedSymbol = String(symbol ?? "").trim();
  if (!/^\d{6}$/.test(normalizedSymbol)) {
    return null;
  }

  const exchange = Number(marketFlag) === 1 ? "SH" : /^[489]/.test(normalizedSymbol) ? "BJ" : "SZ";
  return `${normalizedSymbol}.${exchange}`;
}

function buildSectorLookup(subboards) {
  const lookup = new Map();
  for (const mapping of Object.values(subboards)) {
    const current = lookup.get(mapping.subBoardName);
    if (current && current !== mapping.sectorName) {
      throw new Error(`Secondary industry ${mapping.subBoardName} maps to multiple primary industries`);
    }
    lookup.set(mapping.subBoardName, mapping.sectorName);
  }
  return lookup;
}

export function validateSnapshot(stocks, previousStocks, remoteTotal) {
  if (stocks.length < 5_000 || stocks.length < remoteTotal * 0.98) {
    throw new Error(`Stock snapshot is incomplete: parsed ${stocks.length} of ${remoteTotal}`);
  }

  if (stocks.length < previousStocks.length * 0.9) {
    throw new Error(`Stock count dropped unexpectedly: ${previousStocks.length} -> ${stocks.length}`);
  }

  const codes = new Set(stocks.map((stock) => stock.code));
  if (codes.size !== stocks.length) {
    throw new Error(`Stock codes are not unique: ${stocks.length - codes.size} duplicates`);
  }

  const removed = previousStocks.filter((stock) => !codes.has(stock.code));
  const maxRemoved = Math.max(100, Math.ceil(previousStocks.length * 0.03));
  if (removed.length > maxRemoved) {
    throw new Error(`Too many stocks disappeared: ${removed.length} > ${maxRemoved}`);
  }

  const totalCapCoverage = stocks.filter((stock) => stock.totalMarketCap > 0).length / stocks.length;
  const floatCapCoverage = stocks.filter((stock) => stock.floatMarketCap > 0).length / stocks.length;
  if (totalCapCoverage < 0.9 || floatCapCoverage < 0.9) {
    throw new Error(
      `Market-cap coverage is too low: total=${(totalCapCoverage * 100).toFixed(2)}%, float=${(floatCapCoverage * 100).toFixed(2)}%`
    );
  }
}

async function writeJsonAtomically(filePath, value) {
  const temporaryPath = `${filePath}.tmp`;
  await fs.writeFile(temporaryPath, `${JSON.stringify(value)}\n`, "utf8");
  await fs.rename(temporaryPath, filePath);
}

async function main() {
  const [fallbackRaw, subboardsRaw] = await Promise.all([
    fs.readFile(fallbackPath, "utf8"),
    fs.readFile(subboardsPath, "utf8"),
  ]);
  const previousFallback = JSON.parse(fallbackRaw);
  const previousSubboards = JSON.parse(subboardsRaw);
  const previousStocksByCode = new Map(previousFallback.stocks.map((stock) => [stock.code, stock]));
  const sectorBySubBoard = buildSectorLookup(previousSubboards.subboards);

  const { rows, remoteTotal, source: dataSource } = await loadMarketRows(previousFallback, { source });
  const unknownSubBoards = new Set();
  const stocksByCode = new Map();
  const mappingsByCode = new Map();

  for (const row of rows) {
    const code = normalizeCode(row.f12, row.f13);
    const name = String(row.f14 ?? "").trim();
    if (!code || !name) {
      continue;
    }

    const previousStock = previousStocksByCode.get(code);
    const previousMapping = previousSubboards.subboards[code];
    const remoteSubBoardName = String(row.f100 ?? "").trim().replace(/Ⅱ$/, "");
    const subBoardName =
      (remoteSubBoardName && remoteSubBoardName !== "-" ? remoteSubBoardName : "") ||
      previousMapping?.subBoardName ||
      previousStock?.boardName ||
      "其他";
    const sectorName = sectorBySubBoard.get(subBoardName) ?? previousMapping?.sectorName ?? "其他";
    if (sectorName === "其他" && subBoardName !== "其他") {
      unknownSubBoards.add(subBoardName);
    }

    const totalMarketCap = finiteNumber(row.f20, previousStock?.totalMarketCap ?? 0);
    const floatMarketCap = finiteNumber(row.f21, previousStock?.floatMarketCap ?? totalMarketCap);
    const stock = {
      code,
      exchange: code.endsWith(".SH") ? "SH" : code.endsWith(".BJ") ? "BJ" : "SZ",
      name,
      boardName: sectorName,
      price: finiteNumber(row.f2, previousStock?.price ?? 0),
      changePct: finiteNumber(row.f3, 0),
      totalMarketCap,
      floatMarketCap,
    };

    stocksByCode.set(code, stock);
    mappingsByCode.set(code, { sectorName, subBoardName });
  }

  const stocks = Array.from(stocksByCode.values()).sort((left, right) => {
    const boardOrder = left.boardName.localeCompare(right.boardName, "zh-CN");
    if (boardOrder !== 0) return boardOrder;
    const capOrder = right.floatMarketCap - left.floatMarketCap;
    return capOrder !== 0 ? capOrder : left.code.localeCompare(right.code);
  });
  validateSnapshot(stocks, previousFallback.stocks, remoteTotal);

  const latestQuoteTimestamp = rows.reduce((latest, row) => Math.max(latest, finiteNumber(row.f124)), 0);
  const updatedAt = latestQuoteTimestamp > 0
    ? new Date(latestQuoteTimestamp * 1_000).toISOString()
    : new Date().toISOString();
  const fallbackSnapshot = {
    updatedAt,
    stockCount: stocks.length,
    boardCount: new Set(stocks.map((stock) => stock.boardName)).size,
    stocks,
  };
  const sortedMappings = Object.fromEntries(
    Array.from(mappingsByCode.entries()).sort(([left], [right]) => left.localeCompare(right))
  );
  const subboardSnapshot = {
    updatedAt,
    count: stocks.length,
    subboards: sortedMappings,
  };

  const previousCodes = new Set(previousFallback.stocks.map((stock) => stock.code));
  const added = stocks.filter((stock) => !previousCodes.has(stock.code));
  const removed = previousFallback.stocks.filter((stock) => !stocksByCode.has(stock.code));

  if (!checkOnly) {
    await Promise.all([
      writeJsonAtomically(fallbackPath, fallbackSnapshot),
      writeJsonAtomically(subboardsPath, subboardSnapshot),
    ]);
  }

  console.log(
    `${checkOnly ? "Validated" : "Updated"} ${stocks.length} stocks across ${fallbackSnapshot.boardCount} primary industries (${dataSource}); added ${added.length}, removed ${removed.length}.`
  );
  if (unknownSubBoards.size > 0) {
    console.warn(`Unmapped secondary industries were placed in 其他: ${Array.from(unknownSubBoards).sort().join(", ")}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(await fs.realpath(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
