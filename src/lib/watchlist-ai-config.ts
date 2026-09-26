export const watchlistAiStorageKey = "heatmap-watchlist-ai";

export type WatchlistAiConfig = {
  baseURL: string;
  apiKey: string;
  model: string;
};

const defaultConfig: WatchlistAiConfig = {
  baseURL: "https://api.openai.com/v1",
  apiKey: "",
  model: "gpt-4o-mini",
};

export function isWatchlistAiConfigured(config: WatchlistAiConfig) {
  return Boolean(config.baseURL.trim() && config.apiKey.trim() && config.model.trim());
}

export function parseStoredWatchlistAiConfig(raw: string | null): WatchlistAiConfig {
  if (!raw) {
    return { ...defaultConfig };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<Record<string, unknown>>;
    return {
      baseURL: typeof parsed.baseURL === "string" && parsed.baseURL.trim() ? parsed.baseURL.trim() : defaultConfig.baseURL,
      apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey : "",
      model: typeof parsed.model === "string" && parsed.model.trim() ? parsed.model.trim() : defaultConfig.model,
    };
  } catch {
    return { ...defaultConfig };
  }
}

export function serializeWatchlistAiConfig(config: WatchlistAiConfig) {
  return JSON.stringify({
    baseURL: config.baseURL.trim(),
    apiKey: config.apiKey,
    model: config.model.trim(),
  });
}

export function loadWatchlistAiConfig(): WatchlistAiConfig {
  if (typeof window === "undefined") {
    return { ...defaultConfig };
  }

  try {
    return parseStoredWatchlistAiConfig(window.localStorage.getItem(watchlistAiStorageKey));
  } catch {
    return { ...defaultConfig };
  }
}

export function saveWatchlistAiConfig(config: WatchlistAiConfig) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(watchlistAiStorageKey, serializeWatchlistAiConfig(config));
}

