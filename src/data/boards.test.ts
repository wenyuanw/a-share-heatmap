import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { boardScopes, getBoardNameBySlug } from "./boards";

type SubboardEntry = { sectorName: string; subBoardName: string };

const subboardsSnapshot = JSON.parse(
  readFileSync(new URL("../lib/data/market-heatmap-subboards.json", import.meta.url), "utf8"),
) as { subboards: Record<string, SubboardEntry> };

/**
 * A slug→name mismatch would make the ?sector= deep link silently fail
 * (the heatmap sanitizer drops unknown board names), so keep the mapping
 * verifiable against the data snapshot.
 */
describe("boardScopes", () => {
  it("has unique slugs", () => {
    const slugs = boardScopes.map((board) => board.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("maps every slug to a real sector name from the subboards snapshot", () => {
    const sectorNames = new Set(
      Object.values(subboardsSnapshot.subboards).map((entry) => entry.sectorName),
    );
    for (const board of boardScopes) {
      expect(sectorNames.has(board.name), `板块「${board.name}」不在 subboards.json 中`).toBe(true);
    }
  });

  it("resolves slugs back to board names", () => {
    for (const board of boardScopes) {
      expect(getBoardNameBySlug(board.slug)).toBe(board.name);
    }
    expect(getBoardNameBySlug("does-not-exist")).toBeUndefined();
  });
});
