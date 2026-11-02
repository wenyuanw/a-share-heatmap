"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pause, Play } from "lucide-react";

export function FeatureCarousel({ children, duplicate }: { children: ReactNode; duplicate: ReactNode }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLUListElement>(null);
  const interaction = useRef({ hover: false, focus: false, dragging: false, resumeAt: 0 });
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const viewport = viewportRef.current;
    const group = groupRef.current;
    if (!viewport || !group) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    observer.observe(viewport);
    let frame = 0;
    let previous = 0;
    let remainder = 0;

    const tick = (now: number) => {
      const elapsed = previous ? Math.min(now - previous, 64) : 0;
      previous = now;
      const state = interaction.current;
      if (visible && !document.hidden && !paused && !reducedMotion.matches &&
          !state.hover && !state.focus && !state.dragging && now >= state.resumeAt) {
        // Carry sub-pixel movement across frames; scrollLeft may round to whole pixels.
        remainder += elapsed * 0.035;
        const distance = Math.floor(remainder);
        remainder -= distance;
        if (distance > 0) {
          const loopWidth = group.offsetWidth;
          if (loopWidth > 0) viewport.scrollLeft = (viewport.scrollLeft + distance) % loopWidth;
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [paused]);

  const releasePointer = () => {
    interaction.current.dragging = false;
    interaction.current.resumeAt = performance.now() + 2500;
  };

  return (
    <div className="mt-8">
      <div
        ref={viewportRef}
        role="region"
        aria-label="功能卡片，可横向滚动查看"
        tabIndex={0}
        onPointerEnter={(event) => { if (event.pointerType === "mouse") interaction.current.hover = true; }}
        onPointerLeave={() => { interaction.current.hover = false; releasePointer(); }}
        onPointerDown={() => { interaction.current.dragging = true; }}
        onPointerUp={releasePointer}
        onPointerCancel={releasePointer}
        onWheel={() => { interaction.current.resumeAt = performance.now() + 2500; }}
        onFocusCapture={() => { interaction.current.focus = true; }}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) interaction.current.focus = false;
        }}
        className="overflow-x-auto overscroll-x-contain rounded-xl py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
      >
        <div className="flex w-max items-stretch">
          <ul ref={groupRef} className="flex shrink-0 items-stretch gap-4 pr-4">{children}</ul>
          <ul aria-hidden="true" className="flex shrink-0 items-stretch gap-4 pr-4 motion-reduce:hidden">{duplicate}</ul>
        </div>
      </div>
      <div className="mt-3 flex justify-end motion-reduce:hidden">
        <button
          type="button"
          onClick={() => setPaused((value) => !value)}
          aria-label={paused ? "继续自动滚动" : "暂停自动滚动"}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-brand"
        >
          {paused ? <Play className="size-3.5" aria-hidden /> : <Pause className="size-3.5" aria-hidden />}
          {paused ? "继续滚动" : "暂停滚动"}
        </button>
      </div>
    </div>
  );
}
