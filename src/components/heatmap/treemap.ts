import type { HeatmapPeriodKey, TreemapResponse } from "@/lib/market-heatmap";

import { emptyQuoteMap, flatThreshold } from "./constants";
import { getLiveTurnoverAmount } from "./format";
import type { Bounds, BoardTrendStats, QuoteMap, SectorVisualStats, TreemapInput, TreemapRect } from "./types";
import type { HeatmapSizeMode } from "./types";

export function createEmptyWatchlistTreemap(period: HeatmapPeriodKey): TreemapResponse {
  return {
    market: "all",
    period,
    updatedAt: "",
    stockCount: 0,
    boardCount: 0,
    summary: {
      advanceCount: 0,
      flatCount: 0,
      declineCount: 0,
      turnoverAmount: 0,
      turnoverPreviousAmount: 0,
      turnoverDelta: 0,
      indexChangePct: 0,
    },
    nodes: [],
    source: "direct",
  };
}

export function countStockTrends(stocks: Array<{ code: string; changePct: number | null }>, quotes: QuoteMap): BoardTrendStats {
  let advanceCount = 0;
  let flatCount = 0;
  let declineCount = 0;

  for (const stock of stocks) {
    const changePct = quotes[stock.code]?.changePct ?? stock.changePct;

    if (changePct === null) {
      continue;
    }
    if (changePct > flatThreshold) {
      advanceCount += 1;
    } else if (changePct < -flatThreshold) {
      declineCount += 1;
    } else {
      flatCount += 1;
    }
  }

  return { advanceCount, flatCount, declineCount };
}

export function filterTreemapByStockPredicate(
  data: TreemapResponse,
  quotes: QuoteMap,
  predicate: (changePct: number) => boolean
): TreemapResponse {
  const filteredNodes = data.nodes
    .map((node) => {
      const filteredChildren = node.children.filter((stock) => {
        const changePct = quotes[stock.code]?.changePct ?? stock.changePct;
        return changePct !== null && predicate(changePct);
      });

      return {
        ...node,
        children: filteredChildren,
        stockCount: filteredChildren.length,
        value: filteredChildren.reduce((sum, stock) => sum + stock.value, 0),
      };
    })
    .filter((node) => node.children.length > 0);

  let advanceCount = 0;
  let flatCount = 0;
  let declineCount = 0;
  let turnoverAmount = 0;
  let totalStockCount = 0;

  for (const node of filteredNodes) {
    for (const stock of node.children) {
      const changePct = quotes[stock.code]?.changePct ?? stock.changePct;

      if (changePct !== null && changePct > flatThreshold) {
        advanceCount += 1;
      } else if (changePct !== null && changePct < -flatThreshold) {
        declineCount += 1;
      } else if (changePct !== null) {
        flatCount += 1;
      }

      turnoverAmount += getLiveTurnoverAmount(stock.code, stock.turnoverAmount, quotes);
      totalStockCount += 1;
    }
  }

  return {
    ...data,
    stockCount: totalStockCount,
    boardCount: filteredNodes.length,
    summary: {
      ...data.summary,
      advanceCount,
      flatCount,
      declineCount,
      turnoverAmount,
      turnoverPreviousAmount: 0,
      turnoverDelta: 0,
    },
    nodes: filteredNodes,
  };
}

export function normalizeSizeValue(value: number) {
  return Number.isFinite(value) && value > 0 ? value : 1;
}

export function getStockSizeValue(
  stock: { code: string; value: number; turnoverAmount: number },
  quotes: QuoteMap,
  sizeMode: HeatmapSizeMode
) {
  if (sizeMode === "turnover") {
    return normalizeSizeValue(getLiveTurnoverAmount(stock.code, stock.turnoverAmount, quotes));
  }

  return stock.value;
}

export function applySizeModeToTreemapData(
  data: TreemapResponse,
  quotes: QuoteMap,
  sizeMode: HeatmapSizeMode
): TreemapResponse {
  if (sizeMode === "marketCap") {
    return data;
  }

  const nodes = data.nodes
    .map((board) => {
      const children = board.children
        .map((stock) => ({
          ...stock,
          value: getStockSizeValue(stock, quotes, sizeMode),
        }))
        .sort((left, right) => right.value - left.value);
      const total = children.reduce((sum, stock) => sum + stock.value, 0);

      return {
        ...board,
        children,
        value: total,
        stockCount: children.length,
      };
    })
    .sort((left, right) => right.value - left.value);

  return {
    ...data,
    nodes,
  };
}

export function weightedAverageChange(
  stocks: Array<{ code: string; value: number; changePct: number | null }>,
  quotes: QuoteMap
) {
  let weightedSum = 0;
  let totalValue = 0;

  for (const stock of stocks) {
    const changePct = quotes[stock.code]?.changePct ?? stock.changePct;
    if (changePct === null) {
      continue;
    }
    weightedSum += changePct * stock.value;
    totalValue += stock.value;
  }

  if (totalValue <= 0) {
    return null;
  }

  return weightedSum / totalValue;
}

export function sectorStatsKey(boardName: string, subBoardName: string) {
  return `${boardName}\u0000${subBoardName}`;
}

export function buildSectorVisualStats(
  data: TreemapResponse | null,
  quotes: QuoteMap
): {
  boards: Map<string, SectorVisualStats>;
  subBoards: Map<string, SectorVisualStats>;
} {
  const boards = new Map<string, SectorVisualStats>();
  const subBoards = new Map<string, SectorVisualStats>();

  if (!data) {
    return { boards, subBoards };
  }

  for (const board of data.nodes) {
    boards.set(board.name, {
      changePct: weightedAverageChange(board.children, quotes),
      ...countStockTrends(board.children, quotes),
    });

    const stocksBySubBoard = new Map<string, typeof board.children>();
    for (const stock of board.children) {
      const subBoardName = stock.subBoardName || stock.boardName;
      const stocks = stocksBySubBoard.get(subBoardName) ?? [];
      stocks.push(stock);
      stocksBySubBoard.set(subBoardName, stocks);
    }

    for (const [subBoardName, stocks] of stocksBySubBoard) {
      subBoards.set(sectorStatsKey(board.name, subBoardName), {
        changePct: weightedAverageChange(stocks, quotes),
        ...countStockTrends(stocks, quotes),
      });
    }
  }

  return { boards, subBoards };
}

export function groupStocksBySubBoard<
  T extends {
    code: string;
    boardName: string;
    subBoardName: string;
    value: number;
    changePct: number | null;
  },
>(stocks: T[]) {
  const subBoardMap = new Map<string, T[]>();

  for (const stock of stocks) {
    const key = stock.subBoardName || stock.boardName;
    const current = subBoardMap.get(key) ?? [];
    current.push(stock);
    subBoardMap.set(key, current);
  }

  return Array.from(subBoardMap.entries())
    .map(([name, children]) => ({
      name,
      boardName: children[0]?.boardName ?? "",
      stockCount: children.length,
      value: children.reduce((sum, child) => sum + child.value, 0),
      changePct: weightedAverageChange(children, emptyQuoteMap),
      children: [...children].sort((left, right) => right.value - left.value),
    }))
    .sort((left, right) => right.value - left.value);
}

export function sortTreemapItems<T>(items: TreemapInput<T>[]) {
  return [...items]
    .filter((entry) => entry.value > 0)
    .sort((left, right) => right.value - left.value);
}

export function totalTreemapValue<T>(items: TreemapInput<T>[]) {
  let total = 0;
  for (const entry of items) {
    total += entry.value;
  }
  return total;
}

export function findBalancedSplitIndex<T>(items: TreemapInput<T>[]) {
  if (items.length <= 1) {
    return items.length;
  }

  const target = totalTreemapValue(items) / 2;
  let cumulative = 0;
  let bestIndex = 1;
  let bestDiff = Number.POSITIVE_INFINITY;

  for (let index = 1; index < items.length; index += 1) {
    cumulative += items[index - 1].value;
    const diff = Math.abs(target - cumulative);

    if (diff < bestDiff) {
      bestDiff = diff;
      bestIndex = index;
    }
  }

  return bestIndex;
}

export function splitBounds(bounds: Bounds, ratio: number) {
  const splitVertically = bounds.width >= bounds.height;

  if (splitVertically) {
    const leftWidth = bounds.width * ratio;
    return {
      first: { x: bounds.x, y: bounds.y, width: leftWidth, height: bounds.height },
      second: {
        x: bounds.x + leftWidth,
        y: bounds.y,
        width: Math.max(0, bounds.width - leftWidth),
        height: bounds.height,
      },
    };
  }

  const topHeight = bounds.height * ratio;
  return {
    first: { x: bounds.x, y: bounds.y, width: bounds.width, height: topHeight },
    second: {
      x: bounds.x,
      y: bounds.y + topHeight,
      width: bounds.width,
      height: Math.max(0, bounds.height - topHeight),
    },
  };
}

export function insetRect<T>(rect: TreemapRect<T>, gap: number) {
  const inset = gap / 2;

  return {
    ...rect,
    x: rect.x + inset,
    y: rect.y + inset,
    width: Math.max(0, rect.width - gap),
    height: Math.max(0, rect.height - gap),
  };
}

export function binaryTreemap<T>(items: TreemapInput<T>[], x: number, y: number, width: number, height: number, gap = 0) {
  const sortedItems = sortTreemapItems(items);

  function layout(entries: TreemapInput<T>[], bounds: Bounds): TreemapRect<T>[] {
    if (entries.length === 0 || bounds.width <= 1 || bounds.height <= 1) {
      return [];
    }

    if (entries.length === 1) {
      return [
        insetRect(
          {
            item: entries[0].item,
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
          },
          gap
        ),
      ];
    }

    const splitIndex = findBalancedSplitIndex(entries);
    const firstEntries = entries.slice(0, splitIndex);
    const secondEntries = entries.slice(splitIndex);

    if (firstEntries.length === 0 || secondEntries.length === 0) {
      return entries.map((entry, index) =>
        insetRect(
          {
            item: entry.item,
            x: bounds.x,
            y: bounds.y + (bounds.height / entries.length) * index,
            width: bounds.width,
            height: bounds.height / entries.length,
          },
          gap
        )
      );
    }

    const total = totalTreemapValue(entries);
    const firstRatio = totalTreemapValue(firstEntries) / total;
    const { first, second } = splitBounds(bounds, firstRatio);

    return [...layout(firstEntries, first), ...layout(secondEntries, second)];
  }

  return layout(sortedItems, { x, y, width, height }).filter((rect) => rect.width > 1 && rect.height > 1);
}
