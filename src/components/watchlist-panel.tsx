"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { Check, Download, Loader2, Plus, Search, Sparkles, Upload, X } from "lucide-react";

import { WatchlistAiDialog } from "@/components/watchlist-ai-dialog";
import { cn } from "@/lib/utils";
import type { HeatmapMessages, Locale } from "@/lib/i18n";
import { buildWatchlistExport, type WatchlistExchange, type WatchlistItem } from "@/lib/watchlist";
import { isWatchlistAiConfigured, loadWatchlistAiConfig } from "@/lib/watchlist-ai";
import { toast } from "sonner";

type StockSearchItem = {
  code: string;
  name: string;
  boardName: string;
  subBoardName?: string;
  exchange?: WatchlistExchange;
};

type QuoteMap = Record<string, { price: number; changePct: number; turnoverAmount: number }>;

const searchDebounceMs = 180;

function formatPrice(value: number) {
  return value.toFixed(value >= 100 ? 1 : 2);
}

function formatChange(value: number) {
  if (value > 0) {
    return `+${value.toFixed(2)}%`;
  }

  return `${value.toFixed(2)}%`;
}

function formatExchange(exchange: WatchlistExchange | undefined, locale: Locale) {
  if (!exchange) {
    return "";
  }

  if (locale === "en") {
    if (exchange === "SH") return "SSE";
    if (exchange === "SZ") return "SZSE";
    return "BSE";
  }

  if (exchange === "SH") return "上交所";
  if (exchange === "SZ") return "深交所";
  return "北交所";
}

function inferExchange(code: string, fallback?: WatchlistExchange): WatchlistExchange | undefined {
  if (fallback) {
    return fallback;
  }

  const match = code.toUpperCase().match(/\.(\w+)$/);
  if (match?.[1] === "SH" || match?.[1] === "SZ" || match?.[1] === "BJ") {
    return match[1];
  }

  return undefined;
}

function formatSector(boardName?: string, subBoardName?: string) {
  const board = boardName?.trim() ?? "";
  const subBoard = subBoardName?.trim() ?? "";
  if (board && subBoard && subBoard !== board) {
    return `${board} / ${subBoard}`;
  }

  return board || subBoard;
}

export function WatchlistManager({
  messages,
  locale,
  items,
  maxCount,
  active = true,
  changeTextColor,
  onAdd,
  onRemove,
  onClear,
  onImportText,
}: {
  messages: HeatmapMessages;
  locale: Locale;
  items: WatchlistItem[];
  maxCount: number;
  active?: boolean;
  changeTextColor: (changePct: number) => string;
  onAdd: (item: WatchlistItem) => boolean;
  onRemove: (code: string) => void;
  onClear: () => void;
  onImportText: (raw: string) => void;
}) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const handleExport = () => {
    if (items.length === 0) {
      return;
    }

    const blob = new Blob([JSON.stringify(buildWatchlistExport(items), null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `heatmap-watchlist-export-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    let raw = "";
    try {
      raw = await file.text();
    } catch {
      // Read failures surface as an invalid payload through the same toast path.
    }
    onImportText(raw);
  };
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StockSearchItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [quotes, setQuotes] = useState<QuoteMap>({});
  const [aiDialogOpen, setAiDialogOpen] = useState(false);

  const addedCodes = new Set(items.map((item) => item.code));
  const trimmedQuery = query.trim();
  const showDropdown = dropdownOpen && trimmedQuery.length > 0;

  useEffect(() => {
    if (!active || aiDialogOpen) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [active, aiDialogOpen]);

  useEffect(() => {
    if (items.length === 0) {
      setConfirmingClear(false);
    }
  }, [items.length]);

  useEffect(() => {
    if (!trimmedQuery) {
      setResults([]);
      setSearching(false);
      setActiveIndex(0);
      setDropdownOpen(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      setDropdownOpen(true);
      try {
        const response = await fetch(`/api/heatmap/search?q=${encodeURIComponent(trimmedQuery)}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error("search failed");
        }
        const payload = (await response.json()) as { items?: StockSearchItem[] };
        if (!controller.signal.aborted) {
          setResults(Array.isArray(payload.items) ? payload.items : []);
          setActiveIndex(0);
        }
      } catch {
        if (!controller.signal.aborted) {
          setResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setSearching(false);
        }
      }
    }, searchDebounceMs);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [trimmedQuery]);

  useEffect(() => {
    if (items.length === 0) {
      setQuotes({});
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({
      period: "day",
      codes: items.map((item) => item.code).join(","),
    });

    void fetch(`/api/heatmap/quotes?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("quotes failed");
        }
        return (await response.json()) as { quotes?: QuoteMap };
      })
      .then((payload) => {
        if (!controller.signal.aborted) {
          setQuotes(payload.quotes ?? {});
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setQuotes({});
        }
      });

    return () => {
      controller.abort();
    };
  }, [items]);

  useEffect(() => {
    if (!showDropdown) {
      return;
    }

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (target && rootRef.current?.contains(target)) {
        return;
      }
      setDropdownOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [showDropdown]);

  const visibleResults = results;

  function addStock(item: StockSearchItem) {
    const added = onAdd({
      code: item.code,
      name: item.name,
      boardName: item.boardName,
      subBoardName: item.subBoardName,
      exchange: inferExchange(item.code, item.exchange),
    });
    if (!added) {
      return;
    }
    setQuery("");
    setResults([]);
    setDropdownOpen(false);
    inputRef.current?.focus();
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const item = visibleResults[activeIndex] ?? visibleResults[0];
    if (!item) {
      return;
    }
    addStock(item);
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      if (showDropdown) {
        event.preventDefault();
        event.stopPropagation();
        setDropdownOpen(false);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (visibleResults.length === 0) {
        return;
      }
      setDropdownOpen(true);
      setActiveIndex((current) => (current + 1) % visibleResults.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (visibleResults.length === 0) {
        return;
      }
      setDropdownOpen(true);
      setActiveIndex((current) => (current - 1 + visibleResults.length) % visibleResults.length);
    }
  }

  return (
    <div ref={rootRef} className="relative flex min-h-0 flex-1 flex-col gap-4">
      <div className="shrink-0">
        <h3 className="text-sm font-semibold">{messages.markets.watchlist}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{messages.settingsWatchlistIntro}</p>
      </div>

      <form className="relative z-20 shrink-0" onSubmit={handleSubmit}>
        <label className="mb-1.5 block text-[12px] font-semibold text-muted-foreground">
          {messages.watchlistAdd}
        </label>
        <div className="flex h-9 items-center gap-1.5 border border-border bg-background px-2.5">
          <Search className="size-3.5 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              if (event.target.value.trim()) {
                setDropdownOpen(true);
              }
            }}
            onFocus={() => {
              if (trimmedQuery) {
                setDropdownOpen(true);
              }
            }}
            onKeyDown={handleSearchKeyDown}
            placeholder={messages.watchlistSearchPlaceholder}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            role="combobox"
            aria-expanded={showDropdown}
            aria-controls={listboxId}
            aria-autocomplete="list"
            className="h-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          {searching && <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />}
        </div>

        {showDropdown && (
          <div
            id={listboxId}
            role="listbox"
            className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 overflow-hidden border border-border bg-card text-card-foreground shadow-[0_16px_40px_rgba(0,0,0,0.28)]"
          >
            {searching && visibleResults.length === 0 ? (
              <p className="px-3 py-2.5 text-sm text-muted-foreground">{messages.watchlistSearching}</p>
            ) : visibleResults.length === 0 ? (
              <p className="px-3 py-2.5 text-sm text-muted-foreground">{messages.watchlistSearchEmpty}</p>
            ) : (
              <div className="max-h-64 overflow-y-auto overscroll-contain">
                {visibleResults.map((item, index) => {
                  const added = addedCodes.has(item.code);
                  const isActive = index === activeIndex;
                  const exchangeLabel = formatExchange(inferExchange(item.code, item.exchange), locale);
                  const sector = formatSector(item.boardName, item.subBoardName);

                  return (
                    <button
                      key={item.code}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onClick={() => addStock(item)}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
                        isActive ? "bg-brand/14" : "bg-card hover:bg-muted"
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-foreground">{item.name}</span>
                        <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                          {[item.code, exchangeLabel, sector].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      {added ? (
                        <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-muted-foreground">
                          <Check className="size-3.5" />
                          {messages.watchlistAlreadyAdded}
                        </span>
                      ) : (
                        <Plus className="size-3.5 shrink-0 text-muted-foreground" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </form>

      <button
        type="button"
        onClick={() => {
          if (!isWatchlistAiConfigured(loadWatchlistAiConfig())) {
            toast.message(messages.watchlistAiNeedConfigTitle, { id: "watchlist-ai" });
          }
          setAiDialogOpen(true);
        }}
        className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 border border-dashed border-border bg-muted/10 px-3 text-[13px] font-medium text-muted-foreground transition-colors hover:border-brand/45 hover:bg-brand/8 hover:text-foreground"
      >
        <Sparkles className="size-3.5" />
        {messages.watchlistAiOpen}
      </button>

      <section className="flex min-h-0 flex-1 flex-col">
        <div className="mb-1.5 flex shrink-0 items-center justify-between gap-2">
          <h4 className="text-[12px] font-semibold text-muted-foreground">
            {messages.watchlistAddedCount.replace("{count}", String(items.length))}
          </h4>
          {items.length > 0 && !confirmingClear && (
            <button
              type="button"
              onClick={() => setConfirmingClear(true)}
              className="text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {messages.watchlistClear}
            </button>
          )}
        </div>

        {confirmingClear && items.length > 0 && (
          <div className="mb-2 shrink-0 border border-destructive/35 bg-destructive/8 px-3 py-2.5">
            <p className="text-[12px] leading-5 text-foreground">
              {messages.watchlistClearConfirm.replace("{count}", String(items.length))}
            </p>
            <div className="mt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmingClear(false)}
                className="h-7 border border-border bg-background px-2.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {messages.watchlistClearCancel}
              </button>
              <button
                type="button"
                onClick={() => {
                  onClear();
                  setConfirmingClear(false);
                }}
                className="h-7 border border-destructive/40 bg-destructive/15 px-2.5 text-[12px] font-semibold text-destructive transition-colors hover:bg-destructive/25"
              >
                {messages.watchlistClearConfirmAction}
              </button>
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <p className="border border-dashed border-border px-3 py-3.5 text-sm leading-6 text-muted-foreground">
            {messages.watchlistEmptyTitle}
          </p>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border border-border">
            {items.map((item) => {
              const quote = quotes[item.code];
              const exchangeLabel = formatExchange(inferExchange(item.code, item.exchange), locale);
              const sector = formatSector(item.boardName, item.subBoardName);
              const hasQuote = Boolean(quote && Number.isFinite(quote.price) && quote.price > 0);

              return (
                <div
                  key={item.code}
                  className="flex items-start gap-3 border-b border-border px-3 py-2.5 last:border-b-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="min-w-0 truncate text-sm font-semibold text-foreground">{item.name}</p>
                      <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                        {hasQuote ? formatPrice(quote.price) : "--"}
                      </p>
                    </div>
                    <div className="mt-0.5 flex items-baseline justify-between gap-3 text-[11px]">
                      <p className="min-w-0 truncate text-muted-foreground">
                        {[item.code, exchangeLabel].filter(Boolean).join(" · ")}
                      </p>
                      <p
                        className="shrink-0 font-semibold tabular-nums"
                        style={{
                          color: hasQuote ? changeTextColor(quote.changePct) : undefined,
                        }}
                      >
                        {hasQuote ? formatChange(quote.changePct) : "--"}
                      </p>
                    </div>
                    {sector ? (
                      <p className="mt-1 truncate text-[11px] text-muted-foreground">{sector}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(item.code)}
                    aria-label={`${messages.watchlistRemove} ${item.name}`}
                    className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <div className="mt-1.5 flex shrink-0 items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">
            {items.length}/{maxCount}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => importInputRef.current?.click()}
              aria-label={messages.watchlistImportAction}
              className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-transparent px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
            >
              <Upload className="size-3" />
              {messages.watchlistImportAction}
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={items.length === 0}
              aria-label={messages.watchlistExportAction}
              className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-transparent px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
            >
              <Download className="size-3" />
              {messages.watchlistExportAction}
            </button>
          </div>
        </div>
        <input
          ref={importInputRef}
          type="file"
          accept="application/json,.json"
          onChange={handleImportFile}
          className="hidden"
        />
      </section>

      <WatchlistAiDialog
        open={aiDialogOpen}
        messages={messages}
        locale={locale}
        items={items}
        onAdd={onAdd}
        onClose={() => setAiDialogOpen(false)}
      />
    </div>
  );
}
