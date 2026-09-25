"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from "react";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Info,
  LayoutGrid,
  ListFilter,
  Loader2,
  Menu,
  Maximize2,
  Minimize2,
  Moon,
  Pencil,
  Plus,
  RotateCcw,
  Settings2,
  Share2,
  Star,
  Sun,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getMessages, type Locale } from "@/lib/i18n";
import {
  customHeatThemesStorageKey,
  defaultHeatThemeId,
  heatThemeStorageKey,
  legendGradientFromTheme,
  parseStoredCustomHeatThemes,
  mergeSeedHeatThemes,
  heatThemesSeedStorageKey,
  resolveHeatTheme,
  serializeCustomHeatThemes,
  type HeatTheme,
} from "@/lib/heatmap-themes";
import {
  defaultShortcutBindings,
  formatShortcutLabel,
  parseStoredShortcuts,
  resolveShortcutAction,
  serializeShortcuts,
  shortcutStorageKey,
  type ShortcutBindings,
} from "@/lib/heatmap-shortcuts";
import {
  isHeatmapPeriodKey,
  isHeatmapUniverse,
  periodDataUnavailableCode,
  watchlistMaxCount,
  watchlistUniverseKey,
  getBundledSnapshotTreemap,
  type HeatmapPeriodKey,
  type HeatmapUniverse,
  type MarketDataSource,
  type MarketKey,
  type MarketOverviewResponse,
  type TreemapResponse,
} from "@/lib/market-heatmap";
import {
  parseStoredWatchlist,
  parseWatchlistExportPayload,
  serializeWatchlist,
  watchlistStorageKey,
  type WatchlistItem,
} from "@/lib/watchlist";
import { useHeatmapWebMcp } from "@/hooks/use-heatmap-webmcp";
import { GitHubMark } from "@/components/heatmap/github-mark";
import { InspectorHeaderSparkline, InspectorSortControls } from "@/components/heatmap/inspector-parts";
import { MobileStockSheet } from "@/components/heatmap/mobile-stock-sheet";
import { HeatmapLoadingOverlay } from "@/components/heatmap/loading-overlay";
import { FilterPanel, FilterPopover } from "@/components/heatmap/filter-panel";
import { SettingsDrawer } from "@/components/heatmap/settings-drawer";
import {
  getBoardHeaderColor,
  getChangeTextColor,
  getFallTextColor,
  getHeatColor,
  getLegendGradient,
  getRiseTextColor,
} from "@/components/heatmap/colors";
import {
  allTrendsValue,
  boardFilterStorageKey,
  changeRangeFilterStorageKey,
  defaultRefreshIntervalSeconds,
  desktopMaxZoom,
  emptyChangeRangeFilter,
  emptyQuoteMap,
  fallingOnlyValue,
  filterHoverCloseDelayMs,
  filterHoverOpenDelayMs,
  filterOpenModeStorageKey,
  flatThreshold,
  githubProjectUrl,
  headerTrendStatsStorageKey,
  heatmapBordersQueryKey,
  heatmapBordersStorageKey,
  heatmapCanvasThemes,
  legendTicks,
  marketOptions,
  marketStorageKey,
  minZoom,
  mobileMaxZoom,
  periodStorageKey,
  progressiveQuoteCommitIntervalMs,
  refreshIntervalStorageKey,
  risingOnlyValue,
  themeColors,
  thumbnailModeStorageKey,
  trendFilterStorageKey,
} from "@/components/heatmap/constants";
import {
  compareInspectorStocks,
  cycleInspectorSortKey,
  formatBoardTrendCounts,
  formatChange,
  formatCompactChange,
  formatCount,
  formatPrice,
  formatShareTimestamp,
  formatTurnoverAmount,
  getCompactMarketLabel,
  getCompactPeriodLabel,
  getDailyKlineUrl,
  getLiveTurnoverAmount,
  getPeriodLabel,
  getSparklineUrl,
  getTurnoverTrend,
  parseStockCode,
  toXueqiuSymbol,
  withShortcutTitle,
} from "@/components/heatmap/format";
import {
  boardFiltersEqual,
  countActiveViewFilters,
  formatChangeRangeInput,
  formatChangeRangeSummary,
  isChangeRangeActive,
  matchesChangeRange,
  normalizeChangeRangeFilter,
  normalizeRefreshIntervalSeconds,
  parseChangeRangeInput,
  parseHeatmapBordersQuery,
  parseStoredBoardFilter,
  parseStoredChangeRangeFilter,
  sanitizeBoardFilter,
  toggleBoardInFilter,
} from "@/components/heatmap/filters";
import {
  applySizeModeToTreemapData,
  binaryTreemap,
  buildSectorVisualStats,
  countStockTrends,
  createEmptyWatchlistTreemap,
  filterTreemapByStockPredicate,
  groupStocksBySubBoard,
  sectorStatsKey,
  weightedAverageChange,
} from "@/components/heatmap/treemap";
import {
  drawSectorHeaderLabel,
  drawSectorThumbnailLabel,
  drawStockLabel,
  heatmapFont,
} from "@/components/heatmap/canvas-text";
import {
  canvasToBlob,
  drawShareLogoRaster,
  loadShareLogoRaster,
  readQuoteStream,
  useIsMobile,
  usePollWhileVisible,
} from "@/components/heatmap/stream";
import { clamp } from "@/lib/utils";
import {
  type BoardRect,
  type ChangeRangeFilter,
  type DisplayMode,
  type FilterOpenMode,
  type HeatmapSizeMode,
  type InspectorSortKey,
  type InspectorStockItem,
  type MarketOverview,
  type MarketSummary,
  type PendingQuoteCommit,
  type PriceColorMode,
  type QuoteLoadProgress,
  type QuoteMap,
  type ScreenshotPreview,
  type SettingsTab,
  type StockRect,
  type SubBoardRect,
  type ThemeColorKey,
} from "@/components/heatmap/types";

function clampOffset(width: number, height: number, scale: number, x: number, y: number) {
  if (scale <= 1) {
    return { x: 0, y: 0 };
  }

  const minX = width - width * scale;
  const minY = height - height * scale;

  return {
    x: clamp(x, minX, 0),
    y: clamp(y, minY, 0),
  };
}

export function MarketHeatmap({ locale: initialLocale }: { locale: Locale }) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const inspectorListRef = useRef<HTMLDivElement | null>(null);

  const [locale, setLocale] = useState<Locale>(initialLocale);
  const messages = useMemo(() => getMessages(locale).heatmap, [locale]);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [displayMode, setDisplayMode] = useState<DisplayMode>("dark");
  const [filterOpenMode, setFilterOpenMode] = useState<FilterOpenMode>("click");
  const [themeColor, setThemeColor] = useState<ThemeColorKey>("red");
  const [priceColorMode, setPriceColorMode] = useState<PriceColorMode>("red-rise");
  const [heatThemeId, setHeatThemeId] = useState(defaultHeatThemeId);
  const [customHeatThemes, setCustomHeatThemes] = useState<HeatTheme[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("appearance");
  const [shortcutBindings, setShortcutBindings] = useState<ShortcutBindings>(() => ({
    ...defaultShortcutBindings,
  }));
  const [shortcutRecording, setShortcutRecording] = useState(false);
  const [market, setMarket] = useState<HeatmapUniverse>("all");
  const [period, setPeriod] = useState<HeatmapPeriodKey>("day");
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [boardFilter, setBoardFilter] = useState<string[]>([]);
  const [trendFilter, setTrendFilter] = useState(allTrendsValue);
  const [changeRangeFilter, setChangeRangeFilter] = useState<ChangeRangeFilter>(emptyChangeRangeFilter);
  const [changeRangeMinInput, setChangeRangeMinInput] = useState("");
  const [changeRangeMaxInput, setChangeRangeMaxInput] = useState("");
  const [sizeMode, setSizeMode] = useState<HeatmapSizeMode>("marketCap");
  const [thumbnailMode, setThumbnailMode] = useState(false);
  const [headerTrendStats, setHeaderTrendStats] = useState(true);
  const [heatmapBordersPreference, setHeatmapBordersPreference] = useState(true);
  const [heatmapBordersUrlOverride, setHeatmapBordersUrlOverride] = useState<boolean | null>(null);
  const heatmapBorders = heatmapBordersUrlOverride ?? heatmapBordersPreference;
  const [refreshIntervalSeconds, setRefreshIntervalSeconds] = useState(defaultRefreshIntervalSeconds);
  const [marketSummaries, setMarketSummaries] = useState<Partial<Record<MarketKey, MarketSummary>>>({});
  const [treemapData, setTreemapData] = useState<TreemapResponse | null>(null);
  const [quotes, setQuotes] = useState<QuoteMap>({});
  const [settledQuotes, setSettledQuotes] = useState<QuoteMap>({});
  const [quoteLoadProgress, setQuoteLoadProgress] = useState<QuoteLoadProgress | null>(null);
  const [dataSource, setDataSource] = useState<MarketDataSource | null>(null);
  // The bundled sample snapshot is fetched once on mount and reused as an instant
  // pre-preference fallback so the very first render can already paint a full Canvas.
  const [initialSnapshot] = useState<TreemapResponse | null>(() => getBundledSnapshotTreemap());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const periodDataUnavailable = error === periodDataUnavailableCode;
  const [refreshRequestId, setRefreshRequestId] = useState(0);
  const [updatedAt, setUpdatedAt] = useState("");
  // Set once the Canvas has painted the bundled sample — from then on the sample
  // stays visible instead of being masked by the full-screen loading overlay.
  const [samplePainted, setSamplePainted] = useState(false);;

  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 760 });
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sharePreview, setSharePreview] = useState<ScreenshotPreview | null>(null);
  const [sharePending, setSharePending] = useState(false);

  const [hoveredStockCode, setHoveredStockCode] = useState<string | null>(null);
  const [hoveredBoardName, setHoveredBoardName] = useState<string | null>(null);
  const [hoveredBoardTitleName, setHoveredBoardTitleName] = useState<string | null>(null);
  const [hoveredSubBoardName, setHoveredSubBoardName] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const [selectedStockCode, setSelectedStockCode] = useState<string | null>(null);
  const [inspectorSortKey, setInspectorSortKey] = useState<InspectorSortKey>("changeDesc");
  const [selectedBoardName, setSelectedBoardName] = useState<string | null>(null);
  const [selectedSubBoardName, setSelectedSubBoardName] = useState<string | null>(null);
  const isEnglish = locale === "en";
  const isLightMode = displayMode === "light";
  const isMobile = useIsMobile();
  const maxZoom = isMobile ? mobileMaxZoom : desktopMaxZoom;
  const isDesktopHoverFilterMode = !isMobile && filterOpenMode === "hover";
  const activeHeatTheme = useMemo(
    () => resolveHeatTheme(heatThemeId, customHeatThemes),
    [customHeatThemes, heatThemeId]
  );
  const legendGradient = useMemo(
    () => getLegendGradient(activeHeatTheme, priceColorMode, displayMode),
    [activeHeatTheme, displayMode, priceColorMode]
  );
  const changeRangeSliderGradient = useMemo(
    () =>
      legendGradientFromTheme(
        activeHeatTheme,
        priceColorMode === "red-rise",
        displayMode,
        [-20, -10, -4, 0, 4, 10, 20]
      ),
    [activeHeatTheme, displayMode, priceColorMode]
  );
  const heatmapCanvasTheme = heatmapCanvasThemes[displayMode];
  const brandStyle = useMemo(
    () =>
      ({
        "--brand": themeColors[themeColor].swatch,
        "--brand-foreground": themeColors[themeColor].foreground,
      }) as CSSProperties,
    [themeColor]
  );
  const riseTextColor = getRiseTextColor(activeHeatTheme, priceColorMode, displayMode);
  const fallTextColor = getFallTextColor(activeHeatTheme, priceColorMode, displayMode);

  const activeStockCode = isMobile ? selectedStockCode : hoveredStockCode;
  const activeBoardName = isMobile ? selectedBoardName : hoveredBoardName;
  const activeSubBoardName = isMobile ? selectedSubBoardName : hoveredSubBoardName;

  const lastStockRectsRef = useRef<StockRect[]>([]);
  const lastBoardRectsRef = useRef<BoardRect[]>([]);
  const lastSubBoardRectsRef = useRef<SubBoardRect[]>([]);
  const quoteStreamRef = useRef<{ key: string; controller: AbortController } | null>(null);
  const pendingQuoteCommitRef = useRef<PendingQuoteCommit | null>(null);
  const quoteCommitTimerRef = useRef<number | null>(null);
  const quoteCommitFrameRef = useRef<number | null>(null);
  const lastQuoteCommitAtRef = useRef(0);
  const sidebarFilterTriggerRef = useRef<HTMLButtonElement>(null);
  const filterTriggerRefs = useMemo(() => [sidebarFilterTriggerRef], []);
  const filterHoverOpenTimerRef = useRef<number | null>(null);
  const filterHoverCloseTimerRef = useRef<number | null>(null);
  const dragStateRef = useRef({
    active: false,
    pointerX: 0,
    pointerY: 0,
    startX: 0,
    startY: 0,
    moved: false,
  });
  const boardClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStateRef = useRef<{
    mode: "idle" | "pan" | "pinch" | "tap";
    startClientX: number;
    startClientY: number;
    lastClientX: number;
    lastClientY: number;
    startTs: number;
    moved: boolean;
    startDistance: number;
    startScale: number;
    startOffsetX: number;
    startOffsetY: number;
    pinchCenterX: number;
    pinchCenterY: number;
    pinchWorldX: number;
    pinchWorldY: number;
    lastTapTs: number;
    lastTapX: number;
    lastTapY: number;
  }>({
    mode: "idle",
    startClientX: 0,
    startClientY: 0,
    lastClientX: 0,
    lastClientY: 0,
    startTs: 0,
    moved: false,
    startDistance: 0,
    startScale: 1,
    startOffsetX: 0,
    startOffsetY: 0,
    pinchCenterX: 0,
    pinchCenterY: 0,
    pinchWorldX: 0,
    pinchWorldY: 0,
    lastTapTs: 0,
    lastTapX: 0,
    lastTapY: 0,
  });

  const handleHeatmapBordersChange = useCallback((enabled: boolean) => {
    setHeatmapBordersPreference(enabled);
    setHeatmapBordersUrlOverride(null);

    const url = new URL(window.location.href);
    if (url.searchParams.has(heatmapBordersQueryKey)) {
      url.searchParams.delete(heatmapBordersQueryKey);
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    }
  }, []);

  useEffect(() => {
    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      setHeatmapBordersUrlOverride(parseHeatmapBordersQuery(params.get(heatmapBordersQueryKey)));
    };

    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);

  useEffect(() => {
    try {
      const storedLocale = window.localStorage.getItem("heatmap-locale");
      const storedDisplayMode = window.localStorage.getItem("heatmap-display-mode");
      const storedTheme = window.localStorage.getItem("heatmap-theme-color");
      const storedPriceColor = window.localStorage.getItem("heatmap-price-color");
      const storedFilterOpenMode = window.localStorage.getItem(filterOpenModeStorageKey);
      const storedSizeMode = window.localStorage.getItem("heatmap-size-mode");
      const storedThumbnailMode = window.localStorage.getItem(thumbnailModeStorageKey);
      const storedHeaderTrendStats = window.localStorage.getItem(headerTrendStatsStorageKey);
      const storedHeatmapBorders = window.localStorage.getItem(heatmapBordersStorageKey);
      const storedRefreshInterval = window.localStorage.getItem(refreshIntervalStorageKey);
      const storedMarket = window.sessionStorage.getItem(marketStorageKey);
      const storedPeriod = window.sessionStorage.getItem(periodStorageKey);
      const storedBoardFilter = window.sessionStorage.getItem(boardFilterStorageKey);
      const storedTrendFilter = window.sessionStorage.getItem(trendFilterStorageKey);
      const storedChangeRangeFilter = window.sessionStorage.getItem(changeRangeFilterStorageKey);
      const storedShortcuts = window.localStorage.getItem(shortcutStorageKey);
      const storedHeatThemeId = window.localStorage.getItem(heatThemeStorageKey);
      const storedCustomHeatThemes = window.localStorage.getItem(customHeatThemesStorageKey);
      const seedFlag = window.localStorage.getItem(heatThemesSeedStorageKey);

      if (storedLocale === "zh" || storedLocale === "en") {
        setLocale(storedLocale);
      }
      if (storedDisplayMode === "dark" || storedDisplayMode === "light") {
        setDisplayMode(storedDisplayMode);
      }
      if (storedTheme === "green" || storedTheme === "red" || storedTheme === "blue" || storedTheme === "violet") {
        setThemeColor(storedTheme);
      }
      if (storedPriceColor === "red-rise" || storedPriceColor === "green-rise") {
        setPriceColorMode(storedPriceColor);
      }
      if (storedFilterOpenMode === "click" || storedFilterOpenMode === "hover") {
        setFilterOpenMode(storedFilterOpenMode);
      }
      if (storedSizeMode === "marketCap" || storedSizeMode === "turnover") {
        setSizeMode(storedSizeMode);
      }
      if (storedThumbnailMode === "on" || storedThumbnailMode === "off") {
        setThumbnailMode(storedThumbnailMode === "on");
      }
      if (storedHeaderTrendStats === "on" || storedHeaderTrendStats === "off") {
        setHeaderTrendStats(storedHeaderTrendStats === "on");
      }
      if (storedHeatmapBorders === "on" || storedHeatmapBorders === "off") {
        setHeatmapBordersPreference(storedHeatmapBorders === "on");
      }
      setRefreshIntervalSeconds(normalizeRefreshIntervalSeconds(storedRefreshInterval));
      const storedWatchlist = window.localStorage.getItem(watchlistStorageKey);
      setWatchlist(parseStoredWatchlist(storedWatchlist));
      if (storedMarket && isHeatmapUniverse(storedMarket)) {
        setMarket(storedMarket);
      }
      if (storedPeriod && isHeatmapPeriodKey(storedPeriod)) {
        setPeriod(storedPeriod);
      }
      if (storedBoardFilter) {
        setBoardFilter(parseStoredBoardFilter(storedBoardFilter));
      }
      if (
        storedTrendFilter === allTrendsValue ||
        storedTrendFilter === risingOnlyValue ||
        storedTrendFilter === fallingOnlyValue
      ) {
        setTrendFilter(storedTrendFilter);
      }
      if (storedChangeRangeFilter) {
        const parsedChangeRange = parseStoredChangeRangeFilter(storedChangeRangeFilter);
        setChangeRangeFilter(parsedChangeRange);
        setChangeRangeMinInput(formatChangeRangeInput(parsedChangeRange.min));
        setChangeRangeMaxInput(formatChangeRangeInput(parsedChangeRange.max));
      }
      setShortcutBindings(parseStoredShortcuts(storedShortcuts));
      let customThemes = parseStoredCustomHeatThemes(storedCustomHeatThemes);
      if (!seedFlag) {
        customThemes = mergeSeedHeatThemes(customThemes);
        try {
          window.localStorage.setItem(heatThemesSeedStorageKey, "1");
          window.localStorage.setItem(customHeatThemesStorageKey, serializeCustomHeatThemes(customThemes));
        } catch {
          /* Preferences are optional. */
        }
      }
      setCustomHeatThemes(customThemes);
      if (storedHeatThemeId) {
        setHeatThemeId(resolveHeatTheme(storedHeatThemeId, customThemes).id);
      }
    } catch {
      /* Preferences are optional. */
    } finally {
      setPreferencesReady(true);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
    if (!preferencesReady) {
      return;
    }
    try {
      window.localStorage.setItem("heatmap-locale", locale);
    } catch {
      /* Preferences are optional. */
    }
  }, [locale, preferencesReady]);

  useEffect(() => {
    if (!preferencesReady) {
      return;
    }

    const isDark = displayMode === "dark";
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";

    try {
      window.localStorage.setItem("heatmap-display-mode", displayMode);
    } catch {
      /* Preferences are optional. */
    }
  }, [displayMode, preferencesReady]);

  useEffect(() => {
    if (!preferencesReady) {
      return;
    }
    try {
      window.localStorage.setItem("heatmap-theme-color", themeColor);
    } catch {
      /* Preferences are optional. */
    }
  }, [preferencesReady, themeColor]);

  useEffect(() => {
    if (!preferencesReady) {
      return;
    }
    try {
      window.localStorage.setItem("heatmap-price-color", priceColorMode);
    } catch {
      /* Preferences are optional. */
    }
  }, [preferencesReady, priceColorMode]);

  useEffect(() => {
    if (!preferencesReady) {
      return;
    }
    try {
      window.localStorage.setItem(filterOpenModeStorageKey, filterOpenMode);
    } catch {
      /* Preferences are optional. */
    }
  }, [filterOpenMode, preferencesReady]);

  useEffect(() => {
    if (!preferencesReady) {
      return;
    }
    try {
      window.localStorage.setItem("heatmap-size-mode", sizeMode);
    } catch {
      /* Preferences are optional. */
    }
  }, [preferencesReady, sizeMode]);

  useEffect(() => {
    if (!preferencesReady) {
      return;
    }
    try {
      window.localStorage.setItem(thumbnailModeStorageKey, thumbnailMode ? "on" : "off");
    } catch {
      /* Preferences are optional. */
    }
  }, [preferencesReady, thumbnailMode]);

  useEffect(() => {
    if (!preferencesReady) {
      return;
    }
    try {
      window.localStorage.setItem(headerTrendStatsStorageKey, headerTrendStats ? "on" : "off");
    } catch {
      /* Preferences are optional. */
    }
  }, [headerTrendStats, preferencesReady]);

  useEffect(() => {
    if (!preferencesReady) {
      return;
    }
    try {
      window.localStorage.setItem(heatmapBordersStorageKey, heatmapBordersPreference ? "on" : "off");
    } catch {
      /* Preferences are optional. */
    }
  }, [heatmapBordersPreference, preferencesReady]);

  useEffect(() => {
    if (!preferencesReady) {
      return;
    }
    try {
      window.localStorage.setItem(refreshIntervalStorageKey, String(refreshIntervalSeconds));
    } catch {
      /* Preferences are optional. */
    }
  }, [refreshIntervalSeconds, preferencesReady]);

  useEffect(() => {
    if (!preferencesReady) {
      return;
    }
    try {
      window.sessionStorage.setItem(marketStorageKey, market);
    } catch {
      /* Preferences are optional. */
    }
  }, [market, preferencesReady]);

  useEffect(() => {
    if (!preferencesReady) {
      return;
    }
    try {
      window.localStorage.setItem(watchlistStorageKey, serializeWatchlist(watchlist));
    } catch {
      /* Preferences are optional. */
    }
  }, [preferencesReady, watchlist]);

  useEffect(() => {
    if (!preferencesReady) {
      return;
    }
    try {
      window.sessionStorage.setItem(periodStorageKey, period);
    } catch {
      /* Preferences are optional. */
    }
  }, [period, preferencesReady]);

  useEffect(() => {
    if (!preferencesReady) {
      return;
    }
    try {
      window.sessionStorage.setItem(boardFilterStorageKey, JSON.stringify(boardFilter));
    } catch {
      /* Preferences are optional. */
    }
  }, [boardFilter, preferencesReady]);

  useEffect(() => {
    if (!preferencesReady) {
      return;
    }
    try {
      window.sessionStorage.setItem(trendFilterStorageKey, trendFilter);
    } catch {
      /* Preferences are optional. */
    }
  }, [preferencesReady, trendFilter]);

  useEffect(() => {
    if (!preferencesReady) {
      return;
    }
    try {
      window.sessionStorage.setItem(changeRangeFilterStorageKey, JSON.stringify(changeRangeFilter));
    } catch {
      /* Preferences are optional. */
    }
  }, [changeRangeFilter, preferencesReady]);

  useEffect(() => {
    if (!preferencesReady) {
      return;
    }
    try {
      window.localStorage.setItem(shortcutStorageKey, serializeShortcuts(shortcutBindings));
    } catch {
      /* Preferences are optional. */
    }
  }, [preferencesReady, shortcutBindings]);

  useEffect(() => {
    if (!preferencesReady) {
      return;
    }
    try {
      window.localStorage.setItem(heatThemeStorageKey, heatThemeId);
      window.localStorage.setItem(customHeatThemesStorageKey, serializeCustomHeatThemes(customHeatThemes));
    } catch {
      /* Preferences are optional. */
    }
  }, [customHeatThemes, heatThemeId, preferencesReady]);

  const areaTipMessage = useMemo(
    () => (sizeMode === "turnover" ? messages.tipAreaTurnover : messages.tipAreaMarketCap),
    [messages.tipAreaMarketCap, messages.tipAreaTurnover, sizeMode]
  );
  const refreshSize = useCallback(() => {
    const target = viewportRef.current;
    if (!target) {
      return;
    }

    const nextWidth = Math.max(1, Math.floor(target.clientWidth));
    const nextHeight = Math.max(1, Math.floor(target.clientHeight));

    setCanvasSize((current) => {
      if (current.width === nextWidth && current.height === nextHeight) {
        return current;
      }

      return { width: nextWidth, height: nextHeight };
    });
  }, []);

  const watchlistCodes = useMemo(() => watchlist.map((item) => item.code), [watchlist]);
  const watchlistCodeSet = useMemo(() => new Set(watchlistCodes), [watchlistCodes]);
  const isWatchlist = market === watchlistUniverseKey;

  const clearScheduledQuoteCommit = useCallback(() => {
    if (quoteCommitTimerRef.current !== null) {
      window.clearTimeout(quoteCommitTimerRef.current);
      quoteCommitTimerRef.current = null;
    }
    if (quoteCommitFrameRef.current !== null) {
      window.cancelAnimationFrame(quoteCommitFrameRef.current);
      quoteCommitFrameRef.current = null;
    }
  }, []);

  const flushPendingQuoteCommit = useCallback(() => {
    const pending = pendingQuoteCommitRef.current;
    if (!pending) {
      return;
    }

    pendingQuoteCommitRef.current = null;
    lastQuoteCommitAtRef.current = window.performance.now();
    setQuotes((current) => ({ ...current, ...pending.quotes }));
    setQuoteLoadProgress({
      active: true,
      loadedCount: pending.loadedCount,
      totalCount: pending.totalCount,
    });
    if (pending.updatedAt) {
      setUpdatedAt(pending.updatedAt);
    }
    setDataSource((current) => (current === "direct" ? current : "stale"));
  }, []);

  const scheduleQuoteCommit = useCallback(
    (immediate = false) => {
      if (quoteCommitTimerRef.current !== null || quoteCommitFrameRef.current !== null) {
        return;
      }

      const queueFrame = () => {
        quoteCommitTimerRef.current = null;
        if (quoteCommitFrameRef.current !== null) {
          return;
        }
        quoteCommitFrameRef.current = window.requestAnimationFrame(() => {
          quoteCommitFrameRef.current = null;
          flushPendingQuoteCommit();
        });
      };

      const elapsed = window.performance.now() - lastQuoteCommitAtRef.current;
      const delay = immediate ? 0 : Math.max(0, progressiveQuoteCommitIntervalMs - elapsed);
      if (delay === 0) {
        queueFrame();
        return;
      }

      quoteCommitTimerRef.current = window.setTimeout(queueFrame, delay);
    },
    [flushPendingQuoteCommit]
  );

  const fetchTreemap = useCallback(
    async (nextMarket: HeatmapUniverse, nextPeriod: HeatmapPeriodKey, codes: string[]) => {
      if (nextMarket === watchlistUniverseKey) {
        if (codes.length === 0) {
          setTreemapData(createEmptyWatchlistTreemap(nextPeriod));
          setQuotes({});
          setSettledQuotes({});
          setQuoteLoadProgress(null);
          setUpdatedAt("");
          setDataSource(null);
          return;
        }

        const params = new URLSearchParams({
          period: nextPeriod,
          codes: codes.join(","),
        });
        const response = await fetch(`/api/heatmap/treemap?${params.toString()}`);
        if (!response.ok) {
          if (response.status === 503) throw new Error(periodDataUnavailableCode);
          throw new Error(messages.errorLoad);
        }

        const payload = (await response.json()) as TreemapResponse;
        setTreemapData(payload);
        if (payload.source === "fallback") {
          setUpdatedAt((current) => current || payload.updatedAt);
          setDataSource((current) => current ?? payload.source);
        } else {
          setUpdatedAt(payload.updatedAt);
          setDataSource(payload.source);
        }
        return;
      }

      const response = await fetch(`/api/heatmap/treemap?market=${nextMarket}&period=${nextPeriod}`);
      if (!response.ok) {
        if (response.status === 503) throw new Error(periodDataUnavailableCode);
        throw new Error(messages.errorLoad);
      }

      const payload = (await response.json()) as TreemapResponse;
      setTreemapData(payload);
      if (payload.source === "fallback") {
        setUpdatedAt((current) => current || payload.updatedAt);
        setDataSource((current) => current ?? payload.source);
      } else {
        setUpdatedAt(payload.updatedAt);
        setDataSource(payload.source);
      }
    },
    [messages.errorLoad]
  );

  const fetchProgressiveQuotes = useCallback(
    async (
      nextMarket: HeatmapUniverse,
      nextPeriod: HeatmapPeriodKey,
      codes: string[],
      refreshId: number
    ) => {
      if (nextMarket === watchlistUniverseKey) {
        if (codes.length === 0) {
          setQuotes({});
          setSettledQuotes({});
          setQuoteLoadProgress(null);
          return;
        }
      }

      const requestKey = `${nextMarket}:${nextPeriod}:${codes.join(",")}:${refreshId}`;
      if (quoteStreamRef.current?.key === requestKey) {
        return;
      }

      quoteStreamRef.current?.controller.abort();
      clearScheduledQuoteCommit();
      pendingQuoteCommitRef.current = null;
      lastQuoteCommitAtRef.current = 0;
      const controller = new AbortController();
      quoteStreamRef.current = { key: requestKey, controller };
      setQuoteLoadProgress({ active: true, loadedCount: 0, totalCount: 0 });

      const params = new URLSearchParams({ period: nextPeriod });
      if (nextMarket === watchlistUniverseKey) {
        params.set("codes", codes.join(","));
      } else {
        params.set("market", nextMarket);
      }

      const receivedQuotes: QuoteMap = {};
      let hasReceivedQuotes = false;
      let completed = false;

      try {
        const response = await fetch(`/api/heatmap/quotes/stream?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(messages.errorLoad);
        }

        await readQuoteStream(response, (event) => {
          if (event.type === "start") {
            setQuoteLoadProgress({ active: true, loadedCount: 0, totalCount: event.totalCount });
            return;
          }

          if (event.type === "quotes") {
            const isFirstBatch = !hasReceivedQuotes;
            hasReceivedQuotes = true;
            Object.assign(receivedQuotes, event.quotes);
            const pending = pendingQuoteCommitRef.current ?? {
              quotes: {},
              loadedCount: event.loadedCount,
              totalCount: event.totalCount,
              updatedAt: "",
            };
            Object.assign(pending.quotes, event.quotes);
            pending.loadedCount = event.loadedCount;
            pending.totalCount = event.totalCount;
            pending.updatedAt = event.updatedAt || pending.updatedAt;
            pendingQuoteCommitRef.current = pending;
            scheduleQuoteCommit(isFirstBatch);
            return;
          }

          if (event.type === "complete") {
            completed = true;
            clearScheduledQuoteCommit();
            flushPendingQuoteCommit();
            setSettledQuotes((current) => ({ ...current, ...receivedQuotes }));
            setQuoteLoadProgress({
              active: false,
              loadedCount: event.loadedCount,
              totalCount: event.totalCount,
            });
            if (event.updatedAt) {
              setUpdatedAt(event.updatedAt);
            }
            setDataSource(event.source);
            setError((current) => current === periodDataUnavailableCode ? current : null);
            return;
          }

          throw new Error(
            event.message === periodDataUnavailableCode ? periodDataUnavailableCode : messages.errorLoad
          );
        });

        if (!completed && !controller.signal.aborted) {
          throw new Error(messages.errorLoad);
        }
      } catch (streamError) {
        if (controller.signal.aborted) {
          return;
        }
        clearScheduledQuoteCommit();
        flushPendingQuoteCommit();
        setQuoteLoadProgress((current) =>
          current ? { ...current, active: false } : current
        );
        throw streamError;
      } finally {
        if (quoteStreamRef.current?.controller === controller) {
          quoteStreamRef.current = null;
        }
      }
    },
    [clearScheduledQuoteCommit, flushPendingQuoteCommit, messages.errorLoad, scheduleQuoteCommit]
  );

  const fetchMarketSummaries = useCallback(async (nextPeriod: HeatmapPeriodKey) => {
    const response = await fetch(`/api/heatmap/overview?period=${nextPeriod}`);
    if (!response.ok) {
      throw new Error(messages.errorLoad);
    }

    const payload = (await response.json()) as MarketOverviewResponse;
    const next: Partial<Record<MarketKey, MarketSummary>> = {};

    for (const item of payload.markets) {
      next[item.market] = {
        changePct: item.changePct,
        stockCount: item.stockCount,
        updatedAt: item.updatedAt,
      };
    }

    setMarketSummaries(next);
  }, [messages.errorLoad]);

  useEffect(() => {
    document.documentElement.classList.add("heatmap-page-active");
    document.body.classList.add("heatmap-page-active");

    return () => {
      document.documentElement.classList.remove("heatmap-page-active");
      document.body.classList.remove("heatmap-page-active");
    };
  }, []);

  const retryDataLoad = useCallback(() => {
    setError(null);
    setRefreshRequestId((current) => current + 1);
  }, []);

  useEffect(() => {
    if (inspectorListRef.current) {
      inspectorListRef.current.scrollTop = 0;
    }
  }, [activeBoardName, inspectorSortKey]);

  useEffect(() => {
    refreshSize();

    const target = viewportRef.current;
    const resizeObserver =
      target && typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => refreshSize()) : null;

    if (resizeObserver && target) {
      resizeObserver.observe(target);
    }
    window.addEventListener("resize", refreshSize, { passive: true });

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", refreshSize);
    };
  }, [refreshSize]);

  useEffect(() => {
    refreshSize();
  }, [isFullscreen, refreshSize]);

  useEffect(() => {
    setView((current) => {
      if (current.scale <= 1) {
        return current.x === 0 && current.y === 0 ? current : { scale: 1, x: 0, y: 0 };
      }

      if (current.scale > maxZoom) {
        const nextScale = maxZoom;
        const nextOffset = clampOffset(canvasSize.width, canvasSize.height, nextScale, current.x, current.y);
        return {
          scale: nextScale,
          x: nextOffset.x,
          y: nextOffset.y,
        };
      }

      const nextOffset = clampOffset(canvasSize.width, canvasSize.height, current.scale, current.x, current.y);
      if (nextOffset.x === current.x && nextOffset.y === current.y) {
        return current;
      }

      return {
        ...current,
        x: nextOffset.x,
        y: nextOffset.y,
      };
    });
  }, [canvasSize.height, canvasSize.width, maxZoom]);

  useEffect(() => {
    return () => {
      if (sharePreview) {
        URL.revokeObjectURL(sharePreview.url);
      }
    };
  }, [sharePreview]);

  useEffect(() => {
    function stopPan() {
      dragStateRef.current.active = false;
      setIsPanning(false);
    }

    window.addEventListener("mouseup", stopPan);

    return () => {
      window.removeEventListener("mouseup", stopPan);
      if (boardClickTimerRef.current) {
        clearTimeout(boardClickTimerRef.current);
        boardClickTimerRef.current = null;
      }
    };
  }, []);

  const quoteQueryKey = `${market}:${period}:${isWatchlist ? watchlistCodes.join(",") : ""}`;

  useEffect(() => {
    quoteStreamRef.current?.controller.abort();
    quoteStreamRef.current = null;
    clearScheduledQuoteCommit();
    pendingQuoteCommitRef.current = null;
    lastQuoteCommitAtRef.current = 0;
    setQuotes({});
    setSettledQuotes({});
    setQuoteLoadProgress(null);
    setMarketSummaries({});

    return () => {
      quoteStreamRef.current?.controller.abort();
      quoteStreamRef.current = null;
      clearScheduledQuoteCommit();
      pendingQuoteCommitRef.current = null;
    };
  }, [clearScheduledQuoteCommit, quoteQueryKey]);

  useEffect(() => {
    if (!preferencesReady) {
      return;
    }

    let cancelled = false;

    async function loadTreemap() {
      setError(null);
      setTreemapData((current) => current?.period === period ? current : null);
      setHoveredStockCode(null);
      setHoveredBoardName(null);
      setHoveredBoardTitleName(null);
      setHoveredSubBoardName(null);
      setSelectedStockCode(null);
      setSelectedBoardName(null);
      setSelectedSubBoardName(null);

      if (market === watchlistUniverseKey && watchlistCodes.length === 0) {
        setTreemapData(createEmptyWatchlistTreemap(period));
        setQuotes({});
        setUpdatedAt("");
        setDataSource(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        await fetchTreemap(market, period, watchlistCodes);
      } catch (error) {
        if (!cancelled) {
          setError(error instanceof Error ? error.message : messages.errorLoad);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadTreemap();

    return () => {
      cancelled = true;
    };
  }, [fetchTreemap, market, messages.errorLoad, period, preferencesReady, refreshRequestId, watchlistCodes]);

  usePollWhileVisible(
    useCallback(async () => {
      if (!preferencesReady) {
        return;
      }
      try {
        await fetchProgressiveQuotes(market, period, watchlistCodes, refreshRequestId);
      } catch (error) {
        setError(error instanceof Error ? error.message : messages.errorLoad);
      }
    }, [fetchProgressiveQuotes, market, messages.errorLoad, period, preferencesReady, refreshRequestId, watchlistCodes]),
    refreshIntervalSeconds * 1000
  );

  usePollWhileVisible(
    useCallback(async () => {
      if (!preferencesReady) {
        return;
      }
      try {
        await fetchMarketSummaries(period);
      } catch {
        // Keep existing summaries if the refresh fails.
      }
    }, [fetchMarketSummaries, period, preferencesReady]),
    refreshIntervalSeconds * 1000
  );

  useEffect(() => {
    if (!treemapData || boardFilter.length === 0) {
      return;
    }

    const nextFilter = sanitizeBoardFilter(
      boardFilter,
      treemapData.nodes.map((node) => node.name)
    );

    if (!boardFiltersEqual(boardFilter, nextFilter)) {
      setBoardFilter(nextFilter);
    }
  }, [boardFilter, treemapData]);

  useEffect(() => {
    setHoveredStockCode(null);
    setHoveredBoardName(null);
    setHoveredBoardTitleName(null);
    setHoveredSubBoardName(null);
    setSelectedStockCode(null);
    setSelectedBoardName(null);
    setSelectedSubBoardName(null);
    setView({ scale: 1, x: 0, y: 0 });
  }, [boardFilter, trendFilter]);

  useEffect(() => {
    setView({ scale: 1, x: 0, y: 0 });
  }, [sizeMode, thumbnailMode]);

  const applyChangeRange = useCallback((next: ChangeRangeFilter) => {
    const normalized = normalizeChangeRangeFilter(next);
    setChangeRangeFilter(normalized);
    setChangeRangeMinInput(formatChangeRangeInput(normalized.min));
    setChangeRangeMaxInput(formatChangeRangeInput(normalized.max));
  }, []);

  const commitChangeRangeInputs = useCallback(
    (minRaw = changeRangeMinInput, maxRaw = changeRangeMaxInput) => {
      applyChangeRange({
        min: parseChangeRangeInput(minRaw, changeRangeFilter.min),
        max: parseChangeRangeInput(maxRaw, changeRangeFilter.max),
      });
    },
    [applyChangeRange, changeRangeFilter.max, changeRangeFilter.min, changeRangeMaxInput, changeRangeMinInput]
  );

  const clearFilterHoverTimers = useCallback(() => {
    if (filterHoverOpenTimerRef.current) {
      window.clearTimeout(filterHoverOpenTimerRef.current);
      filterHoverOpenTimerRef.current = null;
    }
    if (filterHoverCloseTimerRef.current) {
      window.clearTimeout(filterHoverCloseTimerRef.current);
      filterHoverCloseTimerRef.current = null;
    }
  }, []);

  const openFilters = useCallback(() => {
    setSettingsOpen(false);
    if (isMobile) {
      setSidebarOpen(false);
    }
    setFiltersOpen(true);
  }, [isMobile]);

  const toggleFilters = useCallback(() => {
    clearFilterHoverTimers();
    setFiltersOpen((open) => {
      const next = !open;
      if (next) {
        setSettingsOpen(false);
        if (isMobile) {
          setSidebarOpen(false);
        }
      }
      return next;
    });
  }, [clearFilterHoverTimers, isMobile]);

  const closeFilters = useCallback(() => {
    clearFilterHoverTimers();
    setFiltersOpen(false);
  }, [clearFilterHoverTimers]);

  const openWatchlistSettings = useCallback(() => {
    setFiltersOpen(false);
    setSettingsTab("watchlist");
    setSettingsOpen(true);
  }, []);

  const addWatchlistItem = useCallback(
    (item: WatchlistItem) => {
      if (watchlist.some((stock) => stock.code === item.code)) {
        toast.message(messages.watchlistAlreadyAdded, { id: "heatmap-watchlist" });
        return false;
      }
      if (watchlist.length >= watchlistMaxCount) {
        toast.error(messages.watchlistMaxReached.replace("{count}", String(watchlistMaxCount)), {
          id: "heatmap-watchlist",
        });
        return false;
      }

      setWatchlist((current) => [...current, item]);
      if (watchlist.length === 0) {
        setMarket(watchlistUniverseKey);
      }
      toast.success(messages.watchlistAddSuccess.replace("{name}", item.name), { id: "heatmap-watchlist" });
      return true;
    },
    [messages.watchlistAddSuccess, messages.watchlistAlreadyAdded, messages.watchlistMaxReached, watchlist]
  );

  const removeWatchlistItem = useCallback(
    (code: string) => {
      const item = watchlist.find((stock) => stock.code === code);
      setWatchlist((current) => current.filter((stock) => stock.code !== code));
      if (item) {
        toast.success(messages.watchlistRemoveSuccess.replace("{name}", item.name), { id: "heatmap-watchlist" });
      }
    },
    [messages.watchlistRemoveSuccess, watchlist]
  );

  const clearWatchlist = useCallback(() => {
    setWatchlist([]);
    toast.success(messages.watchlistClearSuccess, { id: "heatmap-watchlist" });
  }, [messages.watchlistClearSuccess]);

  const toggleWatchlistItem = useCallback(
    (stock: {
      code: string;
      name: string;
      boardName?: string | null;
      subBoardName?: string | null;
    }) => {
      if (watchlist.some((item) => item.code === stock.code)) {
        removeWatchlistItem(stock.code);
        return;
      }

      const exchange = parseStockCode(stock.code).market;
      addWatchlistItem({
        code: stock.code,
        name: stock.name,
        boardName: stock.boardName ?? undefined,
        subBoardName: stock.subBoardName ?? undefined,
        exchange: exchange === "SH" || exchange === "SZ" || exchange === "BJ" ? exchange : undefined,
      });
    },
    [addWatchlistItem, removeWatchlistItem, watchlist]
  );

  const importWatchlistFromText = useCallback(
    (raw: string) => {
      const imported = parseWatchlistExportPayload(raw);
      if (!imported || imported.length === 0) {
        toast.error(messages.watchlistImportFailed, { id: "heatmap-watchlist" });
        return;
      }

      const seen = new Set(watchlist.map((item) => item.code));
      const merged = [...watchlist];
      let added = 0;
      let skipped = 0;
      for (const item of imported) {
        if (seen.has(item.code) || merged.length >= watchlistMaxCount) {
          skipped += 1;
          continue;
        }
        seen.add(item.code);
        merged.push(item);
        added += 1;
      }

      setWatchlist(merged);
      toast.success(
        messages.watchlistImportSuccess
          .replace("{added}", String(added))
          .replace("{skipped}", String(skipped)),
        { id: "heatmap-watchlist" }
      );
    },
    [messages.watchlistImportFailed, messages.watchlistImportSuccess, watchlist]
  );

  const handleFilterHoverEnter = useCallback(() => {
    if (!isDesktopHoverFilterMode) {
      return;
    }
    if (filterHoverCloseTimerRef.current) {
      window.clearTimeout(filterHoverCloseTimerRef.current);
      filterHoverCloseTimerRef.current = null;
    }
    if (filtersOpen || filterHoverOpenTimerRef.current) {
      return;
    }
    filterHoverOpenTimerRef.current = window.setTimeout(() => {
      filterHoverOpenTimerRef.current = null;
      openFilters();
    }, filterHoverOpenDelayMs);
  }, [filtersOpen, isDesktopHoverFilterMode, openFilters]);

  const handleFilterHoverLeave = useCallback(() => {
    if (!isDesktopHoverFilterMode) {
      return;
    }
    if (filterHoverOpenTimerRef.current) {
      window.clearTimeout(filterHoverOpenTimerRef.current);
      filterHoverOpenTimerRef.current = null;
    }
    if (!filtersOpen) {
      return;
    }
    if (filterHoverCloseTimerRef.current) {
      window.clearTimeout(filterHoverCloseTimerRef.current);
    }
    filterHoverCloseTimerRef.current = window.setTimeout(() => {
      filterHoverCloseTimerRef.current = null;
      setFiltersOpen(false);
    }, filterHoverCloseDelayMs);
  }, [filtersOpen, isDesktopHoverFilterMode]);

  const resetViewFilters = useCallback(() => {
    setBoardFilter([]);
    setTrendFilter(allTrendsValue);
    applyChangeRange(emptyChangeRangeFilter);
  }, [applyChangeRange]);

  const boardFilterOptions = useMemo(() => treemapData?.nodes ?? [], [treemapData]);
  const isAllBoardsSelected = boardFilter.length === 0;
  const activeFilterCount = countActiveViewFilters(boardFilter, trendFilter, changeRangeFilter);
  useEffect(() => clearFilterHoverTimers, [clearFilterHoverTimers]);
  useEffect(() => {
    if (!isDesktopHoverFilterMode) {
      clearFilterHoverTimers();
    }
  }, [clearFilterHoverTimers, isDesktopHoverFilterMode]);

  const activeFilterSummary = useMemo(() => {
    const parts: string[] = [];
    if (boardFilter.length === 1) {
      parts.push(boardFilter[0]);
    } else if (boardFilter.length > 1) {
      parts.push(messages.selectedBoardCount.replace("{count}", String(boardFilter.length)));
    }

    if (trendFilter === risingOnlyValue) {
      parts.push(messages.risingOnly);
    } else if (trendFilter === fallingOnlyValue) {
      parts.push(messages.fallingOnly);
    }

    const rangeSummary = formatChangeRangeSummary(changeRangeFilter);
    if (rangeSummary) {
      parts.push(rangeSummary);
    }

    return parts.join(" · ");
  }, [boardFilter, changeRangeFilter, messages.fallingOnly, messages.risingOnly, messages.selectedBoardCount, trendFilter]);

  // Before live data arrives, fall back to the bundled sample snapshot so the canvas
  // always has a full heatmap to paint — even on the very first render.
  const visibleTreemapData = useMemo<TreemapResponse | null>(() => {
    if (!treemapData || treemapData.period !== period) {
      return initialSnapshot;
    }

    if (initialSnapshot && boardFilter.length === 0 && trendFilter === allTrendsValue && !isChangeRangeActive(changeRangeFilter)) {
      return treemapData;
    }

    const applyBoardFilter = (data: TreemapResponse) => {
      if (boardFilter.length === 0) {
        return data;
      }

      const selectedNames = new Set(boardFilter);
      const selectedBoards = data.nodes.filter((node) => selectedNames.has(node.name));
      if (selectedBoards.length === 0) {
        return data;
      }

      let advanceCount = 0;
      let flatCount = 0;
      let declineCount = 0;
      let turnoverAmount = 0;
      const selectedStocks = selectedBoards.flatMap((board) => board.children);

      for (const stock of selectedStocks) {
        const changePct = settledQuotes[stock.code]?.changePct ?? stock.changePct;

        if (changePct !== null && changePct > flatThreshold) {
          advanceCount += 1;
        } else if (changePct !== null && changePct < -flatThreshold) {
          declineCount += 1;
        } else if (changePct !== null) {
          flatCount += 1;
        }

        turnoverAmount += getLiveTurnoverAmount(stock.code, stock.turnoverAmount, settledQuotes);
      }

      return {
        ...data,
        stockCount: selectedStocks.length,
        boardCount: selectedBoards.length,
        summary: {
          ...data.summary,
          advanceCount,
          flatCount,
          declineCount,
          turnoverAmount,
          turnoverPreviousAmount: 0,
          turnoverDelta: 0,
          indexChangePct: weightedAverageChange(selectedStocks, settledQuotes),
        },
        nodes: selectedBoards,
      };
    };

    const applyTrendFilter = (data: TreemapResponse) => {
      if (trendFilter === allTrendsValue) {
        return data;
      }

      return filterTreemapByStockPredicate(data, settledQuotes, (changePct) => {
        if (trendFilter === risingOnlyValue) {
          return changePct > flatThreshold;
        }

        if (trendFilter === fallingOnlyValue) {
          return changePct < -flatThreshold;
        }

        return true;
      });
    };

    const applyChangeRangeFilter = (data: TreemapResponse) => {
      if (!isChangeRangeActive(changeRangeFilter)) {
        return data;
      }

      return filterTreemapByStockPredicate(data, settledQuotes, (changePct) =>
        matchesChangeRange(changePct, changeRangeFilter)
      );
    };

    let result = applyBoardFilter(treemapData);
    result = applyTrendFilter(result);
    result = applyChangeRangeFilter(result);
    return result;
  }, [boardFilter, changeRangeFilter, initialSnapshot, period, settledQuotes, trendFilter, treemapData]);

  const marketOverview = useMemo<MarketOverview | null>(() => {
    if (!visibleTreemapData || periodDataUnavailable || visibleTreemapData.period !== period) {
      return null;
    }

    return {
      advanceCount: visibleTreemapData.summary.advanceCount,
      flatCount: visibleTreemapData.summary.flatCount,
      declineCount: visibleTreemapData.summary.declineCount,
      turnoverAmount: visibleTreemapData.summary.turnoverAmount,
      turnoverPreviousAmount: visibleTreemapData.summary.turnoverPreviousAmount,
      turnoverDelta: visibleTreemapData.summary.turnoverDelta,
    };
  }, [periodDataUnavailable, period, visibleTreemapData]);

  const sizedTreemapData = useMemo(
    () => (visibleTreemapData ? applySizeModeToTreemapData(visibleTreemapData, settledQuotes, sizeMode) : null),
    [settledQuotes, sizeMode, visibleTreemapData]
  );

  const sectorVisualStats = useMemo(
    () => buildSectorVisualStats(sizedTreemapData, quotes),
    [quotes, sizedTreemapData]
  );

  const layout = useMemo(() => {
    if (!sizedTreemapData) {
      return {
        stockRects: [] as StockRect[],
        boardRects: [] as BoardRect[],
        subBoardRects: [] as SubBoardRect[],
      };
    }

    const boardRects: BoardRect[] = [];
    const subBoardRects: SubBoardRect[] = [];
    const stockRects: StockRect[] = [];

    const boardBoxes = binaryTreemap(
      sizedTreemapData.nodes.map((board) => ({ item: board, value: board.value })),
      0,
      0,
      canvasSize.width,
      canvasSize.height,
      heatmapBorders ? 6 : 3
    );

    for (const boardBox of boardBoxes) {
      const boardChangePct = weightedAverageChange(boardBox.item.children, emptyQuoteMap);
      const boardTrends = countStockTrends(boardBox.item.children, emptyQuoteMap);
      const titleHeight =
        boardBox.width < 84 || boardBox.height < 54
          ? 0
          : clamp(Math.round(Math.min(Math.max(boardBox.height * 0.1, 16), 26)), 14, 26);
      const contentPadding = heatmapBorders ? (boardBox.width > 110 && boardBox.height > 90 ? 3 : 2) : 0;
      const contentX = boardBox.x + contentPadding;
      const contentY = boardBox.y + titleHeight + contentPadding;
      const contentWidth = Math.max(0, boardBox.width - contentPadding * 2);
      const contentHeight = Math.max(0, boardBox.height - titleHeight - contentPadding * 2);

      boardRects.push({
        name: boardBox.item.name,
        x: boardBox.x,
        y: boardBox.y,
        width: boardBox.width,
        height: boardBox.height,
        stockCount: boardBox.item.stockCount,
        titleHeight,
        changePct: boardChangePct,
        ...boardTrends,
      });

      if (contentWidth <= 2 || contentHeight <= 2) {
        continue;
      }

      const subBoards = groupStocksBySubBoard(boardBox.item.children);
      const shouldNestSubBoards = market !== "zza50" && (thumbnailMode || subBoards.length > 1);

      if (!shouldNestSubBoards) {
        if (thumbnailMode) {
          subBoardRects.push({
            name: boardBox.item.name,
            boardName: boardBox.item.name,
            x: contentX,
            y: contentY,
            width: contentWidth,
            height: contentHeight,
            stockCount: boardBox.item.stockCount,
            titleHeight: 0,
            changePct: boardChangePct,
            ...boardTrends,
          });
          continue;
        }

        const stockBoxes = binaryTreemap(
          boardBox.item.children.map((stock) => ({ item: stock, value: stock.value })),
          contentX,
          contentY,
          contentWidth,
          contentHeight,
          heatmapBorders ? 1.5 : 0
        );

        for (const stockBox of stockBoxes) {
          stockRects.push({
            code: stockBox.item.code,
            name: stockBox.item.name,
            boardName: boardBox.item.name,
            subBoardName: market === "zza50" ? boardBox.item.name : stockBox.item.subBoardName,
            value: stockBox.item.value,
            x: stockBox.x,
            y: stockBox.y,
            width: stockBox.width,
            height: stockBox.height,
            price: stockBox.item.price,
            changePct: stockBox.item.changePct,
          });
        }

        continue;
      }

      const subBoardBoxes = binaryTreemap(
        subBoards.map((subBoard) => ({ item: subBoard, value: subBoard.value })),
        contentX,
        contentY,
        contentWidth,
        contentHeight,
        heatmapBorders
          ? boardBox.width > 96 && boardBox.height > 72
            ? thumbnailMode
              ? 3
              : 2
            : thumbnailMode
              ? 2
              : 1
          : 0
      );

      for (const subBoardBox of subBoardBoxes) {
        const subTrends = countStockTrends(subBoardBox.item.children, emptyQuoteMap);
        const subTitleHeight = thumbnailMode
          ? 0
          : subBoardBox.width < 52 || subBoardBox.height < 40
            ? 0
            : clamp(Math.round(Math.min(Math.max(subBoardBox.height * 0.14, 14), 22)), 12, 22);
        const subPadding = !heatmapBorders || thumbnailMode
          ? 0
          : subBoardBox.width > 82 && subBoardBox.height > 56
            ? 2
            : 1;
        const subContentX = subBoardBox.x + subPadding;
        const subContentY = subBoardBox.y + subTitleHeight + subPadding;
        const subContentWidth = Math.max(0, subBoardBox.width - subPadding * 2);
        const subContentHeight = Math.max(0, subBoardBox.height - subTitleHeight - subPadding * 2);

        subBoardRects.push({
          name: subBoardBox.item.name,
          boardName: boardBox.item.name,
          x: subBoardBox.x,
          y: subBoardBox.y,
          width: subBoardBox.width,
          height: subBoardBox.height,
          stockCount: subBoardBox.item.stockCount,
          titleHeight: subTitleHeight,
          changePct: subBoardBox.item.changePct,
          ...subTrends,
        });

        if (thumbnailMode || subContentWidth <= 2 || subContentHeight <= 2) {
          continue;
        }

        const stockBoxes = binaryTreemap(
          subBoardBox.item.children.map((stock) => ({ item: stock, value: stock.value })),
          subContentX,
          subContentY,
          subContentWidth,
          subContentHeight,
          heatmapBorders
            ? subBoardBox.width > 56 && subBoardBox.height > 38
              ? 1
              : 0.5
            : 0
        );

        for (const stockBox of stockBoxes) {
          stockRects.push({
            code: stockBox.item.code,
            name: stockBox.item.name,
            boardName: boardBox.item.name,
            subBoardName: stockBox.item.subBoardName,
            value: stockBox.item.value,
            x: stockBox.x,
            y: stockBox.y,
            width: stockBox.width,
            height: stockBox.height,
            price: stockBox.item.price,
            changePct: stockBox.item.changePct,
          });
        }
      }
    }

    return { stockRects, boardRects, subBoardRects };
  }, [canvasSize.height, canvasSize.width, heatmapBorders, market, sizedTreemapData, thumbnailMode]);

  useEffect(() => {
    lastStockRectsRef.current = layout.stockRects;
    lastBoardRectsRef.current = layout.boardRects;
    lastSubBoardRectsRef.current = layout.subBoardRects;
  }, [layout.boardRects, layout.stockRects, layout.subBoardRects]);

  const activeStock = useMemo(() => {
    if (!activeStockCode) {
      return null;
    }

    return layout.stockRects.find((stock) => stock.code === activeStockCode) ?? null;
  }, [activeStockCode, layout.stockRects]);

  const highlightedStock = useMemo(() => {
    if (activeStock) {
      return activeStock;
    }

    if (!activeBoardName) {
      return null;
    }

    return layout.stockRects.find((stock) => stock.boardName === activeBoardName) ?? null;
  }, [activeBoardName, activeStock, layout.stockRects]);

  const activeBoardRect = useMemo(() => {
    if (!activeBoardName) {
      return null;
    }

    return layout.boardRects.find((board) => board.name === activeBoardName) ?? null;
  }, [activeBoardName, layout.boardRects]);

  const activeSubBoardRect = useMemo(() => {
    if (!activeBoardName || !activeSubBoardName) {
      return null;
    }

    return (
      layout.subBoardRects.find(
        (sub) => sub.name === activeSubBoardName && sub.boardName === activeBoardName
      ) ?? null
    );
  }, [activeBoardName, activeSubBoardName, layout.subBoardRects]);

  const activeBoardStocks = useMemo(() => {
    if (!activeBoardName || !visibleTreemapData) {
      return [] as InspectorStockItem[];
    }

    const board = visibleTreemapData.nodes.find((node) => node.name === activeBoardName);
    if (!board) {
      return [];
    }

    const scopedChildren =
      thumbnailMode && activeSubBoardName
        ? board.children.filter((stock) => (stock.subBoardName || stock.boardName) === activeSubBoardName)
        : board.children;
    const children = scopedChildren.length > 0 ? scopedChildren : board.children;

    return children
      .map((stock) => {
        const quote = quotes[stock.code];
        return {
          code: stock.code,
          name: stock.name,
          subBoardName: stock.subBoardName,
          price: quote?.price ?? stock.price,
          changePct: quote?.changePct ?? stock.changePct,
          turnoverAmount: quote?.turnoverAmount ?? stock.turnoverAmount ?? 0,
          marketCap: stock.value,
        };
      })
      .sort((left, right) => compareInspectorStocks(left, right, inspectorSortKey));
  }, [activeBoardName, activeSubBoardName, inspectorSortKey, quotes, thumbnailMode, visibleTreemapData]);

  const inspectorStocks = useMemo(() => {
    if (activeBoardStocks.length === 0) {
      return [] as Array<InspectorStockItem & { active: boolean }>;
    }

    if (!highlightedStock) {
      return activeBoardStocks.map((stock) => ({
        ...stock,
        active: false,
      }));
    }

    const highlightedQuote = quotes[highlightedStock.code];
    const current = activeBoardStocks.find((stock) => stock.code === highlightedStock.code) ?? {
      code: highlightedStock.code,
      name: highlightedStock.name,
      subBoardName: highlightedStock.subBoardName,
      price: highlightedQuote?.price ?? highlightedStock.price,
      changePct: highlightedQuote?.changePct ?? highlightedStock.changePct,
      turnoverAmount: highlightedQuote?.turnoverAmount ?? 0,
      marketCap: highlightedStock.value,
    };

    const rest = activeBoardStocks.filter((stock) => stock.code !== highlightedStock.code);

    return [
      { ...current, active: true },
      ...rest.map((stock) => ({
        ...stock,
        active: false,
      })),
    ];
  }, [activeBoardStocks, highlightedStock, quotes]);

  const activeInspectorStock = inspectorStocks[0] ?? null;
  const activeInspectorTitle = useMemo(() => {
    if (!activeBoardName) {
      return activeBoardName;
    }

    const subBoardName = highlightedStock?.subBoardName || activeSubBoardName;

    if (subBoardName && subBoardName !== activeBoardName) {
      return `${activeBoardName} - ${subBoardName}`;
    }

    return activeBoardName;
  }, [activeBoardName, highlightedStock, activeSubBoardName]);

  const inspectorSectorStats = useMemo(() => {
    if (!activeBoardName || !visibleTreemapData) {
      return null;
    }

    const board = visibleTreemapData.nodes.find((node) => node.name === activeBoardName);
    if (!board) {
      return null;
    }

    const subBoardName = highlightedStock?.subBoardName || activeSubBoardName;
    const scoped =
      subBoardName && subBoardName !== activeBoardName
        ? board.children.filter((stock) => (stock.subBoardName || stock.boardName) === subBoardName)
        : board.children;
    const stocks = scoped.length > 0 ? scoped : board.children;
    const trends = countStockTrends(stocks, quotes);

    return {
      ...trends,
      changePct: weightedAverageChange(stocks, quotes),
    };
  }, [activeBoardName, activeSubBoardName, highlightedStock, quotes, visibleTreemapData]);

  const inspectorStyle = useMemo(() => {
    if (isMobile) {
      return null;
    }

    if (!activeBoardRect || inspectorStocks.length === 0) {
      return null;
    }

    const gutter = 12;
    const maxPopupWidth = Math.max(320, canvasSize.width - gutter * 2);
    const preferredWidth = canvasSize.width >= 1360 ? 452 : canvasSize.width >= 1100 ? 432 : 408;
    const popupWidth = Math.min(maxPopupWidth, preferredWidth);
    const popupHeightEstimate = Math.min(620, Math.max(350, Math.floor(canvasSize.height * 0.7)));

    const toScreenRect = (rect: { x: number; y: number; width: number; height: number }) => {
      const screenLeft = rect.x * view.scale + view.x;
      const screenTop = rect.y * view.scale + view.y;
      const screenRight = (rect.x + rect.width) * view.scale + view.x;
      return { left: screenLeft, top: screenTop, right: screenRight };
    };

    const boardScreen = toScreenRect(activeBoardRect);
    const boardFitsRight = boardScreen.right + gutter + popupWidth <= canvasSize.width - gutter;
    const boardFitsLeft = boardScreen.left - gutter - popupWidth >= gutter;

    // When the active board fills (or overflows) the visible canvas — common
    // when viewing a single 一级板块 — neither side of it can host the popup.
    // Fall back to a tighter anchor (hovered stock, then sub-board) so the
    // popup appears next to whatever the user is pointing at instead of being
    // pinned to the left gutter.
    const anchorRect =
      !boardFitsRight && !boardFitsLeft
        ? activeStock ?? activeSubBoardRect ?? activeBoardRect
        : activeBoardRect;
    const anchorScreen = toScreenRect(anchorRect);

    const fitsRight = anchorScreen.right + gutter + popupWidth <= canvasSize.width - gutter;
    const fitsLeft = anchorScreen.left - gutter - popupWidth >= gutter;

    let desiredLeft: number;
    if (fitsRight) {
      desiredLeft = anchorScreen.right + gutter;
    } else if (fitsLeft) {
      desiredLeft = anchorScreen.left - popupWidth - gutter;
    } else {
      // Anchor still doesn't fit either side; pick whichever side has more
      // empty space so the popup doesn't always cover the same area.
      const spaceLeft = anchorScreen.left;
      const spaceRight = canvasSize.width - anchorScreen.right;
      desiredLeft =
        spaceRight >= spaceLeft ? canvasSize.width - popupWidth - gutter : gutter;
    }

    const left = clamp(desiredLeft, gutter, Math.max(gutter, canvasSize.width - popupWidth - gutter));
    const top = clamp(
      anchorScreen.top,
      gutter,
      Math.max(gutter, canvasSize.height - popupHeightEstimate - gutter)
    );
    const maxHeight = Math.max(220, canvasSize.height - top - gutter);

    return {
      left,
      top,
      width: popupWidth,
      maxHeight,
    };
  }, [
    canvasSize.height,
    canvasSize.width,
    activeBoardRect,
    activeStock,
    activeSubBoardRect,
    inspectorStocks.length,
    isMobile,
    view.scale,
    view.x,
    view.y,
  ]);

  useEffect(() => {
    const inspectorOpen = Boolean(inspectorStyle) || (isMobile && Boolean(selectedBoardName));
    if (!inspectorOpen || inspectorStocks.length === 0) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName;
      if (
        target?.isContentEditable ||
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        tagName === "SELECT"
      ) {
        return;
      }

      if (event.key === "s" || event.key === "S") {
        event.preventDefault();
        setInspectorSortKey((current) => cycleInspectorSortKey(current, event.shiftKey ? -1 : 1));
        return;
      }

      if (!inspectorStyle) {
        return;
      }

      const list = inspectorListRef.current;
      if (!list) {
        return;
      }

      const pageStep = Math.max(120, list.clientHeight * 0.82);
      let handled = true;
      let top = list.scrollTop;

      switch (event.key) {
        case "ArrowDown":
        case "j":
        case "J":
          top += 56;
          break;
        case "ArrowUp":
        case "k":
        case "K":
          top -= 56;
          break;
        case "PageDown":
          top += pageStep;
          break;
        case "PageUp":
          top -= pageStep;
          break;
        case "Home":
          top = 0;
          break;
        case "End":
          top = list.scrollHeight;
          break;
        default:
          handled = false;
      }

      if (!handled) {
        return;
      }

      event.preventDefault();
      list.scrollTo({
        top: clamp(top, 0, Math.max(0, list.scrollHeight - list.clientHeight)),
        behavior: "smooth",
      });
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [inspectorStocks.length, inspectorStyle, isMobile, selectedBoardName]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const context = canvas.getContext("2d");
      if (!context) {
        return;
      }

    const pixelRatio = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    canvas.width = Math.floor(canvasSize.width * pixelRatio);
    canvas.height = Math.floor(canvasSize.height * pixelRatio);
    canvas.style.width = `${canvasSize.width}px`;
    canvas.style.height = `${canvasSize.height}px`;

    const background = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    background.addColorStop(0, heatmapCanvasTheme.backgroundStart);
    background.addColorStop(1, heatmapCanvasTheme.backgroundEnd);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = background;
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.save();
    context.scale(pixelRatio, pixelRatio);
    context.translate(view.x, view.y);
    context.scale(view.scale, view.scale);

    for (const board of layout.boardRects) {
      context.fillStyle = heatmapCanvasTheme.boardFill;
      context.fillRect(board.x, board.y, board.width, board.height);
    }

    for (const subBoard of layout.subBoardRects) {
      const stats =
        sectorVisualStats.subBoards.get(sectorStatsKey(subBoard.boardName, subBoard.name)) ?? subBoard;
      context.fillStyle = thumbnailMode
        ? getHeatColor(activeHeatTheme, stats.changePct, priceColorMode, displayMode)
        : heatmapCanvasTheme.subBoardFill;
      context.fillRect(subBoard.x, subBoard.y, subBoard.width, subBoard.height);
    }

    if (!thumbnailMode) {
      for (const stock of layout.stockRects) {
        const quote = quotes[stock.code];
        const changePct = quote?.changePct ?? stock.changePct;
        context.fillStyle = getHeatColor(activeHeatTheme, changePct, priceColorMode, displayMode);
        context.fillRect(stock.x, stock.y, stock.width, stock.height);

        const isHighlighted = !heatmapBorders && highlightedStock?.code === stock.code;
        if (isHighlighted) {
          context.fillStyle = displayMode === "light" ? "rgba(255, 255, 255, 0.16)" : "rgba(255, 255, 255, 0.13)";
          context.fillRect(stock.x, stock.y, stock.width, stock.height);

          const markerSize = Math.min(11 / view.scale, stock.width * 0.28, stock.height * 0.28);
          if (markerSize >= 2 / view.scale) {
            context.fillStyle = "rgba(255, 255, 255, 0.92)";
            context.beginPath();
            context.moveTo(stock.x + stock.width, stock.y);
            context.lineTo(stock.x + stock.width - markerSize, stock.y);
            context.lineTo(stock.x + stock.width, stock.y + markerSize);
            context.closePath();
            context.fill();
          }
        }

        drawStockLabel(context, stock, view.scale, isHighlighted, quote);
      }
    }

    for (const subBoard of layout.subBoardRects) {
      const stats =
        sectorVisualStats.subBoards.get(sectorStatsKey(subBoard.boardName, subBoard.name)) ?? subBoard;
      const isActiveSubBoard =
        activeSubBoardName === subBoard.name && activeBoardName === subBoard.boardName;

      if (!thumbnailMode && subBoard.titleHeight > 0) {
        context.fillStyle = getBoardHeaderColor(
          activeHeatTheme,
          stats.changePct,
          priceColorMode,
          displayMode
        );
        context.fillRect(subBoard.x, subBoard.y, subBoard.width, subBoard.titleHeight);
      }

      if (heatmapBorders) {
        context.strokeStyle = isActiveSubBoard
          ? heatmapCanvasTheme.activeSubBoardStroke
          : heatmapCanvasTheme.subBoardBorder;
        context.lineWidth = isActiveSubBoard ? 2 : thumbnailMode ? 1.1 : 0.9;
        context.strokeRect(
          subBoard.x + 0.5,
          subBoard.y + 0.5,
          Math.max(0, subBoard.width - 1),
          Math.max(0, subBoard.height - 1)
        );
      } else if (isActiveSubBoard && thumbnailMode) {
        context.fillStyle = displayMode === "light" ? "rgba(255, 255, 255, 0.24)" : "rgba(255, 255, 255, 0.14)";
        context.fillRect(subBoard.x, subBoard.y, subBoard.width, subBoard.height);
      }

      if (heatmapBorders && isActiveSubBoard) {
        context.strokeStyle = heatmapCanvasTheme.activeSubBoardInner;
        context.lineWidth = 0.8;
        context.strokeRect(
          subBoard.x + 2.2,
          subBoard.y + 2.2,
          Math.max(0, subBoard.width - 4.4),
          Math.max(0, subBoard.height - 4.4)
        );
      }

      if (thumbnailMode) {
        drawSectorThumbnailLabel(context, { ...subBoard, ...stats }, messages, view.scale);
      } else if (subBoard.width > 44 && subBoard.titleHeight > 8) {
        drawSectorHeaderLabel(context, subBoard, {
          name: subBoard.name,
          changePct: stats.changePct,
          advanceCount: stats.advanceCount,
          declineCount: stats.declineCount,
          messages,
          compact: true,
          showStats: headerTrendStats,
        });
      }
    }

    for (const board of layout.boardRects) {
      const stats = sectorVisualStats.boards.get(board.name) ?? board;
      const isActiveBoard = activeBoardName === board.name;
      const isTitleHovered = hoveredBoardTitleName === board.name;
      const showDrillHint = isAllBoardsSelected && board.width > 72 && board.titleHeight > 10;

      if (board.titleHeight > 0) {
        context.fillStyle = getBoardHeaderColor(activeHeatTheme, stats.changePct, priceColorMode, displayMode);
        context.fillRect(board.x, board.y, board.width, board.titleHeight);

        if (isActiveBoard || isTitleHovered) {
          context.fillStyle = isTitleHovered ? "rgba(255, 255, 255, 0.22)" : "rgba(255, 255, 255, 0.12)";
          context.fillRect(board.x, board.y, board.width, board.titleHeight);
        }
      }

      if (heatmapBorders) {
        context.strokeStyle =
          isActiveBoard || isTitleHovered
            ? heatmapCanvasTheme.activeBoardStroke
            : heatmapCanvasTheme.boardBorder;
        context.lineWidth = isActiveBoard || isTitleHovered ? 1.8 : 1;
        context.strokeRect(board.x + 0.5, board.y + 0.5, Math.max(0, board.width - 1), Math.max(0, board.height - 1));
      }

      if (board.width > 56 && board.titleHeight > 10) {
        const isBreadcrumb = boardFilter.includes(board.name);
        const titleText = isBreadcrumb
          ? boardFilter.length === 1
            ? `‹ ${messages.boardBreadcrumbAll} - ${board.name}`
            : `‹ ${board.name}`
          : board.name;
        drawSectorHeaderLabel(context, board, {
          name: titleText,
          changePct: stats.changePct,
          advanceCount: stats.advanceCount,
          declineCount: stats.declineCount,
          messages,
          showDrillHint,
          showStats: thumbnailMode || headerTrendStats,
        });

        if (showDrillHint) {
          context.fillStyle = isTitleHovered || isActiveBoard ? "rgba(255, 255, 255, 0.95)" : "rgba(247, 250, 252, 0.72)";
          context.font = heatmapFont(700, Math.max(10, clamp(Math.floor(board.titleHeight * 0.52), 10, 15)));
          context.textAlign = "right";
          context.textBaseline = "middle";
          context.fillText("›", board.x + board.width - 8, board.y + board.titleHeight / 2 + 0.5);
        }
      }
    }

    if (highlightedStock) {
      if (heatmapBorders) {
        context.strokeStyle = heatmapCanvasTheme.highlightOuter;
        context.lineWidth = 4;
        context.strokeRect(
          highlightedStock.x + 1,
          highlightedStock.y + 1,
          Math.max(0, highlightedStock.width - 2),
          Math.max(0, highlightedStock.height - 2)
        );

        context.strokeStyle = heatmapCanvasTheme.highlightInner;
        context.lineWidth = 2;
        context.strokeRect(
          highlightedStock.x + 1,
          highlightedStock.y + 1,
          Math.max(0, highlightedStock.width - 2),
          Math.max(0, highlightedStock.height - 2)
        );
      }
    }

    context.restore();

    // First successful paint of any data makes the sample Canvas authoritative —
    // hide the full-screen loading overlay from then on so it never masks the bars.
      setSamplePainted(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [
    canvasSize.height,
    canvasSize.width,
    activeBoardName,
    activeSubBoardName,
    boardFilter,
    highlightedStock,
    heatmapCanvasTheme,
    hoveredBoardTitleName,
    isAllBoardsSelected,
    layout.boardRects,
    layout.subBoardRects,
    layout.stockRects,
    messages,
    thumbnailMode,
    headerTrendStats,
    heatmapBorders,
    activeHeatTheme,
    displayMode,
    priceColorMode,
    quotes,
    sectorVisualStats,
    view.scale,
    view.x,
    view.y,
  ]);

  const toWorldPoint = useCallback(
    (screenX: number, screenY: number) => ({
      x: (screenX - view.x) / view.scale,
      y: (screenY - view.y) / view.scale,
    }),
    [view.scale, view.x, view.y]
  );

  const pickStock = useCallback((worldX: number, worldY: number) => {
    for (let index = lastStockRectsRef.current.length - 1; index >= 0; index -= 1) {
      const stock = lastStockRectsRef.current[index];
      if (
        worldX >= stock.x &&
        worldX <= stock.x + stock.width &&
        worldY >= stock.y &&
        worldY <= stock.y + stock.height
      ) {
        return stock;
      }
    }

    return null;
  }, []);

  const pickBoard = useCallback((worldX: number, worldY: number) => {
    for (let index = lastBoardRectsRef.current.length - 1; index >= 0; index -= 1) {
      const board = lastBoardRectsRef.current[index];
      if (
        worldX >= board.x &&
        worldX <= board.x + board.width &&
        worldY >= board.y &&
        worldY <= board.y + board.height
      ) {
        return board;
      }
    }

    return null;
  }, []);

  const pickBoardTitle = useCallback((worldX: number, worldY: number) => {
    for (let index = lastBoardRectsRef.current.length - 1; index >= 0; index -= 1) {
      const board = lastBoardRectsRef.current[index];
      if (
        board.titleHeight > 0 &&
        worldX >= board.x &&
        worldX <= board.x + board.width &&
        worldY >= board.y &&
        worldY <= board.y + board.titleHeight
      ) {
        return board;
      }
    }

    return null;
  }, []);

  const pickSubBoard = useCallback((worldX: number, worldY: number) => {
    for (let index = lastSubBoardRectsRef.current.length - 1; index >= 0; index -= 1) {
      const subBoard = lastSubBoardRectsRef.current[index];
      if (
        worldX >= subBoard.x &&
        worldX <= subBoard.x + subBoard.width &&
        worldY >= subBoard.y &&
        worldY <= subBoard.y + subBoard.height
      ) {
        return subBoard;
      }
    }

    return null;
  }, []);

  const pickSubBoardTitle = useCallback((worldX: number, worldY: number) => {
    for (let index = lastSubBoardRectsRef.current.length - 1; index >= 0; index -= 1) {
      const subBoard = lastSubBoardRectsRef.current[index];
      if (
        subBoard.titleHeight > 0 &&
        worldX >= subBoard.x &&
        worldX <= subBoard.x + subBoard.width &&
        worldY >= subBoard.y &&
        worldY <= subBoard.y + subBoard.titleHeight
      ) {
        return subBoard;
      }
    }

    return null;
  }, []);

  const onMouseMove = useCallback(
    (event: ReactMouseEvent<HTMLCanvasElement>) => {
      if (isMobile) {
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      const bounds = canvas.getBoundingClientRect();
      const pointerX = event.clientX - bounds.left;
      const pointerY = event.clientY - bounds.top;

      if (dragStateRef.current.active) {
        const deltaX = event.clientX - dragStateRef.current.pointerX;
        const deltaY = event.clientY - dragStateRef.current.pointerY;
        dragStateRef.current.pointerX = event.clientX;
        dragStateRef.current.pointerY = event.clientY;

        if (
          Math.hypot(event.clientX - dragStateRef.current.startX, event.clientY - dragStateRef.current.startY) > 4
        ) {
          dragStateRef.current.moved = true;
        }

        setView((current) => {
          const nextOffset = clampOffset(
            canvasSize.width,
            canvasSize.height,
            current.scale,
            current.x + deltaX,
            current.y + deltaY
          );

          if (nextOffset.x === current.x && nextOffset.y === current.y) {
            return current;
          }

          return {
            ...current,
            x: nextOffset.x,
            y: nextOffset.y,
          };
        });
        return;
      }

      if (
        Math.hypot(event.clientX - dragStateRef.current.startX, event.clientY - dragStateRef.current.startY) > 4
      ) {
        dragStateRef.current.moved = true;
      }

      const world = toWorldPoint(pointerX, pointerY);
      const stock = pickStock(world.x, world.y);
      const boardTitle = stock ? null : pickBoardTitle(world.x, world.y);
      const subBoard = stock
        ? { name: stock.subBoardName, boardName: stock.boardName }
        : pickSubBoard(world.x, world.y);
      const board = stock
        ? { name: stock.boardName }
        : subBoard
          ? { name: subBoard.boardName }
          : pickBoard(world.x, world.y);

      setHoveredStockCode(stock?.code ?? null);
      setHoveredBoardName(board?.name ?? null);
      setHoveredBoardTitleName(boardTitle?.name ?? null);
      setHoveredSubBoardName(subBoard?.name || null);
    },
    [canvasSize.height, canvasSize.width, isMobile, pickBoard, pickBoardTitle, pickStock, pickSubBoard, toWorldPoint]
  );

  const onMouseDown = useCallback(
    (event: ReactMouseEvent<HTMLCanvasElement>) => {
      dragStateRef.current.startX = event.clientX;
      dragStateRef.current.startY = event.clientY;
      dragStateRef.current.moved = false;

      if (isMobile || view.scale <= 1) {
        return;
      }

      event.preventDefault();
      dragStateRef.current.active = true;
      dragStateRef.current.pointerX = event.clientX;
      dragStateRef.current.pointerY = event.clientY;
      setIsPanning(true);
    },
    [isMobile, view.scale]
  );

  const onMouseUp = useCallback(() => {
    dragStateRef.current.active = false;
    setIsPanning(false);
  }, []);

  const onMouseLeave = useCallback(() => {
    dragStateRef.current.active = false;
    setIsPanning(false);
    if (!isMobile) {
      setHoveredStockCode(null);
      setHoveredBoardName(null);
      setHoveredBoardTitleName(null);
      setHoveredSubBoardName(null);
    }
  }, [isMobile]);

  const onWheel = useCallback(
    (event: WheelEvent) => {
      event.preventDefault();

      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      const bounds = canvas.getBoundingClientRect();
      const cursorX = event.clientX - bounds.left;
      const cursorY = event.clientY - bounds.top;

      setView((current) => {
        const step = event.deltaY < 0 ? 0.16 : -0.16;
        const nextScale = clamp(current.scale + step, minZoom, maxZoom);

        if (nextScale === current.scale) {
          return current;
        }

        const worldX = (cursorX - current.x) / current.scale;
        const worldY = (cursorY - current.y) / current.scale;
        const rawX = cursorX - worldX * nextScale;
        const rawY = cursorY - worldY * nextScale;
        const nextOffset = clampOffset(canvasSize.width, canvasSize.height, nextScale, rawX, rawY);

        return {
          scale: nextScale,
          x: nextOffset.x,
          y: nextOffset.y,
        };
      });
    },
    [canvasSize.height, canvasSize.width, maxZoom]
  );

  // React delegates wheel listeners as passive at the root, so preventDefault()
  // must run in our own non-passive native listener instead of the onWheel prop.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      canvas.removeEventListener("wheel", onWheel);
    };
  }, [onWheel]);

  const toggleBoardFilter = useCallback((boardName: string) => {
    setBoardFilter((current) => toggleBoardInFilter(current, boardName));
  }, []);

  const clearBoardFilter = useCallback(() => {
    setBoardFilter([]);
  }, []);

  const clearBoardClickTimer = useCallback(() => {
    if (boardClickTimerRef.current) {
      clearTimeout(boardClickTimerRef.current);
      boardClickTimerRef.current = null;
    }
  }, []);

  const handleCanvasTap = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      const bounds = canvas.getBoundingClientRect();
      const world = toWorldPoint(clientX - bounds.left, clientY - bounds.top);

      const boardTitle = pickBoardTitle(world.x, world.y);
      if (boardTitle) {
        toggleBoardFilter(boardTitle.name);
        return;
      }

      const subBoardTitle = pickSubBoardTitle(world.x, world.y);
      if (subBoardTitle) {
        toggleBoardFilter(subBoardTitle.boardName);
        return;
      }

      const stock = pickStock(world.x, world.y);

      if (stock) {
        setSelectedStockCode(stock.code);
        setSelectedBoardName(stock.boardName);
        setSelectedSubBoardName(stock.subBoardName || null);
        return;
      }

      const subBoard = pickSubBoard(world.x, world.y);
      if (subBoard) {
        setSelectedStockCode(null);
        setSelectedBoardName(subBoard.boardName);
        setSelectedSubBoardName(subBoard.name);
        return;
      }

      const board = pickBoard(world.x, world.y);
      if (board) {
        setSelectedStockCode(null);
        setSelectedBoardName(board.name);
        setSelectedSubBoardName(null);
        return;
      }

      setSelectedStockCode(null);
      setSelectedBoardName(null);
      setSelectedSubBoardName(null);
    },
    [pickBoard, pickBoardTitle, pickStock, pickSubBoard, pickSubBoardTitle, toWorldPoint, toggleBoardFilter]
  );

  const handleCanvasDoubleTap = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return false;
      }

      const bounds = canvas.getBoundingClientRect();
      const world = toWorldPoint(clientX - bounds.left, clientY - bounds.top);

      const boardTitle = pickBoardTitle(world.x, world.y);
      if (boardTitle) {
        toggleBoardFilter(boardTitle.name);
        return true;
      }

      const subBoardTitle = pickSubBoardTitle(world.x, world.y);
      if (subBoardTitle) {
        toggleBoardFilter(subBoardTitle.boardName);
        return true;
      }

      // On touch devices the title strip is small; fall back to the whole
      // board so users can double-tap anywhere inside a 一级板块 to toggle.
      const board = pickBoard(world.x, world.y);
      if (board) {
        toggleBoardFilter(board.name);
        return true;
      }

      return false;
    },
    [pickBoard, pickBoardTitle, pickSubBoardTitle, toWorldPoint, toggleBoardFilter]
  );

  const openXueqiuForStock = useCallback((code: string) => {
    window.open(`https://xueqiu.com/S/${toXueqiuSymbol(code)}`, "_blank", "noopener,noreferrer");
  }, []);

  const closeMobileSheet = useCallback(() => {
    setSelectedStockCode(null);
    setSelectedBoardName(null);
    setSelectedSubBoardName(null);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    function midpointDistance(touches: TouchList) {
      if (touches.length < 2) {
        return 0;
      }
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.hypot(dx, dy);
    }

    function midpoint(touches: TouchList) {
      return {
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2,
      };
    }

    function onTouchStart(event: TouchEvent) {
      const canvasEl = canvasRef.current;
      if (!canvasEl) {
        return;
      }

      const state = touchStateRef.current;

      if (event.touches.length === 2) {
        event.preventDefault();
        const bounds = canvasEl.getBoundingClientRect();
        const center = midpoint(event.touches);
        const cursorX = center.x - bounds.left;
        const cursorY = center.y - bounds.top;

        state.mode = "pinch";
        state.moved = true;
        state.startDistance = midpointDistance(event.touches) || 1;
        state.pinchCenterX = cursorX;
        state.pinchCenterY = cursorY;
        setView((current) => {
          state.startScale = current.scale;
          state.startOffsetX = current.x;
          state.startOffsetY = current.y;
          state.pinchWorldX = (cursorX - current.x) / current.scale;
          state.pinchWorldY = (cursorY - current.y) / current.scale;
          return current;
        });
        return;
      }

      if (event.touches.length === 1) {
        const touch = event.touches[0];
        state.mode = "tap";
        state.moved = false;
        state.startTs = Date.now();
        state.startClientX = touch.clientX;
        state.startClientY = touch.clientY;
        state.lastClientX = touch.clientX;
        state.lastClientY = touch.clientY;
      }
    }

    function onTouchMove(event: TouchEvent) {
      const state = touchStateRef.current;

      if (event.touches.length >= 2 && state.mode === "pinch") {
        event.preventDefault();
        const currentDistance = midpointDistance(event.touches);
        if (!currentDistance) {
          return;
        }

        const ratio = currentDistance / state.startDistance;
        const nextScale = clamp(state.startScale * ratio, minZoom, maxZoom);
        const rawX = state.pinchCenterX - state.pinchWorldX * nextScale;
        const rawY = state.pinchCenterY - state.pinchWorldY * nextScale;

        setView(() => {
          const nextOffset = clampOffset(canvasSize.width, canvasSize.height, nextScale, rawX, rawY);
          return {
            scale: nextScale,
            x: nextOffset.x,
            y: nextOffset.y,
          };
        });
        return;
      }

      if (event.touches.length === 1 && (state.mode === "tap" || state.mode === "pan")) {
        const touch = event.touches[0];
        const deltaFromStart = Math.hypot(
          touch.clientX - state.startClientX,
          touch.clientY - state.startClientY
        );

        if (state.mode === "tap" && deltaFromStart > 6) {
          state.mode = "pan";
          state.moved = true;
        }

        if (state.mode !== "pan") {
          return;
        }

        event.preventDefault();
        const deltaX = touch.clientX - state.lastClientX;
        const deltaY = touch.clientY - state.lastClientY;
        state.lastClientX = touch.clientX;
        state.lastClientY = touch.clientY;

        setView((current) => {
          if (current.scale <= 1) {
            return current;
          }
          const nextOffset = clampOffset(
            canvasSize.width,
            canvasSize.height,
            current.scale,
            current.x + deltaX,
            current.y + deltaY
          );
          if (nextOffset.x === current.x && nextOffset.y === current.y) {
            return current;
          }
          return { ...current, x: nextOffset.x, y: nextOffset.y };
        });
      }
    }

    function onTouchEnd(event: TouchEvent) {
      const state = touchStateRef.current;

      if (state.mode === "tap" && !state.moved && Date.now() - state.startTs < 350) {
        const now = Date.now();
        const sinceLastTap = now - state.lastTapTs;
        const tapDistance = Math.hypot(
          state.startClientX - state.lastTapX,
          state.startClientY - state.lastTapY
        );

        if (state.lastTapTs > 0 && sinceLastTap < 320 && tapDistance < 32) {
          const consumed = handleCanvasDoubleTap(state.startClientX, state.startClientY);
          state.lastTapTs = 0;
          state.lastTapX = 0;
          state.lastTapY = 0;
          if (consumed) {
            // The canvas already has `touch-action: none`, which suppresses
            // the browser's default double-tap-zoom, so we don't need to
            // call preventDefault here (the touchend listener is passive).
            if (event.touches.length === 0) {
              state.mode = "idle";
              state.moved = false;
            }
            return;
          }
        } else {
          state.lastTapTs = now;
          state.lastTapX = state.startClientX;
          state.lastTapY = state.startClientY;
        }

        handleCanvasTap(state.startClientX, state.startClientY);
      }

      if (event.touches.length === 0) {
        state.mode = "idle";
        state.moved = false;
        return;
      }

      if (event.touches.length === 1 && state.mode === "pinch") {
        const touch = event.touches[0];
        state.mode = "pan";
        state.moved = true;
        state.startClientX = touch.clientX;
        state.startClientY = touch.clientY;
        state.lastClientX = touch.clientX;
        state.lastClientY = touch.clientY;
      }
    }

    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd, { passive: true });
    canvas.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
      canvas.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [canvasSize.height, canvasSize.width, handleCanvasDoubleTap, handleCanvasTap, maxZoom]);

  const onDoubleClick = useCallback(
    (event: ReactMouseEvent<HTMLCanvasElement>) => {
      if (isMobile) {
        return;
      }

      clearBoardClickTimer();

      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      const bounds = canvas.getBoundingClientRect();
      const world = toWorldPoint(event.clientX - bounds.left, event.clientY - bounds.top);

      const boardTitle = pickBoardTitle(world.x, world.y);
      if (boardTitle) {
        toggleBoardFilter(boardTitle.name);
        return;
      }

      const subBoardTitle = pickSubBoardTitle(world.x, world.y);
      if (subBoardTitle) {
        toggleBoardFilter(subBoardTitle.boardName);
        return;
      }

      const stock = pickStock(world.x, world.y);
      if (!stock) {
        return;
      }

      window.open(`https://xueqiu.com/S/${toXueqiuSymbol(stock.code)}`, "_blank", "noopener,noreferrer");
    },
    [clearBoardClickTimer, isMobile, pickBoardTitle, pickStock, pickSubBoardTitle, toWorldPoint, toggleBoardFilter]
  );

  const onCanvasClick = useCallback(
    (event: ReactMouseEvent<HTMLCanvasElement>) => {
      if (isMobile || dragStateRef.current.moved) {
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      const bounds = canvas.getBoundingClientRect();
      const world = toWorldPoint(event.clientX - bounds.left, event.clientY - bounds.top);

      const boardTitle = pickBoardTitle(world.x, world.y);
      const subBoardTitle = boardTitle ? null : pickSubBoardTitle(world.x, world.y);
      if (!boardTitle && !subBoardTitle) {
        return;
      }

      clearBoardClickTimer();
      boardClickTimerRef.current = setTimeout(() => {
        boardClickTimerRef.current = null;
        if (boardTitle) {
          toggleBoardFilter(boardTitle.name);
          return;
        }

        if (subBoardTitle) {
          toggleBoardFilter(subBoardTitle.boardName);
        }
      }, 220);
    },
    [clearBoardClickTimer, isMobile, pickBoardTitle, pickSubBoardTitle, toWorldPoint, toggleBoardFilter]
  );

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((current) => !current);
  }, []);

  useEffect(() => {
    if (!isFullscreen) {
      return;
    }

    toast(isMobile ? messages.fullscreenToastMobile : messages.fullscreenToast, {
      id: "heatmap-fullscreen-hint",
      duration: 3200,
    });
  }, [isFullscreen, isMobile, messages.fullscreenToast, messages.fullscreenToastMobile]);

  const resetView = useCallback(() => {
    setView({ scale: 1, x: 0, y: 0 });
  }, []);

  const createSharePreview = useCallback(async () => {
    const sourceCanvas = canvasRef.current;
    if (!sourceCanvas) {
      return;
    }

    setSharePending(true);

    try {
      const pixelRatio = sourceCanvas.width / Math.max(1, canvasSize.width);
      const baseWidth = Math.max(1, canvasSize.width);
      const cssFontPx = clamp(baseWidth * 0.0085, 9, 11);
      const cssHorizontalPadding = clamp(baseWidth * 0.008, 6, 12);
      const cssBandPadding = cssFontPx * 1.55 + 2;
      const horizontalPadding = cssHorizontalPadding * pixelRatio;
      const topPadding = cssBandPadding * pixelRatio;
      const bottomPadding = cssBandPadding * pixelRatio;
      const fontPx = cssFontPx * pixelRatio;
      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = Math.round(sourceCanvas.width + horizontalPadding * 2);
      exportCanvas.height = Math.round(sourceCanvas.height + topPadding + bottomPadding);

      const context = exportCanvas.getContext("2d");
      if (!context) {
        throw new Error("Preview context unavailable");
      }

      const background = context.createLinearGradient(0, 0, exportCanvas.width, exportCanvas.height);
      background.addColorStop(0, isLightMode ? heatmapCanvasThemes.light.backgroundStart : "#151922");
      background.addColorStop(1, isLightMode ? heatmapCanvasThemes.light.backgroundEnd : "#0f1319");
      context.fillStyle = background;
      context.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
      context.drawImage(sourceCanvas, horizontalPadding, topPadding);

      let domainStartX = horizontalPadding;
      try {
        const logoRaster = await loadShareLogoRaster();
        const logoSize = Math.min(
          Math.max(fontPx * 1.55, topPadding * 0.32),
          topPadding * 0.68
        );
        const logoY = (topPadding - logoSize) / 2;
        drawShareLogoRaster(context, logoRaster, horizontalPadding, logoY, logoSize, logoSize);
        domainStartX = horizontalPadding + logoSize + fontPx * 0.65;
      } catch {
        /* optional: share without logo if asset fails */
      }

      const shareTitle =
        baseWidth < 520
          ? `${messages.title} ${getCompactPeriodLabel(period, "zh")} ${formatShareTimestamp(updatedAt)}`
          : `${messages.title}｜${getPeriodLabel(messages, period)} ${formatShareTimestamp(updatedAt)}`;
      const shareUrlLight = isLightMode ? "rgba(15, 23, 42, 0.96)" : "rgba(247, 250, 252, 0.98)";
      const shareUrlParts: { text: string; fillStyle: string }[] = [
        { text: "map.wenyuanw", fillStyle: shareUrlLight },
        { text: ".me", fillStyle: "#22c55e" },
      ];

      const headerY = topPadding / 2;
      const footerY = exportCanvas.height - bottomPadding / 2;
      const rightEdge = exportCanvas.width - horizontalPadding;

      context.save();
      context.textBaseline = "middle";
      context.shadowColor = isLightMode ? "rgba(255, 255, 255, 0.52)" : "rgba(0, 0, 0, 0.28)";
      context.shadowBlur = Math.max(4, fontPx * 0.5);
      context.font = `600 ${fontPx}px Arial, sans-serif`;
      context.textAlign = "left";

      let urlX = domainStartX;
      for (const part of shareUrlParts) {
        context.fillStyle = part.fillStyle;
        context.fillText(part.text, urlX, headerY);
        urlX += context.measureText(part.text).width;
      }

      context.textAlign = "right";
      context.fillStyle = isLightMode ? "rgba(15, 23, 42, 0.92)" : "rgba(247, 250, 252, 0.96)";
      context.font = `600 ${fontPx}px Arial, sans-serif`;
      context.fillText(shareTitle, rightEdge, footerY);
      context.restore();

      const blob = await canvasToBlob(exportCanvas);
      const url = URL.createObjectURL(blob);
      const stamp = updatedAt ? updatedAt.replace(/[:T]/g, "-").slice(0, 19) : Date.now().toString();
      const filename = `ashare-heatmap-${market}-${period}-${stamp}.png`;

      setSharePreview((current) => {
        if (current) {
          URL.revokeObjectURL(current.url);
        }

        return { url, filename, blob };
      });
    } catch {
      toast.error(messages.shareFailed, {
        id: "heatmap-share-generate",
        duration: 3200,
      });
    } finally {
      setSharePending(false);
    }
  }, [canvasSize.width, isLightMode, market, messages, period, updatedAt]);

  useHeatmapWebMcp({
    enabled: preferencesReady,
    market,
    period,
    boardFilter,
    trendFilter:
      trendFilter === risingOnlyValue ? "rising" : trendFilter === fallingOnlyValue ? "falling" : "all",
    changeRangeFilter,
    sizeMode,
    thumbnailMode,
    headerTrendStats,
    refreshIntervalSeconds,
    heatThemeId,
    customHeatThemes,
    watchlist,
    treemapData,
    visibleTreemapData,
    quotes,
    marketSummaries,
    dataSource,
    updatedAt,
    loading,
    error,
    view,
    selectedStockCode,
    selectedBoardName,
    selectedSubBoardName,
    onHeatThemeIdChange: setHeatThemeId,
    onCustomHeatThemesChange: setCustomHeatThemes,
    onMarketChange: setMarket,
    onPeriodChange: setPeriod,
    onBoardFilterChange: setBoardFilter,
    onTrendFilterChange: (filter) => {
      setTrendFilter(filter === "rising" ? risingOnlyValue : filter === "falling" ? fallingOnlyValue : allTrendsValue);
    },
    onChangeRangeFilterChange: applyChangeRange,
    onSizeModeChange: setSizeMode,
    onThumbnailModeChange: setThumbnailMode,
    onViewChange: setView,
    onSelectStock: setSelectedStockCode,
    onSelectBoard: setSelectedBoardName,
    onSelectSubBoard: setSelectedSubBoardName,
    onRetryDataLoad: retryDataLoad,
    onResetView: resetView,
    onCreateSharePreview: createSharePreview,
    onAddWatchlistItem: addWatchlistItem,
    onRemoveWatchlistItem: removeWatchlistItem,
    onClearWatchlist: clearWatchlist,
  });

  const downloadSharePreview = useCallback(() => {
    if (!sharePreview) {
      return;
    }

    const anchor = document.createElement("a");
    anchor.href = sharePreview.url;
    anchor.download = sharePreview.filename;
    anchor.click();
  }, [sharePreview]);

  const copySharePreview = useCallback(async () => {
    if (!sharePreview) {
      return;
    }

    try {
      if (!("clipboard" in navigator) || typeof ClipboardItem === "undefined") {
        throw new Error("Clipboard image copy is not supported");
      }

      await navigator.clipboard.write([
        new ClipboardItem({
          [sharePreview.blob.type]: sharePreview.blob,
        }),
      ]);
      toast.success(messages.copySuccess, {
        id: "heatmap-share-preview-copy",
        duration: 3200,
      });
    } catch {
      toast.error(messages.copyFailed, {
        id: "heatmap-share-preview-copy",
        duration: 3200,
      });
    }
  }, [messages.copyFailed, messages.copySuccess, sharePreview]);

  const [canShareSystem, setCanShareSystem] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
      setCanShareSystem(false);
      return;
    }

    if (!sharePreview) {
      setCanShareSystem(true);
      return;
    }

    try {
      const file = new File([sharePreview.blob], sharePreview.filename, {
        type: sharePreview.blob.type || "image/png",
      });
      const supportsFile =
        typeof navigator.canShare === "function" ? navigator.canShare({ files: [file] }) : true;
      setCanShareSystem(Boolean(supportsFile));
    } catch {
      setCanShareSystem(false);
    }
  }, [sharePreview]);

  const shareSystemPreview = useCallback(async () => {
    if (!sharePreview) {
      return;
    }

    if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
      toast.error(messages.shareUnsupported, {
        id: "heatmap-share-system",
        duration: 3200,
      });
      return;
    }

    try {
      const file = new File([sharePreview.blob], sharePreview.filename, {
        type: sharePreview.blob.type || "image/png",
      });
      const payload: ShareData = {
        title: messages.shareDialogTitle,
        text: messages.shareDialogText,
        url: window.location.href,
      };

      if (
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] })
      ) {
        payload.files = [file];
      }

      await navigator.share(payload);
      toast.success(messages.shareSuccess, {
        id: "heatmap-share-system",
        duration: 3200,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        toast(messages.shareCancelled, {
          id: "heatmap-share-cancelled",
          duration: 2200,
        });
        return;
      }
      toast.error(messages.shareUnsupported, {
        id: "heatmap-share-system",
        duration: 3200,
      });
    }
  }, [
    messages.shareCancelled,
    messages.shareDialogText,
    messages.shareDialogTitle,
    messages.shareSuccess,
    messages.shareUnsupported,
    sharePreview,
  ]);

  const closeSharePreview = useCallback(() => {
    setSharePreview((current) => {
      if (current) {
        URL.revokeObjectURL(current.url);
      }
      return null;
    });
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName;
      const typingInField =
        target?.isContentEditable ||
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        tagName === "SELECT";

      if (event.key === "Escape") {
        if (shortcutRecording) {
          return;
        }
        if (sharePreview) {
          event.preventDefault();
          closeSharePreview();
          return;
        }
        if (settingsOpen) {
          event.preventDefault();
          setSettingsOpen(false);
          return;
        }
        if (filtersOpen) {
          event.preventDefault();
          setFiltersOpen(false);
          return;
        }
        if (isFullscreen && !typingInField) {
          event.preventDefault();
          setIsFullscreen(false);
        }
        return;
      }

      if (typingInField) {
        return;
      }

      if (shortcutRecording) {
        return;
      }

      const action = resolveShortcutAction(shortcutBindings, event);
      if (!action) {
        return;
      }

      if (sharePreview) {
        return;
      }

      if (settingsOpen && action !== "settings") {
        return;
      }

      if (action === "share" && sharePending) {
        return;
      }

      event.preventDefault();

      switch (action) {
        case "share":
          void createSharePreview();
          break;
        case "resetView":
          resetView();
          break;
        case "fullscreen":
          toggleFullscreen();
          break;
        case "settings":
          setFiltersOpen(false);
          setSettingsOpen((current) => !current);
          break;
        case "filters":
          toggleFilters();
          break;
        case "toggleWatchlist":
          if (!isMobile && activeStock) {
            toggleWatchlistItem(activeStock);
          }
          break;
        case "sidebar":
          if (isMobile) {
            setSidebarOpen((current) => !current);
          } else {
            setDesktopSidebarCollapsed((current) => !current);
          }
          break;
        case "displayMode":
          setDisplayMode((current) => (current === "dark" ? "light" : "dark"));
          break;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [
    activeStock,
    closeSharePreview,
    createSharePreview,
    filtersOpen,
    isFullscreen,
    isMobile,
    resetView,
    settingsOpen,
    sharePending,
    sharePreview,
    shortcutBindings,
    shortcutRecording,
    toggleFilters,
    toggleFullscreen,
    toggleWatchlistItem,
  ]);

  const lastUpdatedText =
    // A freshly-loaded archival snapshot has a fixed old timestamp; label it clearly so
    // the clock never misreads as stale data once live quotes have streamed in.
    periodDataUnavailable || (period !== "day" && treemapData?.period !== period)
      ? "--:--:--"
      : dataSource === "fallback"
        ? messages.sampleDataLabel
        : updatedAt
          ? new Date(updatedAt).toLocaleTimeString()
          : "--:--:--";
  const watchlistChangePct =
    !periodDataUnavailable && isWatchlist && treemapData?.period === period && treemapData.stockCount > 0
      ? treemapData.summary.indexChangePct
      : undefined;

  return (
    <div
      className={cn(
        "relative min-h-0 bg-background",
        isFullscreen ? "fixed inset-0 z-[9999]" : "flex min-h-0 flex-1 flex-col"
      )}
      style={brandStyle}
    >
      <div
        className={cn(
          "grid min-h-0",
          isFullscreen ? "h-full" : "min-h-0 flex-1",
          isFullscreen
            ? "grid-cols-[1fr]"
            : "grid-cols-[1fr] grid-rows-[minmax(0,1fr)_auto] md:grid-cols-[auto_minmax(0,1fr)]"
        )}
      >
        {!isFullscreen && sidebarOpen && (
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label={messages.collapseSidebar}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          />
        )}

        {!isFullscreen && (
          <aside
            className={cn(
              "row-start-1 min-h-0 min-w-0 border-r border-border bg-card/95 text-card-foreground",
              "fixed inset-y-0 left-0 z-50 w-[280px] transform shadow-2xl transition-transform duration-300 ease-out",
              sidebarOpen ? "translate-x-0" : "-translate-x-full",
              "md:static md:z-auto md:row-span-2 md:translate-x-0 md:overflow-hidden md:shadow-none",
              "md:transition-[width,opacity,border-color] md:duration-[320ms] md:ease-[cubic-bezier(0.22,1,0.36,1)]",
              desktopSidebarCollapsed
                ? "md:pointer-events-none md:w-0 md:border-transparent md:opacity-0"
                : "md:w-[148px] md:opacity-100 lg:w-[162px]"
            )}
            aria-hidden={(!sidebarOpen && isMobile) || (!isMobile && desktopSidebarCollapsed)}
          >
            <div
              className={cn(
                "flex h-full min-h-0 w-full flex-col",
                "md:w-[148px] lg:w-[162px]",
                desktopSidebarCollapsed && "md:pointer-events-none"
              )}
            >
              <div className={cn("flex items-center justify-between gap-2 border-b border-border px-2 py-1.5 sm:px-2.5", isEnglish && "py-1")}>
                <div className="flex min-w-0 items-center gap-2">
                  <img
                    src="/icon.svg"
                    alt=""
                    className="size-7 shrink-0"
                    decoding="async"
                  />
                  <h2
                    className={cn(
                      "min-w-0 truncate whitespace-nowrap font-semibold leading-tight tracking-[0.01em]",
                      isEnglish ? "text-[12px] sm:text-[13px]" : "text-[13px] sm:text-sm"
                    )}
                  >
                    {messages.title}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  aria-label={messages.collapseSidebar}
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-background/70 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
                >
                  <X className="size-4" />
                </button>
              </div>

            <div
              className={cn(
                "flex-1 overflow-y-auto overflow-x-hidden px-1.5 py-1.5 sm:px-2 sm:py-1.5",
                isEnglish && "px-1.5 py-1 sm:px-1.5"
              )}
            >
              <div className={cn("mb-1.5 flex items-center justify-between border border-border bg-muted/18 px-1.5 py-1 text-muted-foreground", isEnglish && "mb-1 px-1.5 py-1")}>
                <span className={cn("font-semibold uppercase tracking-[0.12em]", isEnglish ? "text-[8.5px]" : "text-[9px]")}>
                  {messages.lastUpdated}
                </span>
                <span className={cn("inline-flex items-center gap-1 font-semibold tabular-nums text-foreground", isEnglish ? "text-[9px]" : "text-[10px]")}>
                  {loading ? (
                    <>
                      <Loader2 className="size-2.5 animate-spin text-brand" aria-hidden />
                      {messages.updating}
                    </>
                  ) : (
                    lastUpdatedText
                  )}
                </span>
              </div>
              <div className={cn("space-y-1", isEnglish && "space-y-0.5")}>
                {marketOptions.map((option) => {
                  const summary = periodDataUnavailable ? undefined : marketSummaries[option];
                  const isActive = market === option;

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setMarket(option);
                        if (isMobile) {
                          setSidebarOpen(false);
                        }
                      }}
                      className={cn(
                        "flex w-full min-w-0 items-center justify-between border px-1.5 py-1.5 text-left transition-colors",
                        isEnglish && "px-1.5 py-1",
                        isActive
                          ? "border-brand/55 bg-brand/12 text-foreground"
                          : "border-border bg-background hover:bg-muted"
                      )}
                    >
                      <span
                        className={cn(
                          "min-w-0 pr-2 leading-tight",
                          isEnglish ? "text-[10.5px]" : "text-[12px]"
                        )}
                      >
                        {getCompactMarketLabel(messages, option, locale)}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 font-semibold tabular-nums",
                          isEnglish ? "text-[10.5px]" : "text-[12px]"
                        )}
                        style={{
                          color: getChangeTextColor(
                            activeHeatTheme,
                            summary?.changePct ?? 0,
                            priceColorMode,
                            displayMode
                          ),
                        }}
                      >
                        {summary ? formatCompactChange(summary.changePct) : "--"}
                      </span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    if (watchlist.length === 0) {
                      openWatchlistSettings();
                      if (isMobile) {
                        setSidebarOpen(false);
                      }
                      return;
                    }
                    setMarket(watchlistUniverseKey);
                    if (isMobile) {
                      setSidebarOpen(false);
                    }
                  }}
                  className={cn(
                    "flex w-full min-w-0 items-center justify-between border px-1.5 py-1.5 text-left transition-colors",
                    isEnglish && "px-1.5 py-1",
                    isWatchlist
                      ? "border-brand/55 bg-brand/12 text-foreground"
                      : "border-border bg-background hover:bg-muted"
                  )}
                >
                  <span
                    className={cn(
                      "min-w-0 pr-2 leading-tight",
                      isEnglish ? "text-[10.5px]" : "text-[12px]"
                    )}
                  >
                    {getCompactMarketLabel(messages, watchlistUniverseKey, locale)}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 font-semibold tabular-nums",
                      isEnglish ? "text-[10.5px]" : "text-[12px]"
                    )}
                    style={{
                      color: getChangeTextColor(
                        activeHeatTheme,
                        watchlistChangePct ?? 0,
                        priceColorMode,
                        displayMode
                      ),
                    }}
                  >
                    {typeof watchlistChangePct === "number" && Number.isFinite(watchlistChangePct)
                      ? formatCompactChange(watchlistChangePct)
                      : watchlist.length > 0
                        ? String(watchlist.length)
                        : "--"}
                  </span>
                </button>
              </div>

              <button
                type="button"
                ref={sidebarFilterTriggerRef}
                onClick={toggleFilters}
                onMouseEnter={handleFilterHoverEnter}
                onMouseLeave={handleFilterHoverLeave}
                data-heatmap-filter-trigger
                title={withShortcutTitle(messages.filtersOpen, shortcutBindings.filters)}
                className={cn(
                  "mt-1.5 flex w-full min-w-0 flex-col items-stretch gap-0.5 border px-1.5 py-1.5 text-left transition-colors",
                  isEnglish && "mt-1 px-1.5 py-1",
                  activeFilterCount > 0
                    ? "border-brand/55 bg-brand/12 text-foreground"
                    : "border-border bg-muted/18 text-foreground hover:bg-muted"
                )}
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <ListFilter className="size-3.5 shrink-0" />
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate font-semibold",
                      isEnglish ? "text-[10.5px]" : "text-[12px]"
                    )}
                  >
                    {messages.filtersTitle}
                  </span>
                  {activeFilterCount > 0 ? (
                    <span className="inline-flex h-4 min-w-4 items-center justify-center bg-brand px-1 text-[10px] font-semibold tabular-nums text-brand-foreground">
                      {activeFilterCount}
                    </span>
                  ) : (
                    <span className="font-mono text-[10px] font-semibold text-muted-foreground">
                      {formatShortcutLabel(shortcutBindings.filters)}
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    "truncate text-muted-foreground",
                    isEnglish ? "text-[9px]" : "text-[10px]"
                  )}
                >
                  {activeFilterSummary || messages.filtersIdleHint}
                </span>
              </button>

              {marketOverview && (
                <div className={cn("mt-1.5 border border-border bg-muted/28 p-1.5", isEnglish && "mt-1 p-[5px]")}>
                  <div className={cn("grid grid-cols-3 gap-2", isEnglish && "gap-1.5")}>
                    <div className="flex min-w-0 flex-col items-center text-center">
                      <p
                        className={cn("tracking-[0.06em]", isEnglish ? "text-[10px]" : "text-[11px]")}
                        style={{ color: riseTextColor }}
                      >
                        {messages.legendRise}
                      </p>
                      <p
                        className={cn("mt-1 font-semibold tabular-nums", isEnglish ? "text-[13px]" : "text-base")}
                        style={{ color: riseTextColor }}
                      >
                        {formatCount(marketOverview.advanceCount, locale)}
                      </p>
                    </div>
                    <div className="flex min-w-0 flex-col items-center text-center">
                      <p
                        className={cn(
                          "tracking-[0.06em] text-muted-foreground",
                          isEnglish ? "text-[10px]" : "text-[11px]"
                        )}
                      >
                        {messages.legendFlat}
                      </p>
                      <p className={cn("mt-1 font-semibold tabular-nums text-foreground", isEnglish ? "text-[13px]" : "text-base")}>
                        {formatCount(marketOverview.flatCount, locale)}
                      </p>
                    </div>
                    <div className="flex min-w-0 flex-col items-center text-center">
                      <p
                        className={cn("tracking-[0.06em]", isEnglish ? "text-[10px]" : "text-[11px]")}
                        style={{ color: fallTextColor }}
                      >
                        {messages.legendFall}
                      </p>
                      <p
                        className={cn("mt-1 font-semibold tabular-nums", isEnglish ? "text-[13px]" : "text-base")}
                        style={{ color: fallTextColor }}
                      >
                        {formatCount(marketOverview.declineCount, locale)}
                      </p>
                    </div>
                  </div>

                  <div className={cn("mt-2 grid grid-cols-2 items-stretch gap-1.5 border-t border-border/70 pt-2", isEnglish && "mt-1.5 gap-1 pt-1.5")}>
                    <div className="flex min-w-0 flex-col">
                      <p
                        className={cn(
                          "leading-tight tracking-[0.04em] text-muted-foreground",
                          isEnglish ? "text-[9px]" : "text-[10px]"
                        )}
                      >
                        {messages.turnoverLabel}
                      </p>
                      <p
                        className={cn(
                          "mt-auto whitespace-nowrap pt-1 font-semibold tracking-[-0.01em] text-foreground",
                          isEnglish ? "text-[11.5px] sm:text-[12px]" : "text-[13px] sm:text-[14px]"
                        )}
                      >
                        {formatTurnoverAmount(marketOverview.turnoverAmount, locale)}
                      </p>
                    </div>
                    <div className="flex min-w-0 flex-col">
                      {(() => {
                        const turnoverTrend = getTurnoverTrend(marketOverview.turnoverDelta);
                        const turnoverTrendLabel =
                          turnoverTrend === "up"
                            ? messages.turnoverIncreaseLabel
                            : turnoverTrend === "down"
                              ? messages.turnoverDecreaseLabel
                              : messages.turnoverFlatLabel;
                        const turnoverTrendColor =
                          turnoverTrend === "up"
                            ? riseTextColor
                            : turnoverTrend === "down"
                              ? fallTextColor
                              : undefined;

                        return (
                          <>
                            {isEnglish ? (
                              <div className="space-y-0.5 text-[9px] leading-tight tracking-[0.04em] text-muted-foreground">
                                <span className="block">{messages.comparedToYesterdayLabel}</span>
                                <span
                                  className={cn(
                                    "block font-semibold",
                                    !turnoverTrendColor && "text-muted-foreground"
                                  )}
                                  style={turnoverTrendColor ? { color: turnoverTrendColor } : undefined}
                                >
                                  {turnoverTrendLabel}
                                </span>
                              </div>
                            ) : (
                              <p className="text-[10px] leading-tight tracking-[0.04em] text-muted-foreground">
                                {messages.comparedToYesterdayLabel}
                                <span
                                  className={cn(
                                    "ml-1 font-semibold",
                                    !turnoverTrendColor && "text-muted-foreground"
                                  )}
                                  style={turnoverTrendColor ? { color: turnoverTrendColor } : undefined}
                                >
                                  {turnoverTrendLabel}
                                </span>
                              </p>
                            )}
                            <p
                              className={cn(
                                "mt-auto whitespace-nowrap pt-1 font-semibold tracking-[-0.01em]",
                                isEnglish ? "text-[11.5px] sm:text-[12px]" : "text-[13px] sm:text-[14px]",
                                !turnoverTrendColor && "text-muted-foreground"
                              )}
                              style={turnoverTrendColor ? { color: turnoverTrendColor } : undefined}
                            >
                              {formatTurnoverAmount(Math.abs(marketOverview.turnoverDelta), locale)}
                            </p>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {treemapData?.source === "fallback" && (
                    <p
                      className={cn(
                        "mt-2.5 text-muted-foreground",
                        isEnglish ? "text-[10px] leading-[1.35]" : "text-[11px] leading-5"
                      )}
                    >
                      {messages.fallbackDataLabel}
                    </p>
                  )}
                </div>
              )}

            </div>

            <div className={cn("grid grid-cols-1 gap-1.5 border-t border-border p-1.5", isEnglish && "gap-1 p-[5px]")}>
              <Button
                variant="outline"
                size={isEnglish ? "xs" : "sm"}
                className={cn(
                  "justify-start rounded-none border-border bg-background/80 text-foreground hover:bg-muted",
                  isEnglish && "min-w-0 px-2 text-[10.5px]"
                )}
                onClick={createSharePreview}
                disabled={sharePending}
                title={withShortcutTitle(messages.shareImage, shortcutBindings.share)}
              >
                <Camera className={cn(isEnglish ? "mr-1.5 size-3.5" : "mr-2 size-4")} />
                {sharePending ? messages.generatingShareImage : messages.shareImage}
              </Button>
              <Button
                variant="outline"
                size={isEnglish ? "xs" : "sm"}
                className={cn(
                  "justify-start rounded-none border-border bg-background/80 text-foreground hover:bg-muted",
                  isEnglish && "min-w-0 px-2 text-[10.5px]"
                )}
                onClick={resetView}
                title={withShortcutTitle(messages.resetView, shortcutBindings.resetView)}
              >
                <RotateCcw className={cn(isEnglish ? "mr-1.5 size-3.5" : "mr-2 size-4")} />
                {messages.resetView}
              </Button>
              <Button
                variant="outline"
                size={isEnglish ? "xs" : "sm"}
                className={cn(
                  "justify-start rounded-none border-border bg-background/80 text-foreground hover:bg-muted",
                  isEnglish && "min-w-0 px-2 text-[10.5px]"
                )}
                onClick={toggleFullscreen}
                title={withShortcutTitle(messages.enterFullscreen, shortcutBindings.fullscreen)}
              >
                <Maximize2 className={cn(isEnglish ? "mr-1.5 size-3.5" : "mr-2 size-4")} />
                {messages.enterFullscreen}
              </Button>
              <Button
                variant="outline"
                size={isEnglish ? "xs" : "sm"}
                className={cn(
                  "justify-start rounded-none border-border bg-background/80 text-foreground hover:bg-muted",
                  isEnglish && "min-w-0 px-2 text-[10.5px]",
                  settingsOpen && settingsTab === "watchlist" && "border-brand/55 bg-brand/12"
                )}
                onClick={() => {
                  openWatchlistSettings();
                  if (isMobile) {
                    setSidebarOpen(false);
                  }
                }}
                title={messages.watchlistManage}
              >
                <Pencil className={cn(isEnglish ? "mr-1.5 size-3.5" : "mr-2 size-4")} />
                {messages.watchlistManage}
              </Button>
              <Button
                variant="outline"
                size={isEnglish ? "xs" : "sm"}
                className={cn(
                  "justify-start rounded-none border-border bg-background/80 text-foreground hover:bg-muted",
                  isEnglish && "min-w-0 px-2 text-[10.5px]"
                )}
                onClick={() => {
                  setFiltersOpen(false);
                  setSettingsOpen(true);
                }}
                title={withShortcutTitle(messages.settingsTitle, shortcutBindings.settings)}
              >
                <Settings2 className={cn(isEnglish ? "mr-1.5 size-3.5" : "mr-2 size-4")} />
                {messages.settingsTitle}
              </Button>
              <button
                type="button"
                onClick={() => setDesktopSidebarCollapsed(true)}
                aria-label={messages.collapseSidebar}
                title={withShortcutTitle(messages.collapseSidebar, shortcutBindings.sidebar)}
                className="hidden h-8 items-center justify-center border border-border bg-background/80 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:inline-flex"
              >
                <ChevronLeft className="size-4" />
              </button>
            </div>
            </div>
          </aside>
        )}

        <div
          className={cn(
            "relative min-h-0 overflow-hidden",
            isFullscreen ? "col-start-1 h-full" : "col-start-1 row-start-1 md:col-start-2"
          )}
          style={{ backgroundColor: heatmapCanvasTheme.chrome }}
        >
          <div
            ref={viewportRef}
            className="relative h-full min-h-0 overflow-hidden"
            style={{ backgroundColor: heatmapCanvasTheme.chrome }}
          >
            {isFullscreen && isMobile && (
              <button
                type="button"
                onClick={toggleFullscreen}
                className="absolute right-3 top-3 z-50 inline-flex size-10 items-center justify-center rounded-full border border-slate-500/70 bg-black/50 text-white shadow-[0_10px_24px_rgba(0,0,0,0.28)] backdrop-blur-sm transition-colors hover:bg-black/70"
                aria-label={messages.exitFullscreen}
              >
                <Minimize2 className="size-4" />
              </button>
            )}

            <canvas
              ref={canvasRef}
              role="img"
              aria-label={messages.canvasLabel}
              className="h-full w-full touch-none"
              style={{
                cursor: isPanning
                  ? "grabbing"
                  : view.scale > 1
                    ? "grab"
                    : (activeStock || hoveredBoardTitleName || (thumbnailMode && hoveredSubBoardName)) && !isMobile
                      ? "pointer"
                      : "default",
              }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseLeave}
              onClick={onCanvasClick}
              onDoubleClick={onDoubleClick}
            />

            {inspectorStyle && (
              <aside
                className={cn(
                  "pointer-events-none absolute z-30 overflow-hidden rounded-none border shadow-[0_22px_72px_rgba(0,0,0,0.36)] backdrop-blur-sm",
                  isLightMode
                    ? "border-slate-300/80 bg-white/96 text-slate-900"
                    : "border-slate-700/80 bg-[#0f1319]/96 text-slate-100"
                )}
                style={{
                  left: inspectorStyle.left,
                  top: inspectorStyle.top,
                  width: inspectorStyle.width,
                  minWidth: inspectorStyle.width,
                  maxHeight: inspectorStyle.maxHeight,
                }}
              >
                {activeInspectorStock && (
                  <>
                    <div
                      className="flex items-center gap-2 border-b border-black/15 px-3 py-1.5"
                      style={{
                        backgroundColor: getBoardHeaderColor(
                          activeHeatTheme,
                          activeInspectorStock.changePct,
                          priceColorMode,
                          displayMode
                        ),
                      }}
                      title={activeInspectorTitle ?? undefined}
                    >
                      <p className="min-w-0 shrink truncate text-[14px] font-semibold leading-none text-white [word-break:keep-all]">
                        {activeInspectorStock.name}
                      </p>
                      <InspectorHeaderSparkline
                        code={activeInspectorStock.code}
                        changePct={activeInspectorStock.changePct}
                        priceColorMode={priceColorMode}
                        className="h-8 w-[108px] shrink-0"
                      />
                      <div className="ml-auto flex min-w-0 shrink-0 items-baseline gap-2.5 tabular-nums">
                        <span className="text-[13px] font-semibold leading-none text-white">
                          {formatPrice(activeInspectorStock.price)}
                        </span>
                        <span className="text-[12px] font-medium leading-none text-white/75">
                          {formatTurnoverAmount(activeInspectorStock.marketCap, locale)}
                        </span>
                        <span
                          className="text-[13px] font-semibold leading-none"
                          style={{
                            color: getChangeTextColor(
                              activeHeatTheme,
                              activeInspectorStock.changePct,
                              priceColorMode,
                              displayMode,
                              "soft"
                            ),
                          }}
                        >
                          {formatChange(activeInspectorStock.changePct)}
                        </span>
                      </div>
                    </div>

                    <div
                      className={cn(
                        "flex justify-center px-3 py-2",
                        isLightMode ? "border-b border-slate-200 bg-[#f4f6f7]" : "border-b border-white/10 bg-[#0c1015]"
                      )}
                    >
                      <img
                        src={getDailyKlineUrl(activeInspectorStock.code)}
                        alt={`${activeInspectorStock.name} K-line`}
                        className="h-auto w-[88%] bg-white object-contain shadow-[0_2px_10px_rgba(15,23,42,0.10)] ring-1 ring-black/5"
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    <div className={cn("text-slate-900", isLightMode ? "bg-[#f4f6f7]" : "bg-[#0c1015] text-slate-200")}>
                      <div className={cn("space-y-1 border-b px-3 py-1.5", isLightMode ? "border-slate-300/70" : "border-white/10")}>
                        <div className="flex items-center justify-between gap-2 text-[11px] font-medium tracking-[0.08em] text-slate-500">
                          <span className="min-w-0 truncate">{activeInspectorTitle ?? activeBoardName}</span>
                          {inspectorSectorStats ? (
                            <div className="flex shrink-0 items-baseline gap-2 tabular-nums">
                              <span className={cn("text-[11px] font-semibold", isLightMode ? "text-slate-600" : "text-slate-300")}>
                                {formatBoardTrendCounts(
                                  messages,
                                  inspectorSectorStats.advanceCount,
                                  inspectorSectorStats.declineCount
                                )}
                              </span>
                              <span
                                className="text-[12px] font-semibold"
                                style={{
                                  color: getChangeTextColor(
                                    activeHeatTheme,
                                    inspectorSectorStats.changePct,
                                    priceColorMode,
                                    displayMode,
                                    "strong"
                                  ),
                                }}
                              >
                                {formatChange(inspectorSectorStats.changePct)}
                              </span>
                            </div>
                          ) : (
                            <div className="flex shrink-0 items-center gap-2 text-right">
                              <span className="text-[10px] font-medium tracking-[0.03em] text-slate-400">
                                {messages.inspectorScrollHint}
                              </span>
                              <span>{inspectorStocks.length}</span>
                            </div>
                          )}
                        </div>
                        <InspectorSortControls
                          sortKey={inspectorSortKey}
                          messages={messages}
                          tone={isLightMode ? "light" : "dark"}
                          showShortcutHint
                          watchlistHint={`${formatShortcutLabel(
                            shortcutBindings.toggleWatchlist
                          )} ${messages.inspectorWatchlistHint}`}
                          onChange={setInspectorSortKey}
                        />
                      </div>
                      <div
                        ref={inspectorListRef}
                        className="overflow-y-auto"
                        style={{ maxHeight: Math.max(140, inspectorStyle.maxHeight - 320) }}
                      >
                        {inspectorStocks.map((stock) => {
                          const isActive = stock.active;
                          const isWatchlisted = watchlistCodeSet.has(stock.code);

                          return (
                            <div
                              key={stock.code}
                              className={cn(
                                "grid grid-cols-[minmax(0,1fr)_56px_64px_80px] items-center gap-2 border-b px-3 py-1.5 text-[12.5px]",
                                isLightMode ? "border-b-slate-300/70" : "border-b-white/10",
                                isActive
                                  ? cn(
                                      "sticky top-0 z-10 bg-white font-semibold shadow-[0_1px_0_rgba(15,23,42,0.08)]",
                                      !isLightMode && "bg-[#161b22] text-slate-100"
                                    )
                                  : isLightMode
                                    ? "bg-[#f4f6f7]"
                                    : "bg-[#0c1015]"
                              )}
                            >
                              <div className="flex min-w-0 items-center gap-1">
                                <span
                                  className={cn(
                                    "min-w-0 font-medium leading-[1.2] [word-break:keep-all]",
                                    isActive && isLightMode && "font-semibold text-slate-900",
                                    isActive && !isLightMode && "font-semibold text-slate-100"
                                  )}
                                >
                                  {stock.name}
                                </span>
                                {isWatchlisted && (
                                  <Star
                                    aria-hidden
                                    className={cn(
                                      "size-3 shrink-0",
                                      isLightMode ? "text-amber-500" : "text-amber-400"
                                    )}
                                    fill="currentColor"
                                  />
                                )}
                              </div>
                              <img
                                src={getSparklineUrl(stock.code)}
                                alt=""
                                className="h-5 w-full object-contain"
                                loading="lazy"
                                decoding="async"
                                referrerPolicy="no-referrer"
                              />
                              <span
                                className={cn(
                                  "text-right text-[11.5px] font-medium tabular-nums",
                                  isLightMode ? "text-slate-700" : "text-slate-300"
                                )}
                              >
                                {formatPrice(stock.price)}
                              </span>
                              <span
                                className="text-right text-[11.5px] font-medium tabular-nums"
                                style={{
                                  color: getChangeTextColor(
                                    activeHeatTheme,
                                    stock.changePct,
                                    priceColorMode,
                                    displayMode,
                                    "strong"
                                  ),
                                }}
                              >
                                {formatChange(stock.changePct)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </aside>
            )}

            {loading && !samplePainted && <HeatmapLoadingOverlay displayMode={displayMode} messages={messages} />}

            {samplePainted && dataSource !== "direct" && !error && (
              <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium shadow-lg backdrop-blur-sm",
                    isLightMode
                      ? "border-slate-200 bg-white/85 text-slate-600"
                      : "border-slate-700/70 bg-[#0f1319]/80 text-slate-300"
                  )}
                >
                  <Loader2
                    className={cn("size-3 text-brand", quoteLoadProgress?.active && "animate-spin")}
                    aria-hidden
                  />
                  <span>{messages.loadingLiveData}</span>
                  {quoteLoadProgress && quoteLoadProgress.totalCount > 0 && (
                    <span className="tabular-nums text-muted-foreground">
                      {quoteLoadProgress.loadedCount.toLocaleString()} / {quoteLoadProgress.totalCount.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div
                className={cn(
                  "absolute inset-x-3 top-3 z-40 flex items-center justify-between gap-3 border px-3 py-2.5 text-sm shadow-lg backdrop-blur-md sm:left-4 sm:right-4 sm:top-4",
                  periodDataUnavailable &&
                    "inset-0 flex-col justify-center border-0 bg-background/95 text-center sm:inset-0",
                  isLightMode
                    ? "border-amber-200 bg-white/94 text-slate-800"
                    : "border-amber-400/30 bg-[#17130d]/92 text-slate-100",
                  periodDataUnavailable &&
                    (isLightMode ? "bg-white/95" : "bg-[#151a21]/95")
                )}
                role="alert"
              >
                <div className="min-w-0">
                  <p className="font-medium text-amber-700 dark:text-amber-300">
                    {periodDataUnavailable ? messages.periodDataUnavailable : error}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {periodDataUnavailable
                      ? messages.periodDataUnavailableHint
                      : messages.refreshDataHint}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 border-border bg-background/80 text-foreground hover:bg-muted"
                  onClick={retryDataLoad}
                  disabled={loading}
                >
                  <RotateCcw className={cn("size-3.5", loading && "animate-spin")} aria-hidden />
                  {loading ? messages.updating : messages.refreshData}
                </Button>
              </div>
            )}

            {!loading && !error && isWatchlist && watchlist.length === 0 && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/78 px-4 backdrop-blur-sm">
                <div className="max-w-sm border border-border bg-card/95 px-5 py-6 text-center shadow-[0_18px_48px_rgba(0,0,0,0.18)]">
                  <Star className="mx-auto size-6 text-muted-foreground" />
                  <h3 className="mt-3 text-sm font-semibold text-foreground">{messages.watchlistEmptyTitle}</h3>
                  <p className="mt-1.5 text-[12px] leading-5 text-muted-foreground">{messages.watchlistEmptyHint}</p>
                  <button
                    type="button"
                    onClick={openWatchlistSettings}
                    className="mt-4 inline-flex h-8 items-center justify-center gap-1.5 border border-brand/55 bg-brand/14 px-3 text-[12px] font-semibold text-foreground transition-colors hover:bg-brand/22"
                  >
                    <Plus className="size-3.5" />
                    {messages.watchlistAdd}
                  </button>
                </div>
              </div>
            )}

            {!loading && !error && visibleTreemapData && visibleTreemapData.stockCount === 0 && !(isWatchlist && watchlist.length === 0) && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/70 px-4 text-center text-sm text-muted-foreground backdrop-blur-sm">
                {messages.changeRangeEmpty}
              </div>
            )}
          </div>
        </div>

        {!isFullscreen && (
          <div
            className={cn(
              "relative col-span-1 row-start-2 border-t border-border px-3 py-1.5 sm:px-4 md:col-start-2",
              isLightMode ? "bg-white/88 backdrop-blur-sm" : "bg-[#151a21]"
            )}
          >
            {(loading || dataSource === "fallback" || quoteLoadProgress?.active) && !error && (
              <div className="hm-bottom-loader inset-x-0 top-0 h-[2px]" aria-hidden />
            )}
            <div className="flex items-center gap-1.5 sm:gap-3">
              <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
                {(!sidebarOpen || desktopSidebarCollapsed) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (isMobile) {
                        setSidebarOpen(true);
                        return;
                      }
                      setDesktopSidebarCollapsed(false);
                    }}
                    aria-label={messages.expandSidebar}
                    title={withShortcutTitle(messages.expandSidebar, shortcutBindings.sidebar)}
                    className={cn(
                      "inline-flex size-7 items-center justify-center bg-transparent transition-colors hover:text-brand focus-visible:text-brand",
                      !desktopSidebarCollapsed && "md:hidden",
                      desktopSidebarCollapsed && "md:inline-flex",
                      isLightMode
                        ? "text-muted-foreground hover:bg-muted focus-visible:bg-muted"
                        : "text-slate-400 hover:bg-white/5 focus-visible:bg-white/5"
                    )}
                  >
                    {isMobile ? <Menu className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setDisplayMode((current) => (current === "dark" ? "light" : "dark"))}
                  aria-label={isLightMode ? messages.darkMode : messages.lightMode}
                  title={isLightMode ? messages.darkMode : messages.lightMode}
                  className={cn(
                    "inline-flex size-7 shrink-0 items-center justify-center bg-transparent transition-colors hover:text-brand focus-visible:text-brand md:hidden",
                    isLightMode
                      ? "text-muted-foreground hover:bg-muted focus-visible:bg-muted"
                      : "text-slate-400 hover:bg-white/5 focus-visible:bg-white/5"
                  )}
                >
                  {isLightMode ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
                </button>
                <a
                  href={githubProjectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={messages.githubProject}
                  title={messages.githubProject}
                  className={cn(
                    "hidden min-w-0 shrink-0 items-center gap-1.5 text-[11px] font-normal tracking-tight transition-colors sm:text-[12px] md:inline-flex",
                    isLightMode
                      ? "text-muted-foreground/60 hover:text-muted-foreground"
                      : "text-slate-500/75 hover:text-slate-400"
                  )}
                >
                  <GitHubMark className="size-3.5 shrink-0 opacity-80" />
                  <span className="min-w-0 truncate">map.wenyuanw.me</span>
                </a>
              </div>

              <div className="flex min-w-0 flex-1 justify-center overflow-hidden px-0.5 sm:px-2">
                <div className="flex items-center gap-1 md:hidden">
                  <button
                    type="button"
                    onClick={toggleFilters}
                    aria-label={messages.filtersOpen}
                    aria-pressed={filtersOpen}
                    title={messages.filtersOpen}
                    className={cn(
                      "inline-flex size-7 items-center justify-center bg-transparent transition-colors hover:text-brand focus-visible:text-brand",
                      filtersOpen || activeFilterCount > 0
                        ? "text-brand hover:bg-brand/12 focus-visible:bg-brand/12"
                        : isLightMode
                          ? "text-muted-foreground hover:bg-muted focus-visible:bg-muted"
                          : "text-slate-400 hover:bg-white/5 focus-visible:bg-white/5"
                    )}
                  >
                    <ListFilter className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={resetView}
                    aria-label={messages.resetView}
                    title={messages.resetView}
                    className={cn(
                      "inline-flex size-7 items-center justify-center bg-transparent transition-colors hover:text-brand focus-visible:text-brand",
                      isLightMode
                        ? "text-muted-foreground hover:bg-muted focus-visible:bg-muted"
                        : "text-slate-400 hover:bg-white/5 focus-visible:bg-white/5"
                    )}
                  >
                    <RotateCcw className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    aria-label={messages.enterFullscreen}
                    title={messages.enterFullscreen}
                    className={cn(
                      "inline-flex size-7 items-center justify-center bg-transparent transition-colors hover:text-brand focus-visible:text-brand",
                      isLightMode
                        ? "text-muted-foreground hover:bg-muted focus-visible:bg-muted"
                        : "text-slate-400 hover:bg-white/5 focus-visible:bg-white/5"
                    )}
                  >
                    <Maximize2 className="size-3.5" />
                  </button>
                </div>

                <div className="hidden w-full min-w-0 max-w-52 items-center gap-1 sm:gap-1.5 md:flex md:max-w-56">
                  <TrendingDown
                    className="size-2.5 shrink-0 sm:size-3"
                    style={{ color: fallTextColor }}
                    aria-label={messages.legendFall}
                  />
                  <div className="relative min-w-0 flex-1 overflow-hidden">
                    <div
                      className="h-2.5 w-full rounded-full shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] sm:h-3.5"
                      style={{ background: legendGradient }}
                    />
                    <div
                      className="pointer-events-none absolute inset-0 flex items-center justify-between px-0.5 text-[7px] font-semibold tabular-nums leading-none text-white sm:px-1 sm:text-[8px] md:text-[9px]"
                      style={{ textShadow: "0 1px 2px rgba(0, 0, 0, 0.55)" }}
                    >
                      {legendTicks.map((tick) => (
                        <span key={tick}>{tick === 0 ? "0" : formatCompactChange(tick)}</span>
                      ))}
                    </div>
                  </div>
                  <TrendingUp
                    className="size-2.5 shrink-0 sm:size-3"
                    style={{ color: riseTextColor }}
                    aria-label={messages.legendRise}
                  />
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
                <a
                  href={githubProjectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={messages.githubProject}
                  title={messages.githubProject}
                  className={cn(
                    "inline-flex size-7 items-center justify-center bg-transparent transition-colors hover:text-brand focus-visible:text-brand md:hidden",
                    isLightMode
                      ? "text-muted-foreground hover:bg-muted focus-visible:bg-muted"
                      : "text-slate-400 hover:bg-white/5 focus-visible:bg-white/5"
                  )}
                >
                  <GitHubMark className="size-3.5 opacity-80" />
                </a>

                <div className="group relative hidden shrink-0 md:block">
                  <button
                    type="button"
                    aria-label={messages.operationTipsTitle}
                    onClick={() => {
                      setFiltersOpen(false);
                      setSettingsTab("help");
                      setSettingsOpen(true);
                    }}
                    className={cn(
                      "inline-flex size-7 items-center justify-center bg-transparent transition-colors hover:text-brand focus-visible:text-brand",
                      isLightMode
                        ? "text-muted-foreground hover:bg-muted focus-visible:bg-muted"
                        : "text-slate-400 hover:bg-white/5 focus-visible:bg-white/5"
                    )}
                  >
                    <Info className="size-3.5" />
                  </button>
                  <div
                    className={cn(
                      "pointer-events-none absolute bottom-full right-0 z-40 mb-2 w-64 border p-2 text-[11px] leading-5 opacity-0 shadow-[0_18px_48px_rgba(0,0,0,0.35)] backdrop-blur-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100",
                      isLightMode
                        ? "border-border bg-white/96 text-popover-foreground shadow-[0_12px_36px_rgba(15,23,42,0.12)]"
                        : "border-slate-700/90 bg-[#0f1319]/96 text-slate-300"
                    )}
                  >
                    <p>{areaTipMessage.replace(/^·\s*/, "")}</p>
                    <p>{messages.tipColor.replace(/^·\s*/, "")}</p>
                    <p>{messages.tipThumbnail.replace(/^·\s*/, "")}</p>
                    <p>{(isMobile ? messages.tipTap : messages.tipDoubleClick).replace(/^·\s*/, "")}</p>
                    <p>{(isMobile ? messages.tipPinch : messages.tipZoom).replace(/^·\s*/, "")}</p>
                    <p>{messages.tipDrag.replace(/^·\s*/, "")}</p>
                    {!isMobile && (
                      <>
                        <p>{messages.tipInspectorScroll.replace(/^·\s*/, "")}</p>
                        <p>{messages.tipInspectorSort.replace(/^·\s*/, "")}</p>
                      </>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setDisplayMode((current) => (current === "dark" ? "light" : "dark"))}
                  aria-label={isLightMode ? messages.darkMode : messages.lightMode}
                  title={withShortcutTitle(
                    isLightMode ? messages.darkMode : messages.lightMode,
                    shortcutBindings.displayMode
                  )}
                  className={cn(
                    "hidden size-7 shrink-0 items-center justify-center bg-transparent transition-colors hover:text-brand focus-visible:text-brand md:inline-flex",
                    isLightMode
                      ? "text-muted-foreground hover:bg-muted focus-visible:bg-muted"
                      : "text-slate-400 hover:bg-white/5 focus-visible:bg-white/5"
                  )}
                >
                  {isLightMode ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={() => setThumbnailMode((current) => !current)}
                  aria-label={messages.thumbnailModeLabel}
                  aria-pressed={thumbnailMode}
                  title={messages.thumbnailModeLabel}
                  className={cn(
                    "hidden size-7 shrink-0 items-center justify-center bg-transparent transition-colors hover:text-brand focus-visible:text-brand md:inline-flex",
                    thumbnailMode
                      ? "text-brand hover:bg-brand/12 focus-visible:bg-brand/12"
                      : isLightMode
                        ? "text-muted-foreground hover:bg-muted focus-visible:bg-muted"
                        : "text-slate-400 hover:bg-white/5 focus-visible:bg-white/5"
                  )}
                >
                  <LayoutGrid className="size-3.5" />
                </button>

                <button
                  type="button"
                  onClick={createSharePreview}
                  disabled={sharePending}
                  aria-label={sharePending ? messages.generatingShareImage : messages.shareToApps}
                  title={withShortcutTitle(messages.shareImage, shortcutBindings.share)}
                  className="inline-flex items-center gap-1 rounded-[14px] bg-brand px-1.5 py-1 text-[10px] font-semibold text-brand-foreground shadow-[0_2px_8px_color-mix(in_srgb,var(--brand)_38%,transparent)] transition-all hover:bg-brand/90 hover:shadow-[0_4px_12px_color-mix(in_srgb,var(--brand)_48%,transparent)] disabled:opacity-60 sm:px-2 sm:text-[11px]"
                >
                  <Share2 className="size-3" />
                  <span className="hidden sm:inline">
                    {sharePending ? messages.generatingShareImage : messages.shareToApps}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {isMobile && selectedBoardName && (
        <MobileStockSheet
          title={activeInspectorTitle ?? selectedBoardName}
          stock={activeInspectorStock}
          stocks={inspectorStocks}
          sectorStats={inspectorSectorStats}
          messages={messages}
          priceColorMode={priceColorMode}
          heatTheme={activeHeatTheme}
          displayMode={displayMode}
          sortKey={inspectorSortKey}
          isInWatchlist={Boolean(activeInspectorStock && watchlistCodes.includes(activeInspectorStock.code))}
          onSortChange={setInspectorSortKey}
          onClose={closeMobileSheet}
          onSelectStock={setSelectedStockCode}
          onToggleWatchlist={() => {
            if (activeInspectorStock) {
              toggleWatchlistItem(activeInspectorStock);
            }
          }}
          onOpenXueqiu={openXueqiuForStock}
        />
      )}

      <FilterPopover
        open={filtersOpen}
        isMobile={isMobile}
        closeLabel={messages.closeSheet}
        triggerRefs={filterTriggerRefs}
        layoutKey={`${sidebarOpen}:${desktopSidebarCollapsed}:${isFullscreen}:${isMobile}`}
        onClose={closeFilters}
        onMouseEnter={handleFilterHoverEnter}
        onMouseLeave={handleFilterHoverLeave}
      >
        <FilterPanel
          layout={isMobile ? "sheet" : "popover"}
          messages={messages}
          locale={locale}
          shortcutLabel={formatShortcutLabel(shortcutBindings.filters)}
          boards={boardFilterOptions}
          boardFilter={boardFilter}
          trendFilter={trendFilter}
          changeRangeFilter={changeRangeFilter}
          changeRangeMinInput={changeRangeMinInput}
          changeRangeMaxInput={changeRangeMaxInput}
          sizeMode={sizeMode}
          thumbnailMode={thumbnailMode}
          period={period}
          legendGradient={changeRangeSliderGradient}
          activeFilterCount={activeFilterCount}
          onClose={closeFilters}
          onToggleBoard={toggleBoardFilter}
          onClearBoardFilter={clearBoardFilter}
          onTrendFilterChange={setTrendFilter}
          onChangeRangeMinInputChange={setChangeRangeMinInput}
          onChangeRangeMaxInputChange={setChangeRangeMaxInput}
          onCommitChangeRange={commitChangeRangeInputs}
          onChangeRange={applyChangeRange}
          onClearChangeRange={() => applyChangeRange(emptyChangeRangeFilter)}
          onSizeModeChange={setSizeMode}
          onThumbnailModeChange={setThumbnailMode}
          onPeriodChange={setPeriod}
          onResetFilters={resetViewFilters}
        />
      </FilterPopover>

      <SettingsDrawer
        open={settingsOpen}
        tab={settingsTab}
        messages={messages}
        locale={locale}
        displayMode={displayMode}
        filterOpenMode={filterOpenMode}
        headerTrendStats={headerTrendStats}
        heatmapBorders={heatmapBorders}
        themeColor={themeColor}
        priceColorMode={priceColorMode}
        heatThemeId={heatThemeId}
        customHeatThemes={customHeatThemes}
        activeHeatTheme={activeHeatTheme}
        shortcutBindings={shortcutBindings}
        watchlist={watchlist}
        areaTipMessage={areaTipMessage}
        onClose={() => setSettingsOpen(false)}
        onTabChange={setSettingsTab}
        onLocaleChange={setLocale}
        onDisplayModeChange={setDisplayMode}
        onFilterOpenModeChange={setFilterOpenMode}
        onHeaderTrendStatsChange={setHeaderTrendStats}
        onHeatmapBordersChange={handleHeatmapBordersChange}
        refreshIntervalSeconds={refreshIntervalSeconds}
        onRefreshIntervalChange={setRefreshIntervalSeconds}
        onThemeColorChange={setThemeColor}
        onPriceColorModeChange={setPriceColorMode}
        onHeatThemeIdChange={setHeatThemeId}
        onCustomHeatThemesChange={setCustomHeatThemes}
        onShortcutBindingsChange={setShortcutBindings}
        onShortcutRecordingChange={setShortcutRecording}
        onWatchlistAdd={addWatchlistItem}
        onWatchlistRemove={removeWatchlistItem}
        onWatchlistClear={clearWatchlist}
        onWatchlistImportText={importWatchlistFromText}
      />

      {sharePreview && (
        <div className="absolute inset-0 z-[10020] flex items-center justify-center bg-black/72 p-2 backdrop-blur-sm sm:p-3">
          <div className="flex max-h-[min(96vh,100%)] w-full max-w-[min(96vw,90rem)] flex-col border border-border bg-card text-card-foreground shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <h3 className="text-base font-semibold">{messages.sharePreviewTitle}</h3>
              </div>
              <button
                type="button"
                onClick={closeSharePreview}
                className="inline-flex size-9 items-center justify-center border border-border bg-background/70 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label={messages.closePreview}
              >
                <X className="size-4" />
              </button>
            </div>

            <div className={cn("min-h-0 flex-1 overflow-auto p-3 sm:p-4", isLightMode ? "bg-muted/45" : "bg-[#0f1319]")}>
              <img
                src={sharePreview.url}
                alt={messages.sharePreviewTitle}
                className={cn(
                  "mx-auto h-auto max-h-[calc(96vh-9.5rem)] w-auto max-w-full object-contain border shadow-[0_18px_60px_rgba(0,0,0,0.32)]",
                  isLightMode ? "border-border bg-background" : "border-slate-700/80 bg-[#10141b]"
                )}
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-4 py-3">
              <Button
                variant="outline"
                className="rounded-none border-border bg-background/80 text-foreground hover:bg-muted"
                onClick={downloadSharePreview}
              >
                <Download className="mr-2 size-4" />
                {messages.downloadImage}
              </Button>
              <Button
                variant="outline"
                className="rounded-none border-border bg-background/80 text-foreground hover:bg-muted"
                onClick={copySharePreview}
              >
                <Copy className="mr-2 size-4" />
                {messages.copyImage}
              </Button>
              {canShareSystem && (
                <Button
                  className="rounded-none border-transparent bg-brand text-brand-foreground shadow-[0_2px_10px_color-mix(in_srgb,var(--brand)_38%,transparent)] hover:bg-brand/90"
                  onClick={shareSystemPreview}
                >
                  <Share2 className="mr-2 size-4" />
                  {messages.shareToApps}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
