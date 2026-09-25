"use client";

import { useEffect, useState } from "react";

import type { QuoteStreamEvent, ShareLogoRaster } from "./types";

export function usePollWhileVisible(task: () => void | Promise<void>, intervalMs: number) {
  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    let cancelled = false;
    let timer: number | null = null;

    const run = () => {
      if (cancelled) return;
      Promise.resolve(task()).catch(() => {
        /* Errors are handled by the task itself. */
      });
    };

    const start = () => {
      if (timer !== null) return;
      timer = window.setInterval(run, intervalMs);
    };

    const stop = () => {
      if (timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }
    };

    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        run();
        start();
      }
    };

    if (!document.hidden) {
      run();
      start();
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [task, intervalMs]);
}

export async function readQuoteStream(
  response: Response,
  onEvent: (event: QuoteStreamEvent) => void
) {
  if (!response.body) {
    throw new Error("Streaming response body is unavailable");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const consumeLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return;
    }
    onEvent(JSON.parse(trimmed) as QuoteStreamEvent);
  };

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      consumeLine(line);
    }

    if (done) {
      break;
    }
  }

  consumeLine(buffer);
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const query = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(query.matches);

    update();

    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", update);
      return () => query.removeEventListener("change", update);
    }

    query.addListener(update);
    return () => query.removeListener(update);
  }, []);

  return isMobile;
}

export function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }

      reject(new Error("Failed to export canvas"));
    }, "image/png");
  });
}

/**
 * SVG via `new Image().src = "/x.svg"` often fails to paint on canvas in WebKit
 * (`naturalWidth` 0 or empty draw). Fetch + Blob + createImageBitmap / decode() is reliable.
 */
export async function loadShareLogoRaster(): Promise<ShareLogoRaster> {
  const response = await fetch("/logo-share.svg", { cache: "force-cache" });
  if (!response.ok) {
    throw new Error(`Logo fetch failed: ${response.status}`);
  }

  const blob = await response.blob();

  if (typeof createImageBitmap !== "undefined") {
    try {
      const bitmap = await createImageBitmap(blob);
      if (bitmap.width > 0 && bitmap.height > 0) {
        return { kind: "bitmap", bitmap };
      }
      bitmap.close();
    } catch {
      /* fall through to HTMLImageElement */
    }
  }

  const objectUrl = URL.createObjectURL(blob);
  const image = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Logo <img> load failed"));
      image.src = objectUrl;
    });
    await image.decode();
    if (image.naturalWidth === 0 || image.naturalHeight === 0) {
      throw new Error("Logo has zero dimensions");
    }
    return { kind: "image", image };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function drawShareLogoRaster(
  context: CanvasRenderingContext2D,
  raster: ShareLogoRaster,
  x: number,
  y: number,
  width: number,
  height: number
) {
  if (raster.kind === "bitmap") {
    context.drawImage(raster.bitmap, x, y, width, height);
    raster.bitmap.close();
    return;
  }

  context.drawImage(raster.image, x, y, width, height);
}
