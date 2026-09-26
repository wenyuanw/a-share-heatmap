import type { Bounds } from "./types";

export function getCanvasViewportBounds(
  width: number,
  height: number,
  view: { x: number; y: number; scale: number },
  margin = 4
): Bounds {
  return {
    x: -view.x / view.scale - margin,
    y: -view.y / view.scale - margin,
    width: width / view.scale + margin * 2,
    height: height / view.scale + margin * 2,
  };
}

export function intersectsBounds(rect: Bounds, viewport: Bounds): boolean {
  return (
    rect.x <= viewport.x + viewport.width &&
    rect.x + rect.width >= viewport.x &&
    rect.y <= viewport.y + viewport.height &&
    rect.y + rect.height >= viewport.y
  );
}
