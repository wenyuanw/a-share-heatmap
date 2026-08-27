export const shortcutActionIds = [
  "share",
  "resetView",
  "fullscreen",
  "settings",
  "sidebar",
  "displayMode",
  "filters",
  "toggleWatchlist",
] as const;

export type ShortcutActionId = (typeof shortcutActionIds)[number];

export type ShortcutBindings = Record<ShortcutActionId, string>;

export const defaultShortcutBindings: ShortcutBindings = {
  share: "c",
  resetView: "r",
  fullscreen: "f",
  settings: ",",
  sidebar: "b",
  displayMode: "d",
  filters: "l",
  toggleWatchlist: "w",
};

export const shortcutStorageKey = "heatmap-shortcuts";

const allowedSingleKeyPattern = /^[a-z0-9,]$/;

export function normalizeShortcutKey(raw: string): string | null {
  if (raw.length !== 1) {
    return null;
  }

  const key = raw.toLowerCase();
  if (!allowedSingleKeyPattern.test(key)) {
    return null;
  }

  return key;
}

export function formatShortcutKey(event: KeyboardEvent): string | null {
  if (event.altKey || event.ctrlKey || event.metaKey) {
    return null;
  }

  if (event.key === "Escape" || event.key === "Esc") {
    return null;
  }

  return normalizeShortcutKey(event.key);
}

export function formatShortcutLabel(binding: string): string {
  if (!binding) {
    return "";
  }

  if (binding === ",") {
    return ",";
  }

  return binding.toUpperCase();
}

export function findConflict(
  bindings: ShortcutBindings,
  action: ShortcutActionId,
  nextKey: string
): ShortcutActionId | null {
  const normalized = normalizeShortcutKey(nextKey);
  if (!normalized) {
    return null;
  }

  for (const id of shortcutActionIds) {
    if (id === action) {
      continue;
    }

    if (bindings[id] === normalized) {
      return id;
    }
  }

  return null;
}

export function resolveShortcutAction(
  bindings: ShortcutBindings,
  event: KeyboardEvent
): ShortcutActionId | null {
  const key = formatShortcutKey(event);
  if (!key) {
    return null;
  }

  for (const id of shortcutActionIds) {
    if (bindings[id] === key) {
      return id;
    }
  }

  return null;
}

function pickFallbackKey(used: Set<string>): string {
  for (const fallback of "abcdefghijklmnopqruvwxyz0123456789,") {
    if (!used.has(fallback)) {
      return fallback;
    }
  }
  return "z";
}

export function parseStoredShortcuts(raw: string | null): ShortcutBindings {
  if (!raw) {
    return { ...defaultShortcutBindings };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<Record<string, unknown>>;
    const next: ShortcutBindings = { ...defaultShortcutBindings };

    for (const id of shortcutActionIds) {
      const value = parsed[id];
      if (typeof value !== "string") {
        continue;
      }
      const normalized = normalizeShortcutKey(value);
      if (normalized) {
        next[id] = normalized;
      }
    }

    const seen = new Set<string>();
    for (const id of shortcutActionIds) {
      let key = next[id];
      if (seen.has(key)) {
        const preferred = defaultShortcutBindings[id];
        key = !seen.has(preferred) ? preferred : pickFallbackKey(seen);
        next[id] = key;
      }
      seen.add(key);
    }

    return next;
  } catch {
    return { ...defaultShortcutBindings };
  }
}

export function serializeShortcuts(bindings: ShortcutBindings): string {
  return JSON.stringify(bindings);
}

export function withReboundShortcut(
  bindings: ShortcutBindings,
  action: ShortcutActionId,
  nextKey: string
): { bindings: ShortcutBindings; conflict: ShortcutActionId | null; invalid: boolean } {
  const normalized = normalizeShortcutKey(nextKey);
  if (!normalized) {
    return { bindings, conflict: null, invalid: true };
  }

  if (bindings[action] === normalized) {
    return { bindings, conflict: null, invalid: false };
  }

  const conflict = findConflict(bindings, action, normalized);
  if (conflict) {
    return { bindings, conflict, invalid: false };
  }

  return {
    bindings: { ...bindings, [action]: normalized },
    conflict: null,
    invalid: false,
  };
}
