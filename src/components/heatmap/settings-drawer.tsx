"use client";

import { useEffect, useState } from "react";
import { Bot, Check, Copy, ExternalLink, Info, Keyboard, Mail, Megaphone, Moon, Palette, Star, Sun, X } from "lucide-react";
import { toast } from "sonner";
import { WatchlistManager } from "@/components/watchlist-panel";
import { cn } from "@/lib/utils";
import { type HeatmapMessages, type Locale } from "@/lib/i18n";
import { type HeatTheme } from "@/lib/heatmap-themes";
import { defaultShortcutBindings, formatShortcutKey, formatShortcutLabel, shortcutActionIds, withReboundShortcut, type ShortcutActionId, type ShortcutBindings } from "@/lib/heatmap-shortcuts";
import { watchlistMaxCount } from "@/lib/market-heatmap";
import { type WatchlistItem } from "@/lib/watchlist";
import { getChangeTextColor } from "./colors";
import { authorMailto, githubProjectUrl, maxRefreshIntervalSeconds, minRefreshIntervalSeconds, themeColors } from "./constants";
import { getShortcutActionLabel } from "./format";
import { useIsMobile } from "./stream";
import { type DisplayMode, type FilterOpenMode, type PriceColorMode, type SettingsTab, type ThemeColorKey } from "./types";
import { GitHubMark } from "./github-mark";
import { HeatThemeSettingsPanel } from "./theme-settings-panel";

export function SettingsDrawer({
  open,
  tab,
  messages,
  locale,
  displayMode,
  filterOpenMode,
  headerTrendStats,
  heatmapBorders,
  refreshIntervalSeconds,
  themeColor,
  priceColorMode,
  heatThemeId,
  customHeatThemes,
  activeHeatTheme,
  shortcutBindings,
  watchlist,
  onClose,
  onTabChange,
  onLocaleChange,
  onDisplayModeChange,
  onFilterOpenModeChange,
  onHeaderTrendStatsChange,
  onHeatmapBordersChange,
  onRefreshIntervalChange,
  onThemeColorChange,
  onPriceColorModeChange,
  onHeatThemeIdChange,
  onCustomHeatThemesChange,
  onShortcutBindingsChange,
  onShortcutRecordingChange,
  onWatchlistAdd,
  onWatchlistRemove,
  onWatchlistClear,
  onWatchlistImportText,
  areaTipMessage,
}: {
  open: boolean;
  tab: SettingsTab;
  messages: HeatmapMessages;
  locale: Locale;
  displayMode: DisplayMode;
  filterOpenMode: FilterOpenMode;
  headerTrendStats: boolean;
  heatmapBorders: boolean;
  refreshIntervalSeconds: number;
  themeColor: ThemeColorKey;
  priceColorMode: PriceColorMode;
  heatThemeId: string;
  customHeatThemes: HeatTheme[];
  activeHeatTheme: HeatTheme;
  shortcutBindings: ShortcutBindings;
  watchlist: WatchlistItem[];
  areaTipMessage: string;
  onClose: () => void;
  onTabChange: (tab: SettingsTab) => void;
  onLocaleChange: (locale: Locale) => void;
  onDisplayModeChange: (mode: DisplayMode) => void;
  onFilterOpenModeChange: (mode: FilterOpenMode) => void;
  onHeaderTrendStatsChange: (enabled: boolean) => void;
  onHeatmapBordersChange: (enabled: boolean) => void;
  onRefreshIntervalChange: (seconds: number) => void;
  onThemeColorChange: (theme: ThemeColorKey) => void;
  onPriceColorModeChange: (mode: PriceColorMode) => void;
  onHeatThemeIdChange: (id: string) => void;
  onCustomHeatThemesChange: (themes: HeatTheme[]) => void;
  onShortcutBindingsChange: (bindings: ShortcutBindings) => void;
  onShortcutRecordingChange: (recording: boolean) => void;
  onWatchlistAdd: (item: WatchlistItem) => boolean;
  onWatchlistRemove: (code: string) => void;
  onWatchlistClear: () => void;
  onWatchlistImportText: (raw: string) => void;
}) {
  const isMobile = useIsMobile();
  const [recordingAction, setRecordingAction] = useState<ShortcutActionId | null>(null);
  const [copiedWebmcpPrompt, setCopiedWebmcpPrompt] = useState<string | null>(null);
  const [intervalDraft, setIntervalDraft] = useState(() => String(refreshIntervalSeconds));

  useEffect(() => {
    setIntervalDraft(String(refreshIntervalSeconds));
  }, [refreshIntervalSeconds]);

  // Discard an uncommitted draft when the drawer closes without a blur event.
  useEffect(() => {
    if (!open) {
      setIntervalDraft(String(refreshIntervalSeconds));
    }
  }, [open, refreshIntervalSeconds]);

  const commitRefreshInterval = () => {
    const parsed = Number.parseInt(intervalDraft, 10);
    if (!Number.isFinite(parsed)) {
      setIntervalDraft(String(refreshIntervalSeconds));
      return;
    }
    onRefreshIntervalChange(
      Math.min(maxRefreshIntervalSeconds, Math.max(minRefreshIntervalSeconds, parsed))
    );
  };

  const copyWebmcpPrompt = async (prompt: string) => {
    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard API unavailable");
      }
      await navigator.clipboard.writeText(prompt);
      setCopiedWebmcpPrompt(prompt);
      window.setTimeout(() => setCopiedWebmcpPrompt((current) => (current === prompt ? null : current)), 1800);
    } catch {
      toast.error(messages.webmcpPromptCopyFailed, { id: "webmcp-prompt-copy" });
    }
  };

  useEffect(() => {
    if (!open || tab !== "shortcuts") {
      setRecordingAction(null);
    }
  }, [open, tab]);

  useEffect(() => {
    if (isMobile && (tab === "shortcuts" || tab === "help" || tab === "webmcp")) {
      onTabChange("appearance");
    }
  }, [isMobile, onTabChange, tab]);

  useEffect(() => {
    onShortcutRecordingChange(Boolean(recordingAction));
    return () => {
      onShortcutRecordingChange(false);
    };
  }, [onShortcutRecordingChange, recordingAction]);

  useEffect(() => {
    if (!open || !recordingAction) {
      return;
    }

    const action = recordingAction;

    function onKeyDown(event: KeyboardEvent) {
      event.preventDefault();
      event.stopPropagation();

      if (event.key === "Escape") {
        setRecordingAction(null);
        return;
      }

      const key = formatShortcutKey(event);
      if (!key) {
        toast.error(messages.settingsShortcutsInvalid, { id: "shortcut-remap" });
        return;
      }

      const result = withReboundShortcut(shortcutBindings, action, key);
      if (result.invalid) {
        toast.error(messages.settingsShortcutsInvalid, { id: "shortcut-remap" });
        return;
      }

      if (result.conflict) {
        toast.error(
          messages.settingsShortcutsConflict.replace(
            "{action}",
            getShortcutActionLabel(messages, result.conflict)
          ),
          { id: "shortcut-remap" }
        );
        return;
      }

      onShortcutBindingsChange(result.bindings);
      setRecordingAction(null);
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [messages, onShortcutBindingsChange, open, recordingAction, shortcutBindings]);

  if (!open) {
    return null;
  }

  const isEnglish = locale === "en";
  const helpItems = [
    areaTipMessage,
    messages.tipColor,
    messages.tipThumbnail,
    messages.tipDoubleClick,
    messages.tipZoom,
    messages.tipDrag,
    messages.tipInspectorScroll,
    messages.tipInspectorSort,
  ];
  const tabs: Array<{ key: SettingsTab; label: string; icon: typeof Palette }> = [
    { key: "appearance", label: messages.settingsAppearance, icon: Palette },
    { key: "watchlist", label: messages.settingsWatchlist, icon: Star },
    ...(!isMobile
      ? [
          { key: "shortcuts" as const, label: messages.settingsShortcuts, icon: Keyboard },
          { key: "help" as const, label: messages.settingsHelp, icon: Info },
        ]
      : []),
    ...(!isMobile ? [{ key: "webmcp" as const, label: messages.settingsWebmcp, icon: Bot }] : []),
    { key: "project", label: messages.settingsProject, icon: ExternalLink },
  ];
  const themeLabels: Record<ThemeColorKey, string> = isEnglish
    ? { green: "Green", red: "Red", blue: "Blue", violet: "Violet" }
    : { green: "绿色", red: "红色", blue: "蓝色", violet: "紫色" };

  return (
    <div className="absolute inset-0 z-[10010] flex items-end justify-center bg-black/62 backdrop-blur-sm" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0" aria-label={messages.closeSheet} onClick={onClose} />
      <section className="relative flex h-[92dvh] w-full flex-col overflow-hidden rounded-t-lg border border-b-0 border-border bg-card text-card-foreground shadow-[0_-24px_100px_rgba(0,0,0,0.48)]">
        <div className="flex items-center justify-center pt-2">
          <span className="h-1 w-10 rounded-full bg-muted-foreground/40" aria-hidden />
        </div>
        <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold leading-tight">{messages.settingsTitle}</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{messages.settingsDescription}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={messages.closeSheet}
            className="inline-flex size-9 shrink-0 items-center justify-center border border-border bg-background/70 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 grid-rows-[48px_minmax(0,1fr)] md:grid-cols-[168px_minmax(0,1fr)] md:grid-rows-1">
          <nav className="flex h-12 min-h-12 gap-1 overflow-x-auto overflow-y-hidden border-b border-border bg-muted/20 px-2 py-1.5 md:h-auto md:min-h-0 md:flex-col md:overflow-x-visible md:border-b-0 md:border-r md:p-2">
            {tabs.map((item) => {
              const Icon = item.icon;
              const active = tab === item.key;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onTabChange(item.key)}
                  className={cn(
                    "inline-flex h-9 shrink-0 items-center gap-2 border px-3 text-left text-sm font-medium leading-none transition-colors md:w-full",
                    active
                      ? "border-brand/60 bg-brand/15 text-foreground"
                      : "border-transparent text-muted-foreground hover:border-border hover:bg-background/70 hover:text-foreground"
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="whitespace-nowrap">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className={cn("min-h-0 p-3 md:p-4", tab === "watchlist" ? "flex flex-col overflow-hidden" : "overflow-y-auto")}>
            {tab === "appearance" && (
              <div className="space-y-4 md:space-y-6">
                <section>
                  <h3 className="text-sm font-semibold">{messages.languageLabel}</h3>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onLocaleChange("zh")}
                      aria-pressed={locale === "zh"}
                      className={cn(
                        "border px-3 py-2 text-left text-sm font-semibold transition-colors md:py-3",
                        locale === "zh"
                          ? "border-brand/70 bg-brand/15 text-foreground"
                          : "border-border bg-background/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {messages.languageZh}
                    </button>
                    <button
                      type="button"
                      onClick={() => onLocaleChange("en")}
                      aria-pressed={locale === "en"}
                      className={cn(
                        "border px-3 py-2 text-left text-sm font-semibold transition-colors md:py-3",
                        locale === "en"
                          ? "border-brand/70 bg-brand/15 text-foreground"
                          : "border-border bg-background/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {messages.languageEn}
                    </button>
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-semibold">{messages.displayMode}</h3>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onDisplayModeChange("light")}
                      aria-pressed={displayMode === "light"}
                      className={cn(
                        "flex items-center gap-2 border px-3 py-2 text-left text-sm font-semibold transition-colors md:py-3",
                        displayMode === "light"
                          ? "border-brand/70 bg-brand/15 text-foreground"
                          : "border-border bg-background/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Sun className="size-4 shrink-0" />
                      {messages.lightMode}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDisplayModeChange("dark")}
                      aria-pressed={displayMode === "dark"}
                      className={cn(
                        "flex items-center gap-2 border px-3 py-2 text-left text-sm font-semibold transition-colors md:py-3",
                        displayMode === "dark"
                          ? "border-brand/70 bg-brand/15 text-foreground"
                          : "border-border bg-background/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Moon className="size-4 shrink-0" />
                      {messages.darkMode}
                    </button>
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-semibold">{messages.headerTrendStatsLabel}</h3>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onHeaderTrendStatsChange(false)}
                      aria-pressed={!headerTrendStats}
                      className={cn(
                        "border px-3 py-2 text-left text-sm font-semibold transition-colors md:py-3",
                        !headerTrendStats
                          ? "border-brand/70 bg-brand/15 text-foreground"
                          : "border-border bg-background/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {messages.headerTrendStatsOff}
                    </button>
                    <button
                      type="button"
                      onClick={() => onHeaderTrendStatsChange(true)}
                      aria-pressed={headerTrendStats}
                      className={cn(
                        "border px-3 py-2 text-left text-sm font-semibold transition-colors md:py-3",
                        headerTrendStats
                          ? "border-brand/70 bg-brand/15 text-foreground"
                          : "border-border bg-background/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {messages.headerTrendStatsOn}
                    </button>
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-semibold">{messages.heatmapBordersLabel}</h3>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onHeatmapBordersChange(false)}
                      aria-pressed={!heatmapBorders}
                      className={cn(
                        "border px-3 py-2 text-left text-sm font-semibold transition-colors md:py-3",
                        !heatmapBorders
                          ? "border-brand/70 bg-brand/15 text-foreground"
                          : "border-border bg-background/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {messages.heatmapBordersOff}
                    </button>
                    <button
                      type="button"
                      onClick={() => onHeatmapBordersChange(true)}
                      aria-pressed={heatmapBorders}
                      className={cn(
                        "border px-3 py-2 text-left text-sm font-semibold transition-colors md:py-3",
                        heatmapBorders
                          ? "border-brand/70 bg-brand/15 text-foreground"
                          : "border-border bg-background/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {messages.heatmapBordersOn}
                    </button>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {messages.heatmapBordersHint}
                  </p>
                </section>

                <section>
                  <h3 className="text-sm font-semibold">{messages.settingsRefreshIntervalLabel}</h3>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={minRefreshIntervalSeconds}
                      max={maxRefreshIntervalSeconds}
                      step={1}
                      value={intervalDraft}
                      onChange={(event) => setIntervalDraft(event.target.value)}
                      onBlur={commitRefreshInterval}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.currentTarget.blur();
                        }
                      }}
                      aria-label={messages.settingsRefreshIntervalLabel}
                      className="w-24 border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground transition-colors outline-none focus:border-brand/70 focus:ring-2 focus:ring-brand/30 md:py-3"
                    />
                    <span className="text-xs text-muted-foreground">
                      {messages.settingsRefreshIntervalUnit}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {messages.settingsRefreshIntervalHint.replace(
                      "{min}",
                      String(minRefreshIntervalSeconds)
                    ).replace("{max}", String(maxRefreshIntervalSeconds))}
                  </p>
                </section>

                {!isMobile && (
                  <section>
                    <h3 className="text-sm font-semibold">{messages.filterOpenModeLabel}</h3>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => onFilterOpenModeChange("click")}
                        aria-pressed={filterOpenMode === "click"}
                        className={cn(
                          "border px-3 py-2 text-left text-sm font-semibold transition-colors md:py-3",
                          filterOpenMode === "click"
                            ? "border-brand/70 bg-brand/15 text-foreground"
                            : "border-border bg-background/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        {messages.filterOpenModeClick}
                      </button>
                      <button
                        type="button"
                        onClick={() => onFilterOpenModeChange("hover")}
                        aria-pressed={filterOpenMode === "hover"}
                        className={cn(
                          "border px-3 py-2 text-left text-sm font-semibold transition-colors md:py-3",
                          filterOpenMode === "hover"
                            ? "border-brand/70 bg-brand/15 text-foreground"
                            : "border-border bg-background/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        {messages.filterOpenModeHover}
                      </button>
                    </div>
                  </section>
                )}

                <section>
                  <h3 className="text-sm font-semibold">{messages.themeColor}</h3>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {(Object.keys(themeColors) as ThemeColorKey[]).map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => onThemeColorChange(key)}
                        aria-pressed={themeColor === key}
                        className={cn(
                          "flex items-center gap-2 border px-3 py-2 text-sm font-medium transition-colors",
                          themeColor === key
                            ? "border-brand/70 bg-brand/15 text-foreground"
                            : "border-border bg-background/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <span
                          className="size-4 shrink-0 border border-white/20"
                          style={{ backgroundColor: themeColors[key].swatch }}
                        />
                        {themeLabels[key]}
                      </button>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-semibold">{messages.priceColor}</h3>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onPriceColorModeChange("red-rise")}
                      aria-pressed={priceColorMode === "red-rise"}
                      className={cn(
                        "border px-3 py-2 text-left text-sm transition-colors md:py-3",
                        priceColorMode === "red-rise"
                          ? "border-brand/70 bg-brand/15"
                          : "border-border bg-background/70 hover:bg-muted"
                      )}
                    >
                      <span className="font-semibold text-red-400">{messages.redRiseGreenFall}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">+2.4% / -1.8%</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onPriceColorModeChange("green-rise")}
                      aria-pressed={priceColorMode === "green-rise"}
                      className={cn(
                        "border px-3 py-2 text-left text-sm transition-colors md:py-3",
                        priceColorMode === "green-rise"
                          ? "border-brand/70 bg-brand/15"
                          : "border-border bg-background/70 hover:bg-muted"
                      )}
                    >
                      <span className="font-semibold text-emerald-400">{messages.greenRiseRedFall}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">+2.4% / -1.8%</span>
                    </button>
                  </div>
                </section>

                <HeatThemeSettingsPanel
                  messages={messages}
                  locale={locale}
                  displayMode={displayMode}
                  priceColorMode={priceColorMode}
                  heatThemeId={heatThemeId}
                  customHeatThemes={customHeatThemes}
                  activeHeatTheme={activeHeatTheme}
                  onHeatThemeIdChange={onHeatThemeIdChange}
                  onCustomHeatThemesChange={onCustomHeatThemesChange}
                />
              </div>
            )}

            {tab === "watchlist" && (
              <WatchlistManager
                messages={messages}
                locale={locale}
                items={watchlist}
                maxCount={watchlistMaxCount}
                active={open && tab === "watchlist"}
                changeTextColor={(changePct) =>
                  getChangeTextColor(activeHeatTheme, changePct, priceColorMode, displayMode)
                }
                onAdd={onWatchlistAdd}
                onRemove={onWatchlistRemove}
                onClear={onWatchlistClear}
                onImportText={onWatchlistImportText}
              />
            )}

            {tab === "shortcuts" && (
              <section className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold">{messages.settingsShortcuts}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {messages.settingsShortcutsIntro}
                  </p>
                </div>
                <div className="space-y-2">
                  {shortcutActionIds.map((action) => {
                    const active = recordingAction === action;
                    return (
                      <button
                        key={action}
                        type="button"
                        onClick={() =>
                          setRecordingAction((current) => (current === action ? null : action))
                        }
                        className={cn(
                          "flex w-full items-center justify-between gap-3 border px-3 py-2.5 text-left transition-colors",
                          active
                            ? "border-brand/70 bg-brand/15"
                            : "border-border bg-background/70 hover:bg-muted"
                        )}
                      >
                        <span className="min-w-0 text-sm font-medium text-foreground">
                          {getShortcutActionLabel(messages, action)}
                        </span>
                        <span
                          className={cn(
                            "inline-flex min-w-10 shrink-0 items-center justify-center border px-2 py-1 font-mono text-xs font-semibold",
                            active
                              ? "border-brand/50 bg-background/80 text-foreground"
                              : "border-border bg-muted/40 text-muted-foreground"
                          )}
                        >
                          {active
                            ? messages.settingsShortcutsRecording
                            : formatShortcutLabel(shortcutBindings[action])}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setRecordingAction(null);
                    onShortcutBindingsChange({ ...defaultShortcutBindings });
                  }}
                  className="border border-border bg-background/70 px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {messages.settingsShortcutsReset}
                </button>
              </section>
            )}

            {tab === "help" && (
              <div className="space-y-6">
                <section>
                  <h3 className="text-sm font-semibold">{messages.helpTitle}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{messages.helpIntro}</p>
                  <div className="mt-4 space-y-2">
                    {helpItems.map((item) => (
                      <div
                        key={item}
                        className="border border-border bg-background/70 px-3 py-2 text-sm text-muted-foreground"
                      >
                        {item.replace(/^·\s*/, "")}
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-semibold">{messages.helpShortcutsTitle}</h3>
                  <div className="mt-3 overflow-hidden border border-border">
                    {shortcutActionIds.map((action, index) => (
                      <div
                        key={action}
                        className={cn(
                          "flex items-center justify-between gap-3 bg-background/70 px-3 py-2 text-sm",
                          index > 0 && "border-t border-border"
                        )}
                      >
                        <span className="min-w-0 text-muted-foreground">
                          {getShortcutActionLabel(messages, action)}
                        </span>
                        <span className="inline-flex min-w-8 shrink-0 items-center justify-center border border-border bg-muted/40 px-2 py-0.5 font-mono text-xs font-semibold text-foreground">
                          {formatShortcutLabel(shortcutBindings[action])}
                        </span>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => onTabChange("shortcuts")}
                    className="mt-3 border border-border bg-background/70 px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {messages.helpShortcutsCta}
                  </button>
                </section>
              </div>
            )}

            {tab === "webmcp" && (
              <div className="space-y-5">
                <section>
                  <div className="flex items-start gap-3">
                    <span className="inline-flex size-9 shrink-0 items-center justify-center border border-brand/45 bg-brand/12 text-brand">
                      <Bot className="size-4" />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold">{messages.webmcpTitle}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{messages.webmcpIntro}</p>
                    </div>
                  </div>
                </section>

                <section className="border border-border bg-background/70 p-3.5">
                  <h3 className="text-sm font-semibold">{messages.webmcpChatGPTTitle}</h3>
                  <ol className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
                    {[messages.webmcpChatGPTStep1, messages.webmcpChatGPTStep2, messages.webmcpChatGPTStep3].map(
                      (step, index) => (
                        <li key={step} className="flex items-start gap-2">
                          <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-brand/15 text-[11px] font-semibold text-brand">
                            {index + 1}
                          </span>
                          <span>{step}</span>
                        </li>
                      )
                    )}
                  </ol>
                  <a
                    href="https://help.openai.com/en/articles/20001423-using-site-tools-in-the-chatgpt-desktop-app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:text-brand/80"
                  >
                    {isEnglish ? "OpenAI Site tools guide" : "OpenAI Site tools 使用说明"}
                    <ExternalLink className="size-3" />
                  </a>
                </section>

                <section>
                  <h3 className="text-sm font-semibold">{isEnglish ? "Try these prompts" : "可以直接这样说"}</h3>
                  <div className="mt-3 space-y-2">
                    {[messages.webmcpPromptState, messages.webmcpPromptRanking, messages.webmcpPromptWatchlist, messages.webmcpPromptTheme].map(
                      (prompt) => (
                        <button
                          type="button"
                          key={prompt}
                          onClick={() => void copyWebmcpPrompt(prompt)}
                          title={copiedWebmcpPrompt === prompt ? messages.webmcpPromptCopied : messages.webmcpCopyPrompt}
                          aria-label={copiedWebmcpPrompt === prompt ? messages.webmcpPromptCopied : messages.webmcpCopyPrompt}
                          className="group flex w-full items-start justify-between gap-3 border border-border bg-muted/20 px-3 py-2.5 text-left transition-colors hover:border-brand/50 hover:bg-brand/8"
                        >
                          <span className="min-w-0 font-mono text-xs leading-relaxed text-foreground">{prompt}</span>
                          <span className="inline-flex shrink-0 items-center gap-1 pt-0.5 text-[10px] font-semibold text-muted-foreground group-hover:text-brand">
                            {copiedWebmcpPrompt === prompt ? <Check className="size-3" /> : <Copy className="size-3" />}
                            {copiedWebmcpPrompt === prompt ? messages.webmcpPromptCopied : messages.webmcpCopyPrompt}
                          </span>
                        </button>
                      )
                    )}
                  </div>
                </section>

                <section className="space-y-3">
                  <div className="border border-border bg-background/70 p-3.5">
                    <h3 className="text-sm font-semibold">{messages.webmcpChromeTitle}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{messages.webmcpChromeDescription}</p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                      <a
                        href="https://developer.chrome.com/docs/ai/webmcp"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:text-brand/80"
                      >
                        {messages.webmcpChromeDocsLink}
                        <ExternalLink className="size-3" />
                      </a>
                      <a
                        href="https://chromewebstore.google.com/detail/webmcp-model-context-tool/gbpdfapgefenggkahomfgkhfehlcenpd"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:text-brand/80"
                      >
                        {messages.webmcpInspectorLink}
                        <ExternalLink className="size-3" />
                      </a>
                    </div>
                  </div>
                  <div className="border border-dashed border-border bg-muted/15 p-3.5">
                    <h3 className="text-sm font-semibold">{messages.webmcpBrowserTitle}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{messages.webmcpBrowserDescription}</p>
                  </div>
                </section>
              </div>
            )}

            {tab === "project" && (
              <div className="space-y-4">
                <section className="border border-border bg-background/70 p-3.5">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex size-9 shrink-0 items-center justify-center border border-border bg-muted/40 text-foreground">
                      <GitHubMark className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold">{messages.githubProject}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {messages.githubProjectDescription}
                      </p>
                      <a
                        href={githubProjectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-brand transition-colors hover:text-brand/80"
                      >
                        github.com/wenyuanw/a-share-heatmap
                        <ExternalLink className="size-3.5 opacity-80" />
                      </a>
                    </div>
                  </div>
                </section>

                <section className="border border-border bg-background/70 p-3.5">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex size-9 shrink-0 items-center justify-center border border-border bg-muted/40 text-foreground">
                      <Mail className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold">{messages.projectAuthorTitle}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {messages.projectAuthorDescription}
                      </p>
                      <a
                        href={authorMailto}
                        className="mt-3 inline-flex items-center gap-1.5 font-mono text-[12px] font-semibold text-foreground transition-colors hover:text-brand"
                      >
                        {messages.projectAuthorEmail}
                      </a>
                    </div>
                  </div>
                </section>

                <section className="relative overflow-hidden border border-dashed border-brand/45 bg-brand/8 p-3.5">
                  <div
                    className="pointer-events-none absolute -right-6 -top-6 size-24 rotate-12 border border-brand/20 bg-brand/10"
                    aria-hidden
                  />
                  <div className="relative flex items-start gap-3">
                    <span className="inline-flex size-9 shrink-0 items-center justify-center border border-brand/40 bg-brand/15 text-brand">
                      <Megaphone className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-foreground">{messages.projectAdTitle}</h3>
                        <span className="border border-brand/40 bg-brand/15 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-brand">
                          OPEN
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                        {messages.projectAdDescription}
                      </p>
                      <a
                        href={`${authorMailto}?subject=${encodeURIComponent(
                          locale === "zh" ? "广告位招租咨询" : "Ad slot inquiry"
                        )}`}
                        className="mt-3 inline-flex items-center gap-1.5 border border-brand/50 bg-brand/15 px-2.5 py-1.5 text-[12px] font-semibold text-foreground transition-colors hover:bg-brand/25"
                      >
                        {messages.projectAdCta}
                        <Mail className="size-3.5 opacity-80" />
                      </a>
                    </div>
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

