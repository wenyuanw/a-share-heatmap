export const watchlistStorageKey = "heatmap-watchlist";

export type WatchlistExchange = "SH" | "SZ" | "BJ";

export type WatchlistItem = {
  code: string;
  name: string;
  boardName?: string;
  subBoardName?: string;
  exchange?: WatchlistExchange;
};

export type WatchlistExportPayload = {
  version: 1;
  type: "a-share-heatmap-watchlist";
  exportedAt: string;
  items: WatchlistItem[];
};

export const watchlistExportType = "a-share-heatmap-watchlist";

function isWatchlistExchange(value: unknown): value is WatchlistExchange {
  return value === "SH" || value === "SZ" || value === "BJ";
}

function readOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function sanitizeWatchlistItems(parsed: unknown): WatchlistItem[] {
  if (!Array.isArray(parsed)) {
    return [];
  }

  const items: WatchlistItem[] = [];
  const seen = new Set<string>();

  for (const item of parsed) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const record = item as {
      code?: unknown;
      name?: unknown;
      boardName?: unknown;
      subBoardName?: unknown;
      exchange?: unknown;
    };
    const code = typeof record.code === "string" ? record.code.trim() : "";
    const name = typeof record.name === "string" ? record.name.trim() : "";
    if (!code || !name || seen.has(code)) {
      continue;
    }

    seen.add(code);
    items.push({
      code,
      name,
      boardName: readOptionalString(record.boardName),
      subBoardName: readOptionalString(record.subBoardName),
      exchange: isWatchlistExchange(record.exchange) ? record.exchange : undefined,
    });
  }

  return items;
}

export function parseStoredWatchlist(raw: string | null): WatchlistItem[] {
  if (!raw) {
    return [];
  }

  try {
    return sanitizeWatchlistItems(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function serializeWatchlist(items: WatchlistItem[]) {
  return JSON.stringify(items);
}

export function buildWatchlistExport(items: WatchlistItem[]): WatchlistExportPayload {
  return {
    version: 1,
    type: watchlistExportType,
    exportedAt: new Date().toISOString(),
    items,
  };
}

export function parseWatchlistExportPayload(raw: string): WatchlistItem[] | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    const payload = parsed as Partial<WatchlistExportPayload> & { items?: unknown };
    if (payload.type !== watchlistExportType || payload.version !== 1) {
      return null;
    }
    const items = sanitizeWatchlistItems(payload.items);
    return items.length > 0 ? items : null;
  } catch {
    return null;
  }
}
