"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Delay in ms before the transition starts, useful for staggering. */
  delay?: number;
};

/**
 * Enhances server-rendered content with an entrance animation. Without JS
 * (or when reduced motion is enabled), content remains visible.
 */
export function Reveal({ children, className, delay }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (typeof IntersectionObserver === "undefined" ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    element.classList.add("reveal-pending");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0, rootMargin: "0px 0px -48px 0px" },
    );

    observer.observe(element);
    return () => {
      observer.disconnect();
      element.classList.remove("reveal-pending");
    };
  }, []);

  const style: CSSProperties | undefined = delay ? { transitionDelay: `${delay}ms` } : undefined;

  return (
    <div ref={ref} className={cn("reveal", className)} style={style}>
      {children}
    </div>
  );
}
