import {
  boardHeaderColorFromTheme,
  heatColorFromTheme,
  legendGradientFromTheme,
  uiChangeTextColor,
  uiPolarityColor,
  type HeatTheme,
} from "@/lib/heatmap-themes";

import { colorLegendSteps } from "./constants";
import type { DisplayMode, PriceColorMode } from "./types";

export function getHeatColor(
  theme: HeatTheme,
  changePct: number | null,
  colorMode: PriceColorMode,
  displayMode: DisplayMode = "dark"
) {
  return heatColorFromTheme(theme, changePct ?? 0, colorMode === "red-rise", displayMode);
}

export function getLegendGradient(theme: HeatTheme, colorMode: PriceColorMode, displayMode: DisplayMode = "dark") {
  return legendGradientFromTheme(theme, colorMode === "red-rise", displayMode, colorLegendSteps);
}

export function getBoardHeaderColor(
  theme: HeatTheme,
  changePct: number | null,
  colorMode: PriceColorMode,
  displayMode: DisplayMode = "dark"
) {
  return boardHeaderColorFromTheme(theme, changePct ?? 0, colorMode === "red-rise", displayMode);
}

export function getChangeTextColor(
  theme: HeatTheme,
  changePct: number | null,
  colorMode: PriceColorMode,
  displayMode: DisplayMode,
  tone: "normal" | "soft" | "strong" = "normal"
) {
  return uiChangeTextColor(theme, changePct ?? 0, colorMode === "red-rise", displayMode, tone);
}

export function getRiseTextColor(theme: HeatTheme, colorMode: PriceColorMode, displayMode: DisplayMode) {
  return uiPolarityColor(theme, "rise", colorMode === "red-rise", displayMode, "normal");
}

export function getFallTextColor(theme: HeatTheme, colorMode: PriceColorMode, displayMode: DisplayMode) {
  return uiPolarityColor(theme, "fall", colorMode === "red-rise", displayMode, "normal");
}
