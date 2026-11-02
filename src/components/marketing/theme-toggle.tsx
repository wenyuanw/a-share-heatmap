"use client";

import { Moon, Sun } from "lucide-react";

const DISPLAY_MODE_STORAGE_KEY = "heatmap-display-mode";

export function ThemeToggle() {
  const toggle = () => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    document.documentElement.style.colorScheme = next ? "dark" : "light";
    try {
      window.localStorage.setItem(DISPLAY_MODE_STORAGE_KEY, next ? "dark" : "light");
    } catch {
      /* Preferences are optional. */
    }
  };

  return (
    <button
      type="button"
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background/60 text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      onClick={toggle}
    >
      {/* Follow the root theme immediately, including before hydration. */}
      <span className="hidden items-center dark:inline-flex">
        <Sun className="size-4" aria-hidden="true" />
        <span className="sr-only">切换到亮色模式</span>
      </span>
      <span className="inline-flex items-center dark:hidden">
        <Moon className="size-4" aria-hidden="true" />
        <span className="sr-only">切换到暗色模式</span>
      </span>
    </button>
  );
}
