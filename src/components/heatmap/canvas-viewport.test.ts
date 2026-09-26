import { describe, expect, it } from "vitest";
import { getCanvasViewportBounds, intersectsBounds } from "./canvas-viewport";

describe("canvas viewport culling", () => {
  it("maps a zoomed and panned viewport back to world coordinates", () => {
    expect(getCanvasViewportBounds(800, 600, { x: -400, y: -200, scale: 2 }, 0))
      .toEqual({ x: 200, y: 100, width: 400, height: 300 });
  });

  it("keeps rectangles that contain the viewport or cross its edges", () => {
    const viewport = getCanvasViewportBounds(800, 600, { x: -400, y: -200, scale: 2 }, 0);
    for (const rect of [
      { x: 0, y: 0, width: 1000, height: 1000 },
      { x: 180, y: 180, width: 40, height: 40 },
      { x: 580, y: 180, width: 40, height: 40 },
      { x: 300, y: 80, width: 40, height: 40 },
      { x: 300, y: 380, width: 40, height: 40 },
    ]) expect(intersectsBounds(rect, viewport)).toBe(true);
  });

  it("rejects rectangles outside each side of the viewport", () => {
    const viewport = getCanvasViewportBounds(800, 600, { x: -400, y: -200, scale: 2 }, 0);
    for (const rect of [
      { x: 100, y: 180, width: 40, height: 40 },
      { x: 620, y: 180, width: 40, height: 40 },
      { x: 300, y: 40, width: 40, height: 40 },
      { x: 300, y: 420, width: 40, height: 40 },
    ]) expect(intersectsBounds(rect, viewport)).toBe(false);
  });

  it("retains off-screen selection strokes within the drawing margin", () => {
    const viewport = getCanvasViewportBounds(800, 600, { x: 0, y: 0, scale: 4 });
    expect(intersectsBounds({ x: 202, y: 20, width: 10, height: 10 }, viewport)).toBe(true);
    expect(intersectsBounds({ x: 205, y: 20, width: 10, height: 10 }, viewport)).toBe(false);
  });
});
