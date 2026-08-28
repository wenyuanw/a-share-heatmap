"use client";

import { useEffect, useRef } from "react";

import {
  createHeatmapWebMcpTools,
  type HeatmapWebMcpStateRef,
} from "@/lib/heatmap-webmcp";
import type { HeatTheme } from "@/lib/heatmap-themes";

type UseHeatmapWebMcpOptions = {
  enabled: boolean;
  heatThemeId: string;
  customHeatThemes: HeatTheme[];
  onHeatThemeIdChange: (id: string) => void;
  onCustomHeatThemesChange: (themes: HeatTheme[]) => void;
};

export function useHeatmapWebMcp({
  enabled,
  heatThemeId,
  customHeatThemes,
  onHeatThemeIdChange,
  onCustomHeatThemesChange,
}: UseHeatmapWebMcpOptions) {
  const stateRef = useRef<HeatmapWebMcpStateRef["current"]>({
    heatThemeId,
    customHeatThemes,
  });

  useEffect(() => {
    stateRef.current = {
      heatThemeId,
      customHeatThemes,
    };
  }, [customHeatThemes, heatThemeId]);

  useEffect(() => {
    if (!enabled || typeof document === "undefined" || !document.modelContext) {
      return;
    }

    const modelContext = document.modelContext;
    const controller = new AbortController();
    const [listThemesTool, setThemeTool] = createHeatmapWebMcpTools(stateRef, {
      selectTheme: (theme) => {
        stateRef.current.heatThemeId = theme.id;
        onHeatThemeIdChange(theme.id);
      },
      createTheme: (theme) => {
        const nextCustomThemes = [...stateRef.current.customHeatThemes, theme];
        stateRef.current.customHeatThemes = nextCustomThemes;
        stateRef.current.heatThemeId = theme.id;
        onCustomHeatThemesChange(nextCustomThemes);
        onHeatThemeIdChange(theme.id);
      },
    });

    void Promise.all([
      modelContext.registerTool(listThemesTool, { signal: controller.signal }),
      modelContext.registerTool(setThemeTool, { signal: controller.signal }),
    ]).catch((error: unknown) => {
      if (!controller.signal.aborted) {
        console.warn("Unable to register WebMCP heatmap tools", error);
      }
    });

    return () => controller.abort();
  }, [enabled, onCustomHeatThemesChange, onHeatThemeIdChange]);
}
