"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { type HeatmapMessages, type Locale } from "@/lib/i18n";
import { buildHeatThemeExport, builtinHeatThemes, cloneHeatTheme, createCustomHeatTheme, defaultHeatThemeId, heatStopFields, parseHeatThemeExport, previewGradientFromStops, rgbToHex, parseHexColor, type HeatStopField, type HeatTheme } from "@/lib/heatmap-themes";
import { type DisplayMode, type PriceColorMode } from "./types";

export function getHeatThemeDisplayName(theme: HeatTheme, locale: Locale, messages: HeatmapMessages) {
  if (theme.builtin) {
    if (theme.id === "soft") return messages.heatThemeSoft;
    if (theme.id === "classic") return messages.heatThemeClassic;
    if (theme.id === "muted") return messages.heatThemeMuted;
    if (theme.id === "high-contrast") return messages.heatThemeHighContrast;
  }
  return locale === "en" ? theme.nameEn : theme.nameZh;
}

export function getHeatStopLabel(messages: HeatmapMessages, field: HeatStopField) {
  if (field === "flat") return messages.heatStopFlat;
  if (field === "positiveSoft") return messages.heatStopPositiveSoft;
  if (field === "positiveStrong") return messages.heatStopPositiveStrong;
  if (field === "negativeSoft") return messages.heatStopNegativeSoft;
  return messages.heatStopNegativeStrong;
}

export function HeatThemeSettingsPanel({
  messages,
  locale,
  displayMode,
  priceColorMode,
  heatThemeId,
  customHeatThemes,
  activeHeatTheme,
  onHeatThemeIdChange,
  onCustomHeatThemesChange,
}: {
  messages: HeatmapMessages;
  locale: Locale;
  displayMode: DisplayMode;
  priceColorMode: PriceColorMode;
  heatThemeId: string;
  customHeatThemes: HeatTheme[];
  activeHeatTheme: HeatTheme;
  onHeatThemeIdChange: (id: string) => void;
  onCustomHeatThemesChange: (themes: HeatTheme[]) => void;
}) {
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [draftTheme, setDraftTheme] = useState<HeatTheme | null>(null);
  const [editMode, setEditMode] = useState<"dark" | "light">(displayMode);
  const availableThemes = useMemo(
    () => [...builtinHeatThemes, ...customHeatThemes],
    [customHeatThemes]
  );
  const isEditing = Boolean(draftTheme);
  const editingStops = draftTheme
    ? editMode === "light"
      ? draftTheme.light
      : draftTheme.dark
    : null;

  useEffect(() => {
    setEditMode(displayMode);
  }, [displayMode]);

  useEffect(() => {
    setDraftTheme(null);
  }, [heatThemeId]);

  const startEditExisting = () => {
    if (activeHeatTheme.builtin) {
      return;
    }
    setDraftTheme(cloneHeatTheme(activeHeatTheme));
    setEditMode(displayMode);
  };

  const startCreateCustom = () => {
    const next = createCustomHeatTheme(
      activeHeatTheme,
      locale === "zh" ? `自定义 ${customHeatThemes.length + 1}` : `Custom ${customHeatThemes.length + 1}`,
      `Custom ${customHeatThemes.length + 1}`
    );
    setDraftTheme(next);
    setEditMode(displayMode);
  };

  const updateDraft = (updater: (theme: HeatTheme) => HeatTheme) => {
    setDraftTheme((current) => (current ? updater(current) : current));
  };

  const handleSave = () => {
    if (!draftTheme) {
      return;
    }
    const exists = customHeatThemes.some((theme) => theme.id === draftTheme.id);
    onCustomHeatThemesChange(
      exists
        ? customHeatThemes.map((theme) => (theme.id === draftTheme.id ? draftTheme : theme))
        : [...customHeatThemes, draftTheme]
    );
    onHeatThemeIdChange(draftTheme.id);
    setDraftTheme(null);
    toast.success(messages.heatThemeSaved);
  };

  const handleCancel = () => {
    setDraftTheme(null);
  };

  const handleDeleteCustom = () => {
    if (activeHeatTheme.builtin || draftTheme) {
      return;
    }
    const remaining = customHeatThemes.filter((theme) => theme.id !== activeHeatTheme.id);
    onCustomHeatThemesChange(remaining);
    onHeatThemeIdChange(defaultHeatThemeId);
  };

  const handleExport = () => {
    try {
      const payload = buildHeatThemeExport(draftTheme ?? activeHeatTheme);
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${payload.theme.nameEn.replace(/\s+/g, "-").toLowerCase() || "heatmap-theme"}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(messages.heatThemeExportFailed);
    }
  };

  const handleImportFile = async (file: File | null) => {
    if (!file) {
      return;
    }
    try {
      const text = await file.text();
      const imported = parseHeatThemeExport(text);
      if (!imported) {
        toast.error(messages.heatThemeImportFailed);
        return;
      }
      setDraftTheme(imported);
      setEditMode(displayMode);
      toast.success(messages.heatThemeImportSuccess);
    } catch {
      toast.error(messages.heatThemeImportFailed);
    } finally {
      if (importInputRef.current) {
        importInputRef.current.value = "";
      }
    }
  };

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">{messages.heatThemeLabel}</h3>

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {availableThemes.map((theme) => {
          const active = !isEditing && heatThemeId === theme.id;
          const stops = displayMode === "light" ? theme.light : theme.dark;
          return (
            <button
              key={theme.id}
              type="button"
              disabled={isEditing}
              onClick={() => onHeatThemeIdChange(theme.id)}
              aria-pressed={active}
              className={cn(
                "border px-2.5 py-1.5 text-left transition-colors",
                active
                  ? "border-brand/70 bg-brand/15"
                  : "border-border bg-background/70 hover:bg-muted",
                isEditing && "cursor-not-allowed opacity-55"
              )}
            >
              <div className="flex items-center justify-between gap-1.5">
                <span className="truncate text-[12px] font-semibold text-foreground">
                  {getHeatThemeDisplayName(theme, locale, messages)}
                </span>
                {!theme.builtin && (
                  <span className="shrink-0 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                    {messages.heatThemeCustom}
                  </span>
                )}
              </div>
              <div
                className="mt-1.5 h-1.5 w-full border border-border/70"
                style={{
                  background: previewGradientFromStops(stops, priceColorMode === "red-rise"),
                }}
              />
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {!isEditing && (
          <>
            <button
              type="button"
              onClick={startCreateCustom}
              className="border border-border bg-background/70 px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {messages.heatThemeCreateCustom}
            </button>
            {!activeHeatTheme.builtin && (
              <button
                type="button"
                onClick={startEditExisting}
                className="border border-border bg-background/70 px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {messages.heatThemeEdit}
              </button>
            )}
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-1 border border-border bg-background/70 px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Download className="size-3" />
              {messages.heatThemeExport}
            </button>
            <button
              type="button"
              onClick={() => importInputRef.current?.click()}
              className="border border-border bg-background/70 px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {messages.heatThemeImport}
            </button>
            {!activeHeatTheme.builtin && (
              <button
                type="button"
                onClick={handleDeleteCustom}
                className="border border-border bg-background/70 px-2.5 py-1.5 text-[12px] font-medium text-destructive transition-colors hover:bg-muted"
              >
                {messages.heatThemeDeleteCustom}
              </button>
            )}
          </>
        )}
        <input
          ref={importInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => void handleImportFile(event.target.files?.[0] ?? null)}
        />
      </div>

      {draftTheme && editingStops && (
        <div className="space-y-2.5 border border-brand/40 bg-brand/5 p-2.5">
          <p className="text-[11px] leading-relaxed text-muted-foreground">{messages.heatThemeEditingHint}</p>

          <div className="grid gap-1.5 sm:grid-cols-2">
            <label className="space-y-1 text-[11px] text-muted-foreground">
              <span>{messages.heatThemeNameZh}</span>
              <input
                value={draftTheme.nameZh}
                onChange={(event) =>
                  updateDraft((theme) => ({ ...theme, nameZh: event.target.value }))
                }
                className="w-full border border-border bg-background px-2 py-1.5 text-[12px] text-foreground outline-none focus:border-brand/60"
              />
            </label>
            <label className="space-y-1 text-[11px] text-muted-foreground">
              <span>{messages.heatThemeNameEn}</span>
              <input
                value={draftTheme.nameEn}
                onChange={(event) =>
                  updateDraft((theme) => ({ ...theme, nameEn: event.target.value }))
                }
                className="w-full border border-border bg-background px-2 py-1.5 text-[12px] text-foreground outline-none focus:border-brand/60"
              />
            </label>
          </div>

          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setEditMode("dark")}
              className={cn(
                "border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                editMode === "dark"
                  ? "border-brand/70 bg-brand/15 text-foreground"
                  : "border-border text-muted-foreground hover:bg-muted"
              )}
            >
              {messages.heatThemeEditDark}
            </button>
            <button
              type="button"
              onClick={() => setEditMode("light")}
              className={cn(
                "border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                editMode === "light"
                  ? "border-brand/70 bg-brand/15 text-foreground"
                  : "border-border text-muted-foreground hover:bg-muted"
              )}
            >
              {messages.heatThemeEditLight}
            </button>
          </div>

          <div
            className="h-1.5 w-full border border-border/70"
            style={{
              background: previewGradientFromStops(editingStops, priceColorMode === "red-rise"),
            }}
          />

          <div className="space-y-1">
            {heatStopFields.map((field) => {
              const color = editingStops[field];
              const hex = rgbToHex(color);
              return (
                <label
                  key={field}
                  className="flex items-center justify-between gap-2 border border-border/80 bg-background/70 px-2 py-1"
                >
                  <span className="min-w-0 truncate text-[12px] text-muted-foreground">
                    {getHeatStopLabel(messages, field)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={hex}
                      onChange={(event) => {
                        const next = parseHexColor(event.target.value);
                        if (!next) {
                          return;
                        }
                        updateDraft((theme) => ({
                          ...theme,
                          [editMode]: {
                            ...theme[editMode],
                            [field]: next,
                          },
                        }));
                      }}
                      className="size-6 cursor-pointer border border-border bg-transparent p-0"
                    />
                    <input
                      value={hex}
                      onChange={(event) => {
                        const next = parseHexColor(event.target.value);
                        if (!next) {
                          return;
                        }
                        updateDraft((theme) => ({
                          ...theme,
                          [editMode]: {
                            ...theme[editMode],
                            [field]: next,
                          },
                        }));
                      }}
                      className="w-[6.5rem] border border-border bg-background px-1.5 py-1 font-mono text-[11px] text-foreground outline-none focus:border-brand/60"
                    />
                  </span>
                </label>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={handleSave}
              className="border border-brand/70 bg-brand/20 px-2.5 py-1.5 text-[12px] font-semibold text-foreground transition-colors hover:bg-brand/30"
            >
              {messages.heatThemeSave}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="border border-border bg-background/70 px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {messages.heatThemeCancel}
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-1 border border-border bg-background/70 px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Download className="size-3" />
              {messages.heatThemeExport}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

