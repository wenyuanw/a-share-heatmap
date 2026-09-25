import {
  allBoardsValue,
  allTrendsValue,
  changeRangeSliderMax,
  changeRangeSliderMin,
  changeRangeSliderStep,
  defaultRefreshIntervalSeconds,
  emptyChangeRangeFilter,
  maxRefreshIntervalSeconds,
  minRefreshIntervalSeconds,
} from "./constants";
import type { ChangeRangeFilter } from "./types";

export function parseHeatmapBordersQuery(value: string | null) {
  if (value === null) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (["on", "show", "true", "1"].includes(normalized)) {
    return true;
  }
  if (["off", "hide", "false", "0"].includes(normalized)) {
    return false;
  }
  return null;
}

export function normalizeRefreshIntervalSeconds(raw: string | null): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(parsed)) {
    return defaultRefreshIntervalSeconds;
  }
  return Math.min(maxRefreshIntervalSeconds, Math.max(minRefreshIntervalSeconds, parsed));
}

export function parseStoredBoardFilter(raw: string | null): string[] {
  if (!raw || raw === allBoardsValue) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item): item is string => typeof item === "string" && item.length > 0 && item !== allBoardsValue
      );
    }
    if (typeof parsed === "string" && parsed.length > 0 && parsed !== allBoardsValue) {
      return [parsed];
    }
  } catch {
    /* Legacy single-board names are stored as plain strings. */
  }

  return [raw];
}

export function boardFiltersEqual(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((name, index) => name === right[index]);
}

export function sanitizeBoardFilter(selected: string[], availableNames: string[]) {
  const available = new Set(availableNames);
  return selected.filter((name) => available.has(name));
}

export function toggleBoardInFilter(current: string[], boardName: string) {
  if (current.length === 0) {
    return [boardName];
  }

  if (current.includes(boardName)) {
    return current.filter((name) => name !== boardName);
  }

  return [...current, boardName];
}

export function changeRangeFiltersEqual(left: ChangeRangeFilter, right: ChangeRangeFilter) {
  return left.min === right.min && left.max === right.max;
}

export function isChangeRangeActive(range: ChangeRangeFilter) {
  return range.min !== null || range.max !== null;
}

export function formatChangeRangeSummary(range: ChangeRangeFilter) {
  if (range.min !== null && range.max !== null) {
    return `${range.min}% ~ ${range.max}%`;
  }

  if (range.min !== null) {
    return `≥${range.min}%`;
  }

  if (range.max !== null) {
    return `≤${range.max}%`;
  }

  return "";
}

export function countActiveViewFilters(
  boardFilter: string[],
  trendFilter: string,
  changeRangeFilter: ChangeRangeFilter
) {
  return (
    (boardFilter.length > 0 ? 1 : 0) +
    (trendFilter !== allTrendsValue ? 1 : 0) +
    (isChangeRangeActive(changeRangeFilter) ? 1 : 0)
  );
}

export function formatChangeRangeInput(value: number | null) {
  return value === null ? "" : String(value);
}

export function parseChangeRangeInput(raw: string, fallback: number | null) {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeChangeRangeFilter(range: ChangeRangeFilter): ChangeRangeFilter {
  if (range.min !== null && range.max !== null && range.min > range.max) {
    return { min: range.max, max: range.min };
  }

  return range;
}

export function parseStoredChangeRangeFilter(raw: string | null): ChangeRangeFilter {
  if (!raw) {
    return emptyChangeRangeFilter;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return emptyChangeRangeFilter;
    }

    const record = parsed as { min?: unknown; max?: unknown };
    const min = typeof record.min === "number" && Number.isFinite(record.min) ? record.min : null;
    const max = typeof record.max === "number" && Number.isFinite(record.max) ? record.max : null;
    return normalizeChangeRangeFilter({ min, max });
  } catch {
    return emptyChangeRangeFilter;
  }
}

export function snapChangeRangeValue(value: number) {
  const snapped = Math.round(value / changeRangeSliderStep) * changeRangeSliderStep;
  return Math.min(changeRangeSliderMax, Math.max(changeRangeSliderMin, snapped));
}

export function filterToSliderBounds(range: ChangeRangeFilter) {
  return {
    min: range.min === null ? changeRangeSliderMin : snapChangeRangeValue(range.min),
    max: range.max === null ? changeRangeSliderMax : snapChangeRangeValue(range.max),
  };
}

export function formatChangeRangeBound(value: number) {
  if (value > 0) {
    return `+${value}%`;
  }

  return `${value}%`;
}

export function matchesChangeRange(changePct: number, range: ChangeRangeFilter) {
  if (range.min !== null && changePct < range.min) {
    return false;
  }

  if (range.max !== null && changePct > range.max) {
    return false;
  }

  return true;
}
