import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { APICallError, generateObject, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import { isWatchlistAiConfigured, type WatchlistAiConfig } from "./watchlist-ai-config";

export * from "./watchlist-ai-config";

export type RecognizedStockHint = {
  name: string | null;
  code: string | null;
};

export type MatchedWatchlistCandidate = {
  id: string;
  hint: RecognizedStockHint;
  match: {
    code: string;
    name: string;
    boardName: string;
    subBoardName?: string;
    exchange?: "SH" | "SZ" | "BJ";
  } | null;
};

const recognizedStocksSchema = z.object({
  stocks: z.array(
    z.object({
      name: z.string().nullable(),
      code: z.string().nullable(),
    })
  ),
});

const maxImageEdge = 1280;
const jpegQuality = 0.82;

function trimSlash(url: string) {
  return url.replace(/\/+$/, "");
}

function loadImageElement(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Unable to decode image"));
    };
    image.src = url;
  });
}

export async function compressImageForVision(file: Blob): Promise<{
  dataUrl: string;
  base64: string;
  mediaType: "image/jpeg";
  byteLength: number;
}> {
  const image = await loadImageElement(file);
  const scale = Math.min(1, maxImageEdge / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Unable to create canvas context");
  }

  context.drawImage(image, 0, 0, width, height);
  const dataUrl = canvas.toDataURL("image/jpeg", jpegQuality);
  const base64 = dataUrl.split(",")[1] ?? "";
  if (!base64) {
    throw new Error("Unable to encode image");
  }
  const byteLength = Math.floor((base64.length * 3) / 4);

  return {
    dataUrl,
    base64,
    mediaType: "image/jpeg",
    byteLength,
  };
}

function normalizeHint(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function dedupeHints(hints: RecognizedStockHint[]) {
  const seen = new Set<string>();
  const result: RecognizedStockHint[] = [];

  for (const hint of hints) {
    const name = normalizeHint(hint.name);
    const code = normalizeHint(hint.code)?.toUpperCase().replace(/\s+/g, "") ?? null;
    if (!name && !code) {
      continue;
    }

    const key = `${code ?? ""}|${name ?? ""}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push({ name, code });
  }

  return result;
}

function readErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }
  return "";
}

function readApiCallMeta(error: unknown): { statusCode?: number; body?: string } {
  if (!APICallError.isInstance(error)) {
    return {};
  }

  const body =
    typeof error.responseBody === "string"
      ? error.responseBody.trim().slice(0, 280)
      : undefined;

  return {
    statusCode: typeof error.statusCode === "number" ? error.statusCode : undefined,
    body: body || undefined,
  };
}

export function classifyWatchlistAiError(error: unknown): "cors" | "config" | "network" | "parse" | "image" | "unknown" {
  const message = readErrorMessage(error).toLowerCase();
  const { statusCode } = readApiCallMeta(error);

  if (
    message.includes("unable to decode image") ||
    message.includes("unable to encode image") ||
    message.includes("unable to create canvas") ||
    message.includes("invalid data content")
  ) {
    return "image";
  }

  if (statusCode === 401 || statusCode === 403) {
    return "config";
  }

  if (
    message.includes("api key") ||
    message.includes("unauthorized") ||
    message.includes("401") ||
    message.includes("403") ||
    message.includes("invalid_api_key") ||
    message.includes("authentication")
  ) {
    return "config";
  }

  if (
    message.includes("parse") ||
    message.includes("schema") ||
    message.includes("no object") ||
    message.includes("json") ||
    NoObjectGeneratedError.isInstance(error)
  ) {
    return "parse";
  }

  if (statusCode === 404 || statusCode === 400 || statusCode === 422) {
    return "config";
  }

  // Browser CORS blocks usually surface as TypeError / Failed to fetch without status.
  if (
    !statusCode &&
    (error instanceof TypeError ||
      message.includes("failed to fetch") ||
      message.includes("networkerror") ||
      message.includes("cors") ||
      message.includes("access-control-allow-origin"))
  ) {
    return "cors";
  }

  if (message.includes("network") || message.includes("timeout") || statusCode === 408 || statusCode === 504) {
    return "network";
  }

  return "unknown";
}

export function formatWatchlistAiErrorDetail(error: unknown): string | null {
  const message = readErrorMessage(error);
  const { statusCode, body } = readApiCallMeta(error);
  const parts: string[] = [];

  if (statusCode) {
    parts.push(`HTTP ${statusCode}`);
  }

  if (message) {
    parts.push(message.slice(0, 200));
  }

  if (body && !message.toLowerCase().includes(body.toLowerCase().slice(0, 40))) {
    parts.push(body);
  }

  if (parts.length === 0) {
    return null;
  }

  return parts.join(" · ").replace(/(sk-[a-zA-Z0-9_-]{8,})/g, "sk-***");
}

export async function recognizeStocksFromScreenshot(
  config: WatchlistAiConfig,
  image: { base64: string; mediaType: string }
): Promise<RecognizedStockHint[]> {
  if (!isWatchlistAiConfigured(config)) {
    throw new Error("Watchlist AI is not configured");
  }

  const provider = createOpenAICompatible({
    name: "watchlist-ai",
    apiKey: config.apiKey.trim(),
    baseURL: trimSlash(config.baseURL.trim()),
  });

  const result = await generateObject({
    model: provider.chatModel(config.model.trim()),
    schema: recognizedStocksSchema,
    temperature: 0,
    instructions:
      "You extract A-share stocks (Shanghai, Shenzhen, Beijing) from screenshots. " +
      "Return only stocks that are clearly visible. Prefer 6-digit codes when present. " +
      "Ignore indices, funds, bonds, and non-A-share tickers. " +
      "If unsure about a field, use null. " +
      "Respond with valid JSON only.",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "List every distinct A-share stock visible in this screenshot. " +
              "For each stock provide Chinese or common name and/or code. " +
              "Return a JSON object with a stocks array of { name, code }.",
          },
          {
            type: "file",
            mediaType: image.mediaType.startsWith("image/") ? image.mediaType : "image/jpeg",
            // AI SDK expects raw base64 / bytes here — not a full data: URL.
            data: image.base64,
          },
        ],
      },
    ],
  });

  return dedupeHints(result.object.stocks);
}

type SearchApiItem = {
  code: string;
  name: string;
  boardName: string;
  subBoardName?: string;
  exchange?: "SH" | "SZ" | "BJ";
};

async function searchStock(query: string): Promise<SearchApiItem | null> {
  const response = await fetch(`/api/heatmap/search?q=${encodeURIComponent(query)}&limit=5`);
  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as { items?: SearchApiItem[] };
  const items = Array.isArray(payload.items) ? payload.items : [];
  if (items.length === 0) {
    return null;
  }

  const normalizedQuery = query.trim().toUpperCase().replace(/\s+/g, "");
  const exactCode = items.find((item) => {
    const symbol = item.code.split(".")[0]?.toUpperCase();
    return item.code.toUpperCase() === normalizedQuery || symbol === normalizedQuery;
  });
  if (exactCode) {
    return exactCode;
  }

  const exactName = items.find((item) => item.name === query.trim());
  return exactName ?? items[0] ?? null;
}

export async function matchRecognizedStocks(hints: RecognizedStockHint[]): Promise<MatchedWatchlistCandidate[]> {
  const candidates: MatchedWatchlistCandidate[] = [];
  const seenCodes = new Set<string>();

  for (const [index, hint] of hints.entries()) {
    let match: SearchApiItem | null = null;

    if (hint.code) {
      match = await searchStock(hint.code);
    }
    if (!match && hint.name) {
      match = await searchStock(hint.name);
    }

    if (match && seenCodes.has(match.code)) {
      candidates.push({
        id: `dup-${index}-${match.code}`,
        hint,
        match: null,
      });
      continue;
    }

    if (match) {
      seenCodes.add(match.code);
    }

    candidates.push({
      id: `${index}-${match?.code ?? hint.code ?? hint.name ?? "unknown"}`,
      hint,
      match,
    });
  }

  return candidates;
}
