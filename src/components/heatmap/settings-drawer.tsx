"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import Link from "next/link";
import { Bot, Check, ChevronDown, Coffee, Copy, ExternalLink, Info, Keyboard, Mail, Megaphone, Moon, Palette, Star, Sun, X } from "lucide-react";
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
import { useHoverCapable, useIsMobile } from "./stream";
import { type DisplayMode, type FilterOpenMode, type PriceColorMode, type SettingsTab, type ThemeColorKey } from "./types";
import { GitHubMark } from "./github-mark";
import { RewardPanel } from "./reward-tip";
import { RewardImage } from "./reward-image";
import { SupporterThanks } from "./supporter-thanks";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HeatThemeSettingsPanel } from "./theme-settings-panel";

/** One setting per row: label and hint on the left, control on the right (stacked on mobile). */
function SettingRow({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 py-3 first:pt-0 md:flex-row md:items-center md:justify-between md:gap-8 md:py-3.5">
      <div className="min-w-0 md:max-w-[26rem]">
        <h3 className="text-sm font-semibold">{title}</h3>
        {hint && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </section>
  );
}

/** A row in the project tab: icon, title and description, with the link on the right on desktop. */
function ProjectRow({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2 p-3.5 md:flex-row md:items-center md:gap-6">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="inline-flex size-9 shrink-0 items-center justify-center border border-border bg-muted/40 text-foreground">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="min-w-0 pl-12 md:shrink-0 md:pl-0">{children}</div>
    </section>
  );
}

function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: ReactNode }>;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("grid w-full gap-1 border border-border bg-background/60 p-1 md:w-72", className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            className={cn(
              "flex min-h-9 min-w-0 items-center justify-center gap-1.5 px-2 py-1.5 text-center text-[13px] font-semibold leading-tight transition-colors md:min-h-8",
              active
                ? "bg-brand/18 text-foreground shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--brand)_65%,transparent)]"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

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
  const hoverCapable = useHoverCapable();
  // 桌面端悬停整张卡片预览、点击放大；触屏设备默认在卡片内展开。
  // 解析前（null）按未展开渲染，避免首帧先展开再收起的闪动。
  const rewardPanelId = useId();
  const titleId = useId();
  const touchOnly = hoverCapable === false;
  const [rewardInlineOpen, setRewardInlineOpen] = useState(false);
  const [rewardPreviewOpen, setRewardPreviewOpen] = useState(false);
  const [rewardZoomOpen, setRewardZoomOpen] = useState(false);

  const openRewardZoom = () => {
    setRewardPreviewOpen(false);
    setRewardZoomOpen(true);
  };

  useEffect(() => {
    if (!open || tab !== "project") {
      setRewardPreviewOpen(false);
    }
  }, [open, tab]);

  useEffect(() => {
    setRewardInlineOpen(hoverCapable === false);
  }, [hoverCapable]);

  useEffect(() => {
    if (!open) {
      setRewardInlineOpen(hoverCapable === false);
      setRewardZoomOpen(false);
    }
  }, [hoverCapable, open]);

  // 放大赞赏码时，Esc 只关闭放大层，不连带着把设置抽屉一起关掉。
  useEffect(() => {
    if (!rewardZoomOpen) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      setRewardZoomOpen(false);
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [rewardZoomOpen]);

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
  const rewardTrigger = (
    <button
      type="button"
      onClick={touchOnly ? () => setRewardInlineOpen((current) => !current) : openRewardZoom}
      aria-expanded={touchOnly ? rewardInlineOpen : undefined}
      aria-controls={touchOnly ? rewardPanelId : undefined}
      aria-haspopup={touchOnly ? undefined : "dialog"}
      className="inline-flex max-w-full items-center gap-3 text-left transition-colors hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
    >
      {/* 扩展按钮命中区域到整张卡片，保留标题尺寸作为浮层定位锚点。 */}
      <span aria-hidden className="absolute inset-0" />
      <span className="inline-flex size-9 shrink-0 items-center justify-center border border-border bg-muted/40">
        <Coffee className="size-4" />
      </span>
      <span className="text-sm font-semibold">{messages.projectSupportTitle}</span>
      {touchOnly && (
        <ChevronDown className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", rewardInlineOpen && "rotate-180")} />
      )}
    </button>
  );

  return (
    <div
      className="absolute inset-0 z-[10010] flex items-end justify-center bg-black/62 backdrop-blur-sm md:items-center md:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button type="button" className="absolute inset-0" aria-label={messages.closeSheet} onClick={onClose} />
      <section className="relative flex h-[92dvh] w-full flex-col overflow-hidden rounded-t-lg border border-b-0 border-border bg-card text-card-foreground shadow-[0_-24px_100px_rgba(0,0,0,0.48)] md:h-[min(46rem,100%)] md:max-w-[58rem] md:rounded-lg md:border-b md:shadow-[0_24px_100px_rgba(0,0,0,0.48)]">
        <div className="flex items-center justify-center pt-2 md:hidden">
          <span className="h-1 w-10 rounded-full bg-muted-foreground/40" aria-hidden />
        </div>
        <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold leading-tight">{messages.settingsTitle}</h2>
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

          <div className={cn("min-h-0 p-3 md:px-6 md:py-5", tab === "watchlist" ? "flex flex-col overflow-hidden" : "overflow-y-auto")}>
            {tab === "appearance" && (
              <div className="space-y-4 md:space-y-5">
                <div className="divide-y divide-border/60">
                  <SettingRow title={messages.languageLabel}>
                    <SegmentedControl
                      label={messages.languageLabel}
                      value={locale}
                      onChange={onLocaleChange}
                      options={[
                        { value: "zh", label: messages.languageZh },
                        { value: "en", label: messages.languageEn },
                      ]}
                    />
                  </SettingRow>

                  <SettingRow title={messages.displayMode}>
                    <SegmentedControl
                      label={messages.displayMode}
                      value={displayMode}
                      onChange={onDisplayModeChange}
                      options={[
                        {
                          value: "light",
                          label: (
                            <>
                              <Sun className="size-3.5 shrink-0" />
                              {messages.lightMode}
                            </>
                          ),
                        },
                        {
                          value: "dark",
                          label: (
                            <>
                              <Moon className="size-3.5 shrink-0" />
                              {messages.darkMode}
                            </>
                          ),
                        },
                      ]}
                    />
                  </SettingRow>

                  <SettingRow title={messages.themeColor}>
                    <SegmentedControl
                      label={messages.themeColor}
                      value={themeColor}
                      onChange={onThemeColorChange}
                      options={(Object.keys(themeColors) as ThemeColorKey[]).map((key) => ({
                        value: key,
                        label: (
                          <>
                            <span
                              className="size-3 shrink-0 rounded-full border border-white/20"
                              style={{ backgroundColor: themeColors[key].swatch }}
                            />
                            {themeLabels[key]}
                          </>
                        ),
                      }))}
                    />
                  </SettingRow>

                  <SettingRow title={messages.priceColor}>
                    <SegmentedControl
                      label={messages.priceColor}
                      value={priceColorMode}
                      onChange={onPriceColorModeChange}
                      options={[
                        {
                          value: "red-rise",
                          label: <span className="text-red-400">{messages.redRiseGreenFall}</span>,
                        },
                        {
                          value: "green-rise",
                          label: <span className="text-emerald-400">{messages.greenRiseRedFall}</span>,
                        },
                      ]}
                    />
                  </SettingRow>

                  <SettingRow title={messages.headerTrendStatsLabel}>
                    <SegmentedControl
                      label={messages.headerTrendStatsLabel}
                      value={headerTrendStats ? "on" : "off"}
                      onChange={(next) => onHeaderTrendStatsChange(next === "on")}
                      options={[
                        { value: "off", label: messages.headerTrendStatsOff },
                        { value: "on", label: messages.headerTrendStatsOn },
                      ]}
                    />
                  </SettingRow>

                  <SettingRow title={messages.heatmapBordersLabel} hint={messages.heatmapBordersHint}>
                    <SegmentedControl
                      label={messages.heatmapBordersLabel}
                      value={heatmapBorders ? "on" : "off"}
                      onChange={(next) => onHeatmapBordersChange(next === "on")}
                      options={[
                        { value: "off", label: messages.heatmapBordersOff },
                        { value: "on", label: messages.heatmapBordersOn },
                      ]}
                    />
                  </SettingRow>

                  {!isMobile && (
                    <SettingRow title={messages.filterOpenModeLabel}>
                      <SegmentedControl
                        label={messages.filterOpenModeLabel}
                        value={filterOpenMode}
                        onChange={onFilterOpenModeChange}
                        options={[
                          { value: "click", label: messages.filterOpenModeClick },
                          { value: "hover", label: messages.filterOpenModeHover },
                        ]}
                      />
                    </SettingRow>
                  )}

                  <SettingRow
                    title={messages.settingsRefreshIntervalLabel}
                    hint={messages.settingsRefreshIntervalHint.replace(
                      "{min}",
                      String(minRefreshIntervalSeconds)
                    ).replace("{max}", String(maxRefreshIntervalSeconds))}
                  >
                    <div className="flex items-center gap-2">
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
                        className="h-10 w-24 border border-border bg-background px-3 text-sm font-semibold text-foreground transition-colors outline-none focus:border-brand/70 focus:ring-2 focus:ring-brand/30"
                      />
                      <span className="text-xs text-muted-foreground">
                        {messages.settingsRefreshIntervalUnit}
                      </span>
                    </div>
                  </SettingRow>
                </div>

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
                <div className="divide-y divide-border/60 border border-border">
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
                          "flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors",
                          active
                            ? "bg-brand/15 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--brand)_65%,transparent)]"
                            : "bg-background/70 hover:bg-muted"
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
                  <div className="mt-3 divide-y divide-border/60 border border-border">
                    {helpItems.map((item) => (
                      <div
                        key={item}
                        className="bg-background/70 px-3 py-2.5 text-sm leading-relaxed text-muted-foreground"
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
                          "flex items-center justify-between gap-3 bg-background/70 px-3 py-2.5 text-sm",
                          index > 0 && "border-t border-border/60"
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
              <div className="space-y-5">
                <div className="divide-y divide-border/60 border border-border bg-background/70">
                  <ProjectRow
                    icon={<GitHubMark className="size-4" />}
                    title={messages.githubProject}
                    description={messages.githubProjectDescription}
                  >
                    <a
                      href={githubProjectUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex max-w-full items-center gap-1.5 text-[12px] font-semibold text-brand transition-colors hover:text-brand/80"
                    >
                      <span className="truncate">github.com/wenyuanw/a-share-heatmap</span>
                      <ExternalLink className="size-3.5 shrink-0 opacity-80" />
                    </a>
                  </ProjectRow>

                  <ProjectRow
                    icon={<Mail className="size-4" />}
                    title={messages.projectAuthorTitle}
                    description={messages.projectAuthorDescription}
                  >
                    <a
                      href={authorMailto}
                      className="inline-flex items-center gap-1.5 font-mono text-[12px] font-semibold text-foreground transition-colors hover:text-brand"
                    >
                      {messages.projectAuthorEmail}
                    </a>
                  </ProjectRow>

                  <section>
                    <div className="relative p-3.5 transition-colors hover:bg-muted/40">
                      {hoverCapable === true ? (
                        <TooltipProvider>
                          <Tooltip open={rewardPreviewOpen && !rewardZoomOpen} onOpenChange={setRewardPreviewOpen}>
                            <TooltipTrigger asChild>{rewardTrigger}</TooltipTrigger>
                            <TooltipContent
                              side={isMobile ? "bottom" : "right"}
                              align={isMobile ? "start" : "center"}
                              collisionPadding={16}
                              className="z-[10020] overflow-y-auto p-3"
                              style={{
                                width: "min(320px, calc(100vw - 32px), calc(100dvh - 112px))",
                                maxHeight: "var(--radix-tooltip-content-available-height)",
                              }}
                            >
                              <RewardPanel messages={messages} onImageClick={openRewardZoom} />
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : rewardTrigger}
                      <p className="ml-12 mt-1 text-xs leading-relaxed text-muted-foreground">
                        {messages.projectSupportDescription}
                      </p>
                    </div>
                    {touchOnly && (
                      <div id={rewardPanelId} hidden={!rewardInlineOpen} className="border-t border-border px-3.5 py-3">
                        {rewardInlineOpen && (
                          <div className="mx-auto w-full max-w-80">
                            <RewardPanel messages={messages} onImageClick={openRewardZoom} />
                          </div>
                        )}
                      </div>
                    )}
                  </section>
                </div>

                <SupporterThanks messages={messages} />

                <section className="border border-dashed border-brand/40 bg-brand/6 p-3.5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
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
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {messages.projectAdDescription}
                        </p>
                      </div>
                    </div>
                    <a
                      href={`${authorMailto}?subject=${encodeURIComponent(
                        locale === "zh" ? "广告位招租咨询" : "Ad slot inquiry"
                      )}`}
                      className="ml-12 inline-flex shrink-0 items-center gap-1.5 self-start border border-brand/50 bg-brand/15 px-2.5 py-1.5 text-[12px] font-semibold text-foreground transition-colors hover:bg-brand/25 md:ml-0 md:self-center"
                    >
                      {messages.projectAdCta}
                      <Mail className="size-3.5 opacity-80" />
                    </a>
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-semibold">{messages.sitePagesTitle}</h3>
                  <div className="mt-2.5 grid grid-cols-2 gap-2 md:grid-cols-4">
                    {(
                      [
                        ["/features", messages.sitePageFeatures],
                        ["/changelog", messages.sitePageChangelog],
                        ["/whats-new", messages.sitePageWhatsNew],
                        ["/sponsors", messages.sitePageSponsors],
                      ] as const
                    ).map(([href, label]) => (
                      <Link
                        key={href}
                        href={href}
                        className="inline-flex items-center justify-between gap-1.5 border border-border bg-background/70 px-3 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:border-brand/40 hover:bg-muted hover:text-foreground"
                      >
                        {label}
                        <ExternalLink className="size-3 shrink-0 opacity-60" />
                      </Link>
                    ))}
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>
      </section>

      {rewardZoomOpen && (
        <div
          className="absolute inset-0 z-[10040] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={messages.projectSupportTitle}
        >
          <button
            type="button"
            className="absolute inset-0"
            aria-label={messages.closeSheet}
            onClick={() => setRewardZoomOpen(false)}
          />
          <div className="relative flex max-h-full w-full max-w-[min(92vw,36rem)] flex-col overflow-hidden border border-border bg-card text-card-foreground shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold">{messages.projectSupportTitle}</h3>
              <button
                type="button"
                onClick={() => setRewardZoomOpen(false)}
                aria-label={messages.closeSheet}
                className="inline-flex size-8 shrink-0 items-center justify-center border border-border bg-background/70 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-3">
              <div className="border border-border">
                <RewardImage messages={messages} />
              </div>
            </div>
            <p className="border-t border-border px-4 py-2.5 text-center text-[11px] leading-relaxed text-muted-foreground">
              {messages.projectSupportScanHint}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

