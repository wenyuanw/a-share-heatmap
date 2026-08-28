export type HeatRgb = { r: number; g: number; b: number };

export type HeatStops = {
  flat: HeatRgb;
  positiveSoft: HeatRgb;
  positiveStrong: HeatRgb;
  negativeSoft: HeatRgb;
  negativeStrong: HeatRgb;
};

export type HeatTheme = {
  id: string;
  nameZh: string;
  nameEn: string;
  builtin: boolean;
  dark: HeatStops;
  light: HeatStops;
};

export type HeatThemePrimaryColors = {
  positive: HeatRgb;
  negative: HeatRgb;
  flat: HeatRgb;
};

export type HeatThemeExportPayload = {
  version: 1;
  type: "a-share-heatmap-theme";
  exportedAt: string;
  theme: Omit<HeatTheme, "builtin">;
};

export const heatThemeStorageKey = "heatmap-heat-theme-id";
export const customHeatThemesStorageKey = "heatmap-heat-themes-custom";
export const heatThemesSeedStorageKey = "heatmap-heat-themes-seeded-v1";

const rgb = (r: number, g: number, b: number): HeatRgb => ({ r, g, b });

export const builtinHeatThemes: HeatTheme[] = [
  {
    id: "classic",
    nameZh: "经典",
    nameEn: "Classic",
    builtin: true,
    dark: {
      flat: rgb(72, 79, 92),
      positiveSoft: rgb(140, 72, 76),
      positiveStrong: rgb(255, 30, 34),
      negativeSoft: rgb(40, 126, 76),
      negativeStrong: rgb(26, 214, 66),
    },
    light: {
      flat: rgb(120, 132, 148),
      positiveSoft: rgb(190, 78, 82),
      positiveStrong: rgb(245, 42, 48),
      negativeSoft: rgb(42, 148, 98),
      negativeStrong: rgb(30, 220, 80),
    },
  },
  {
    id: "soft",
    nameZh: "柔和",
    nameEn: "Soft",
    builtin: true,
    dark: {
      flat: rgb(78, 86, 98),
      positiveSoft: rgb(148, 78, 82),
      positiveStrong: rgb(234, 44, 48),
      negativeSoft: rgb(48, 128, 92),
      negativeStrong: rgb(36, 190, 154),
    },
    light: {
      flat: rgb(148, 156, 168),
      positiveSoft: rgb(188, 118, 116),
      positiveStrong: rgb(216, 84, 88),
      negativeSoft: rgb(78, 142, 128),
      negativeStrong: rgb(60, 180, 112),
    },
  },
  {
    id: "muted",
    nameZh: "低饱和",
    nameEn: "Muted",
    builtin: true,
    dark: {
      flat: rgb(84, 90, 100),
      positiveSoft: rgb(138, 96, 98),
      positiveStrong: rgb(188, 92, 96),
      negativeSoft: rgb(72, 118, 108),
      negativeStrong: rgb(68, 148, 128),
    },
    light: {
      flat: rgb(156, 160, 168),
      positiveSoft: rgb(186, 142, 140),
      positiveStrong: rgb(196, 118, 114),
      negativeSoft: rgb(124, 152, 146),
      negativeStrong: rgb(96, 154, 136),
    },
  },
  {
    id: "high-contrast",
    nameZh: "高对比",
    nameEn: "High Contrast",
    builtin: true,
    dark: {
      flat: rgb(64, 70, 82),
      positiveSoft: rgb(160, 48, 52),
      positiveStrong: rgb(255, 56, 48),
      negativeSoft: rgb(24, 140, 96),
      negativeStrong: rgb(16, 220, 140),
    },
    light: {
      flat: rgb(140, 148, 160),
      positiveSoft: rgb(210, 88, 84),
      positiveStrong: rgb(228, 48, 42),
      negativeSoft: rgb(48, 156, 118),
      negativeStrong: rgb(20, 168, 108),
    },
  },
];

/** Fun starter themes: installed once, deletable like custom themes. */
export const seedHeatThemes: HeatTheme[] = [
  {
    id: "seed-sunset",
    nameZh: "日落",
    nameEn: "Sunset",
    builtin: false,
    dark: {
      flat: rgb(78, 74, 88),
      positiveSoft: rgb(168, 86, 72),
      positiveStrong: rgb(242, 112, 54),
      negativeSoft: rgb(72, 78, 148),
      negativeStrong: rgb(92, 108, 220),
    },
    light: {
      flat: rgb(156, 148, 160),
      positiveSoft: rgb(210, 118, 88),
      positiveStrong: rgb(228, 96, 52),
      negativeSoft: rgb(108, 118, 178),
      negativeStrong: rgb(86, 98, 198),
    },
  },
  {
    id: "seed-aurora",
    nameZh: "极光",
    nameEn: "Aurora",
    builtin: false,
    dark: {
      flat: rgb(70, 82, 96),
      positiveSoft: rgb(156, 72, 132),
      positiveStrong: rgb(232, 64, 168),
      negativeSoft: rgb(32, 132, 138),
      negativeStrong: rgb(28, 206, 186),
    },
    light: {
      flat: rgb(148, 156, 168),
      positiveSoft: rgb(188, 102, 156),
      positiveStrong: rgb(208, 72, 148),
      negativeSoft: rgb(48, 148, 152),
      negativeStrong: rgb(24, 168, 158),
    },
  },
  {
    id: "seed-ink",
    nameZh: "水墨",
    nameEn: "Ink Wash",
    builtin: false,
    dark: {
      flat: rgb(90, 90, 92),
      positiveSoft: rgb(132, 78, 72),
      positiveStrong: rgb(176, 68, 58),
      negativeSoft: rgb(68, 102, 98),
      negativeStrong: rgb(58, 138, 118),
    },
    light: {
      flat: rgb(168, 166, 162),
      positiveSoft: rgb(176, 120, 110),
      positiveStrong: rgb(168, 92, 82),
      negativeSoft: rgb(112, 140, 132),
      negativeStrong: rgb(78, 132, 116),
    },
  },
];

export const defaultHeatThemeId = "classic";

export function getBuiltinHeatTheme(id: string): HeatTheme | undefined {
  return builtinHeatThemes.find((theme) => theme.id === id);
}

export function resolveHeatTheme(id: string, customThemes: HeatTheme[]): HeatTheme {
  return (
    customThemes.find((theme) => theme.id === id) ??
    getBuiltinHeatTheme(id) ??
    getBuiltinHeatTheme(defaultHeatThemeId)!
  );
}

export function clampByte(value: number) {
  return Math.min(255, Math.max(0, Math.round(value)));
}

export function parseHexColor(raw: string): HeatRgb | null {
  const text = raw.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(text)) {
    return null;
  }
  return {
    r: Number.parseInt(text.slice(0, 2), 16),
    g: Number.parseInt(text.slice(2, 4), 16),
    b: Number.parseInt(text.slice(4, 6), 16),
  };
}

export function rgbToHex({ r, g, b }: HeatRgb) {
  const toHex = (value: number) => clampByte(value).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function formatRgbCss(color: HeatRgb) {
  return `rgb(${clampByte(color.r)}, ${clampByte(color.g)}, ${clampByte(color.b)})`;
}

function mixRgb(from: HeatRgb, to: HeatRgb, t: number): HeatRgb {
  const amount = Math.min(1, Math.max(0, t));
  return {
    r: from.r + (to.r - from.r) * amount,
    g: from.g + (to.g - from.g) * amount,
    b: from.b + (to.b - from.b) * amount,
  };
}

function darkenRgb(color: HeatRgb, amount: number): HeatRgb {
  const factor = 1 - Math.min(1, Math.max(0, amount));
  return {
    r: color.r * factor,
    g: color.g * factor,
    b: color.b * factor,
  };
}

function isHeatRgb(value: unknown): value is HeatRgb {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as HeatRgb;
  return (
    typeof candidate.r === "number" &&
    typeof candidate.g === "number" &&
    typeof candidate.b === "number" &&
    Number.isFinite(candidate.r) &&
    Number.isFinite(candidate.g) &&
    Number.isFinite(candidate.b)
  );
}

function isHeatStops(value: unknown): value is HeatStops {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as HeatStops;
  return (
    isHeatRgb(candidate.flat) &&
    isHeatRgb(candidate.positiveSoft) &&
    isHeatRgb(candidate.positiveStrong) &&
    isHeatRgb(candidate.negativeSoft) &&
    isHeatRgb(candidate.negativeStrong)
  );
}

export function normalizeHeatStops(stops: HeatStops): HeatStops {
  const normalize = (color: HeatRgb): HeatRgb => ({
    r: clampByte(color.r),
    g: clampByte(color.g),
    b: clampByte(color.b),
  });
  return {
    flat: normalize(stops.flat),
    positiveSoft: normalize(stops.positiveSoft),
    positiveStrong: normalize(stops.positiveStrong),
    negativeSoft: normalize(stops.negativeSoft),
    negativeStrong: normalize(stops.negativeStrong),
  };
}

export function createCustomHeatTheme(base: HeatTheme, nameZh: string, nameEn: string): HeatTheme {
  return {
    id: `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    nameZh,
    nameEn,
    builtin: false,
    dark: normalizeHeatStops(base.dark),
    light: normalizeHeatStops(base.light),
  };
}

export function createHeatThemeFromPrimaryColors(
  colors: HeatThemePrimaryColors,
  nameZh: string,
  nameEn: string
): HeatTheme {
  const stops = normalizeHeatStops({
    flat: colors.flat,
    positiveSoft: mixRgb(colors.flat, colors.positive, 0.45),
    positiveStrong: colors.positive,
    negativeSoft: mixRgb(colors.flat, colors.negative, 0.45),
    negativeStrong: colors.negative,
  });

  return {
    id: `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    nameZh,
    nameEn,
    builtin: false,
    dark: stops,
    light: normalizeHeatStops(stops),
  };
}

export function cloneHeatTheme(theme: HeatTheme): HeatTheme {
  return {
    ...theme,
    dark: normalizeHeatStops(theme.dark),
    light: normalizeHeatStops(theme.light),
  };
}

export function parseHeatTheme(value: unknown): HeatTheme | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const candidate = value as Partial<HeatTheme>;
  if (typeof candidate.id !== "string" || !candidate.id) {
    return null;
  }
  if (typeof candidate.nameZh !== "string" || typeof candidate.nameEn !== "string") {
    return null;
  }
  if (!isHeatStops(candidate.dark) || !isHeatStops(candidate.light)) {
    return null;
  }
  return {
    id: candidate.id,
    nameZh: candidate.nameZh,
    nameEn: candidate.nameEn,
    builtin: false,
    dark: normalizeHeatStops(candidate.dark),
    light: normalizeHeatStops(candidate.light),
  };
}

export function parseStoredCustomHeatThemes(raw: string | null): HeatTheme[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map(parseHeatTheme).filter((theme): theme is HeatTheme => Boolean(theme));
  } catch {
    return [];
  }
}

export function mergeSeedHeatThemes(existing: HeatTheme[]): HeatTheme[] {
  const existingIds = new Set(existing.map((theme) => theme.id));
  const missing = seedHeatThemes
    .filter((theme) => !existingIds.has(theme.id))
    .map((theme) => cloneHeatTheme(theme));
  return missing.length === 0 ? existing : [...missing, ...existing];
}

export function serializeCustomHeatThemes(themes: HeatTheme[]) {
  return JSON.stringify(themes.filter((theme) => !theme.builtin).map(cloneHeatTheme));
}

export function buildHeatThemeExport(theme: HeatTheme): HeatThemeExportPayload {
  return {
    version: 1,
    type: "a-share-heatmap-theme",
    exportedAt: new Date().toISOString(),
    theme: {
      id: theme.id.startsWith("custom-") ? theme.id : `custom-${theme.id}`,
      nameZh: theme.nameZh,
      nameEn: theme.nameEn,
      dark: normalizeHeatStops(theme.dark),
      light: normalizeHeatStops(theme.light),
    },
  };
}

export function parseHeatThemeExport(raw: string): HeatTheme | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    const payload = parsed as Partial<HeatThemeExportPayload> & { theme?: unknown };
    if (payload.type === "a-share-heatmap-theme" && payload.theme) {
      const theme = parseHeatTheme(payload.theme);
      if (!theme) {
        return null;
      }
      return {
        ...theme,
        id: theme.id.startsWith("custom-")
          ? `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
          : `custom-${Date.now().toString(36)}`,
        builtin: false,
      };
    }
    return parseHeatTheme(parsed);
  } catch {
    return null;
  }
}

export function heatColorFromTheme(
  theme: HeatTheme,
  changePct: number,
  redMeansRise: boolean,
  displayMode: "dark" | "light"
) {
  const stops = displayMode === "light" ? theme.light : theme.dark;
  const amplitude = Math.min(1, Math.max(0, Math.abs(changePct) / 10));
  const strength = Math.pow(amplitude, 0.82);

  if (Math.abs(changePct) < 0.1) {
    return formatRgbCss(stops.flat);
  }

  const isRise = changePct > 0;
  const usePositive = redMeansRise ? isRise : !isRise;
  const soft = usePositive ? stops.positiveSoft : stops.negativeSoft;
  const strong = usePositive ? stops.positiveStrong : stops.negativeStrong;
  return formatRgbCss(mixRgb(soft, strong, strength));
}

export function boardHeaderColorFromTheme(
  theme: HeatTheme,
  changePct: number,
  redMeansRise: boolean,
  displayMode: "dark" | "light"
) {
  const stops = displayMode === "light" ? theme.light : theme.dark;
  const amplitude = Math.min(1, Math.max(0, Math.abs(changePct) / 10));
  const strength = Math.pow(amplitude, 0.82);

  if (Math.abs(changePct) < 0.1) {
    return formatRgbCss(darkenRgb(stops.flat, displayMode === "light" ? 0.18 : 0.12));
  }

  const isRise = changePct > 0;
  const usePositive = redMeansRise ? isRise : !isRise;
  const soft = usePositive ? stops.positiveSoft : stops.negativeSoft;
  const strong = usePositive ? stops.positiveStrong : stops.negativeStrong;
  return formatRgbCss(darkenRgb(mixRgb(soft, strong, strength), displayMode === "light" ? 0.12 : 0.08));
}

export function legendGradientFromTheme(
  theme: HeatTheme,
  redMeansRise: boolean,
  displayMode: "dark" | "light",
  steps: readonly number[]
) {
  return `linear-gradient(to right, ${steps
    .map((step, index) => {
      const position = (index / (steps.length - 1)) * 100;
      return `${heatColorFromTheme(theme, step, redMeansRise, displayMode)} ${position.toFixed(2)}%`;
    })
    .join(", ")})`;
}

export function previewGradientFromStops(stops: HeatStops, redMeansRise: boolean) {
  const left = redMeansRise ? stops.negativeStrong : stops.positiveStrong;
  const mid = stops.flat;
  const right = redMeansRise ? stops.positiveStrong : stops.negativeStrong;
  return `linear-gradient(to right, ${formatRgbCss(left)}, ${formatRgbCss(mid)}, ${formatRgbCss(right)})`;
}

export function uiPolarityColor(
  theme: HeatTheme,
  direction: "rise" | "fall" | "flat",
  redMeansRise: boolean,
  displayMode: "dark" | "light",
  tone: "normal" | "soft" | "strong" = "normal"
) {
  const stops = displayMode === "light" ? theme.light : theme.dark;
  if (direction === "flat") {
    return formatRgbCss(stops.flat);
  }

  const wantPositive = direction === "rise" ? redMeansRise : !redMeansRise;
  const soft = wantPositive ? stops.positiveSoft : stops.negativeSoft;
  const strong = wantPositive ? stops.positiveStrong : stops.negativeStrong;

  if (tone === "strong") {
    return formatRgbCss(strong);
  }
  if (tone === "soft") {
    return formatRgbCss(mixRgb(strong, { r: 255, g: 255, b: 255 }, displayMode === "light" ? 0.18 : 0.32));
  }
  return formatRgbCss(mixRgb(soft, strong, 0.62));
}

export function uiChangeTextColor(
  theme: HeatTheme,
  changePct: number,
  redMeansRise: boolean,
  displayMode: "dark" | "light",
  tone: "normal" | "soft" | "strong" = "normal"
) {
  if (Math.abs(changePct) < 0.1) {
    return uiPolarityColor(theme, "flat", redMeansRise, displayMode, tone);
  }
  return uiPolarityColor(theme, changePct > 0 ? "rise" : "fall", redMeansRise, displayMode, tone);
}

export const heatStopFields = [
  "flat",
  "positiveSoft",
  "positiveStrong",
  "negativeSoft",
  "negativeStrong",
] as const;

export type HeatStopField = (typeof heatStopFields)[number];
