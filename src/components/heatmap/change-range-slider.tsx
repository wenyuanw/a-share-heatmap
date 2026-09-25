"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { changeRangeSliderMax, changeRangeSliderMin, changeRangeSliderTicks } from "./constants";
import { filterToSliderBounds, formatChangeRangeBound, snapChangeRangeValue } from "./filters";
import { type ChangeRangeFilter } from "./types";

export function ChangeRangeSlider({
  value,
  gradient,
  minAriaLabel,
  maxAriaLabel,
  onChange,
}: {
  value: ChangeRangeFilter;
  gradient: string;
  minAriaLabel: string;
  maxAriaLabel: string;
  onChange: (range: ChangeRangeFilter) => void;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragThumbRef = useRef<"min" | "max" | null>(null);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);

  // Sync refs from props in a passive effect — writing them during render is unsafe.
  useEffect(() => {
    valueRef.current = value;
    onChangeRef.current = onChange;
  });

  const bounds = filterToSliderBounds(value);
  const span = changeRangeSliderMax - changeRangeSliderMin;
  const minPercent = ((bounds.min - changeRangeSliderMin) / span) * 100;
  const maxPercent = ((bounds.max - changeRangeSliderMin) / span) * 100;

  const valueFromClientX = (clientX: number) => {
    const track = trackRef.current;
    if (!track) {
      return changeRangeSliderMin;
    }

    const rect = track.getBoundingClientRect();
    if (rect.width <= 0) {
      return changeRangeSliderMin;
    }

    const ratio = (clientX - rect.left) / rect.width;
    return snapChangeRangeValue(changeRangeSliderMin + ratio * span);
  };

  const applyThumb = (thumb: "min" | "max", clientX: number) => {
    const nextValue = valueFromClientX(clientX);
    const currentValue = valueRef.current;
    const current = {
      min: currentValue.min ?? changeRangeSliderMin,
      max: currentValue.max ?? changeRangeSliderMax,
    };

    if (thumb === "min") {
      onChangeRef.current({ min: Math.min(nextValue, current.max), max: current.max });
      return;
    }

    onChangeRef.current({ min: current.min, max: Math.max(nextValue, current.min) });
  };

  const pickThumb = (clientX: number): "min" | "max" => {
    const nextValue = valueFromClientX(clientX);
    return Math.abs(nextValue - bounds.min) <= Math.abs(nextValue - bounds.max) ? "min" : "max";
  };

  return (
    <div className="space-y-1.5">
      <div
        ref={trackRef}
        className="relative h-7 cursor-pointer touch-none select-none"
        onPointerDown={(event) => {
          if (event.button !== 0) {
            return;
          }
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          const thumb = pickThumb(event.clientX);
          dragThumbRef.current = thumb;
          applyThumb(thumb, event.clientX);
        }}
        onPointerMove={(event) => {
          if (!dragThumbRef.current) {
            return;
          }
          applyThumb(dragThumbRef.current, event.clientX);
        }}
        onPointerUp={() => {
          dragThumbRef.current = null;
        }}
        onPointerCancel={() => {
          dragThumbRef.current = null;
        }}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2"
          style={{ background: gradient }}
        />
        <div
          className="pointer-events-none absolute top-1/2 h-1.5 -translate-y-1/2 bg-background/75"
          style={{ left: 0, width: `${minPercent}%` }}
        />
        <div
          className="pointer-events-none absolute top-1/2 h-1.5 -translate-y-1/2 bg-background/75"
          style={{ left: `${maxPercent}%`, right: 0 }}
        />
        <button
          type="button"
          aria-label={minAriaLabel}
          aria-valuemin={changeRangeSliderMin}
          aria-valuemax={bounds.max}
          aria-valuenow={bounds.min}
          role="slider"
          tabIndex={0}
          className="pointer-events-none absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 border-2 border-foreground bg-card shadow-[0_1px_4px_rgba(0,0,0,0.28)]"
          style={{ left: `${minPercent}%` }}
        />
        <button
          type="button"
          aria-label={maxAriaLabel}
          aria-valuemin={bounds.min}
          aria-valuemax={changeRangeSliderMax}
          aria-valuenow={bounds.max}
          role="slider"
          tabIndex={0}
          className="pointer-events-none absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 border-2 border-foreground bg-card shadow-[0_1px_4px_rgba(0,0,0,0.28)]"
          style={{ left: `${maxPercent}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] font-medium tabular-nums text-muted-foreground">
        {changeRangeSliderTicks.map((tick) => (
          <span key={tick} className={cn(tick === 0 && "text-foreground")}>
            {formatChangeRangeBound(tick)}
          </span>
        ))}
      </div>
    </div>
  );
}

