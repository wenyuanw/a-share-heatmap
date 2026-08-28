import {
  builtinHeatThemes,
  createHeatThemeFromPrimaryColors,
  parseHexColor,
  rgbToHex,
} from "@/lib/heatmap-themes";
import type { HeatmapWebMcpContext } from "@/lib/heatmap-webmcp-types";

function getAvailableThemes(context: HeatmapWebMcpContext) {
  return [...builtinHeatThemes, ...context.stateRef.current.customHeatThemes];
}

function getThemeSummary(context: HeatmapWebMcpContext) {
  return getAvailableThemes(context).map((theme) => ({
    id: theme.id,
    nameZh: theme.nameZh,
    nameEn: theme.nameEn,
    builtin: theme.builtin,
  }));
}

export function createHeatmapThemeWebMcpTools(context: HeatmapWebMcpContext): WebMcpToolDefinition[] {
  const listThemesTool: WebMcpToolDefinition = {
    name: "list_heatmap_themes",
    title: "List heatmap color themes",
    description:
      "List all built-in and saved custom color themes available for the stock heatmap, including their IDs and names.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: true,
      untrustedContentHint: false,
    },
    execute: async () => ({
      activeThemeId: context.stateRef.current.heatThemeId,
      themes: getThemeSummary(context),
    }),
  };

  const setThemeTool: WebMcpToolDefinition = {
    name: "set_heatmap_theme",
    title: "Set heatmap color theme",
    description:
      "Apply an existing heatmap theme by themeId, or create and apply a custom theme from positiveColor, negativeColor, and flatColor. Colors must be six-digit hexadecimal values with an optional leading #.",
    inputSchema: {
      type: "object",
      oneOf: [
        {
          type: "object",
          properties: {
            themeId: {
              type: "string",
              description:
                "Existing built-in or saved custom theme ID. Call list_heatmap_themes first to discover custom IDs.",
            },
          },
          required: ["themeId"],
          additionalProperties: false,
        },
        {
          type: "object",
          properties: {
            positiveColor: {
              type: "string",
              pattern: "^#?[0-9a-fA-F]{6}$",
              description: "Color for positive price changes, such as #ef4444.",
            },
            negativeColor: {
              type: "string",
              pattern: "^#?[0-9a-fA-F]{6}$",
              description: "Color for negative price changes, such as #22c55e.",
            },
            flatColor: {
              type: "string",
              pattern: "^#?[0-9a-fA-F]{6}$",
              description: "Color for near-zero price changes, such as #64748b.",
            },
          },
          required: ["positiveColor", "negativeColor", "flatColor"],
          additionalProperties: false,
        },
      ],
    },
    annotations: {
      readOnlyHint: false,
      untrustedContentHint: false,
    },
    execute: async (input) => {
      const hasThemeId = Object.prototype.hasOwnProperty.call(input, "themeId");
      const colorKeys = ["positiveColor", "negativeColor", "flatColor"] as const;
      const hasColorInput = colorKeys.some((key) => Object.prototype.hasOwnProperty.call(input, key));

      if (hasThemeId) {
        if (hasColorInput || typeof input.themeId !== "string" || !input.themeId.trim()) {
          throw new Error("Provide either a non-empty themeId or all three color values, not both.");
        }

        const requestedId = input.themeId.trim();
        const theme = getAvailableThemes(context).find((candidate) => candidate.id === requestedId);
        if (!theme) {
          const availableIds = getAvailableThemes(context)
            .map((candidate) => candidate.id)
            .join(", ");
          throw new Error(`Unknown themeId "${requestedId}". Available theme IDs: ${availableIds}.`);
        }

        context.actionsRef.current.selectTheme(theme);
        return {
          success: true,
          action: "selected",
          themeId: theme.id,
          nameZh: theme.nameZh,
          nameEn: theme.nameEn,
        };
      }

      if (!hasColorInput) {
        throw new Error("Provide themeId, or positiveColor, negativeColor, and flatColor.");
      }

      const rawColors = colorKeys.map((key) => input[key]);
      if (rawColors.some((value) => typeof value !== "string")) {
        throw new Error("positiveColor, negativeColor, and flatColor must all be six-digit hexadecimal strings.");
      }

      const parsedColors = rawColors.map((value) => parseHexColor(value as string));
      if (parsedColors.some((value) => value === null)) {
        throw new Error("Each color must be a six-digit hexadecimal value such as #ef4444.");
      }

      const customThemeNumber = context.stateRef.current.customHeatThemes.length + 1;
      const theme = createHeatThemeFromPrimaryColors(
        {
          positive: parsedColors[0]!,
          negative: parsedColors[1]!,
          flat: parsedColors[2]!,
        },
        `AI 自定义 ${customThemeNumber}`,
        `AI Custom ${customThemeNumber}`
      );
      context.actionsRef.current.createTheme(theme);

      return {
        success: true,
        action: "created",
        themeId: theme.id,
        nameZh: theme.nameZh,
        nameEn: theme.nameEn,
        colors: {
          positiveColor: rgbToHex(theme.dark.positiveStrong),
          negativeColor: rgbToHex(theme.dark.negativeStrong),
          flatColor: rgbToHex(theme.dark.flat),
        },
      };
    },
  };

  return [listThemesTool, setThemeTool];
}
