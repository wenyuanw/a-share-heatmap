import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PageHeroProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  /** Header text alignment; center suits standalone action pages. */
  align?: "left" | "center";
  /** Content column width: sm = max-w-3xl, md = max-w-4xl, lg = max-w-6xl. */
  size?: "sm" | "md" | "lg";
  /** Extra content rendered above the header, e.g. breadcrumbs. */
  children?: ReactNode;
};

const sizeClasses = {
  sm: "max-w-3xl",
  md: "max-w-4xl",
  lg: "max-w-6xl",
} as const;

/**
 * Decorated intro shared by content pages: dotted grid + glow backdrop,
 * eyebrow pill, title and lede — mirroring the features/sponsors heroes.
 */
export function PageHero({
  eyebrow,
  title,
  description,
  align = "left",
  size = "md",
  children,
}: PageHeroProps) {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="marketing-grid-bg absolute inset-0" />
      <div aria-hidden className="marketing-glow absolute inset-0" />
      <div
        className={cn(
          "relative mx-auto w-full px-4 pt-14 pb-10 sm:px-6 sm:pt-20 sm:pb-14",
          sizeClasses[size],
        )}
      >
        {children ? (
          <div className="marketing-fade-up mb-8">{children}</div>
        ) : null}
        <div className={cn(align === "center" && "flex flex-col items-center text-center")}>
          {eyebrow ? (
            <p className="marketing-fade-up inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/60 px-3.5 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
              <span className="hero-dot size-1.5 rounded-full bg-brand" aria-hidden />
              {eyebrow}
            </p>
          ) : null}
          <h1
            className="marketing-fade-up mt-5 text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
            style={{ animationDelay: "80ms" }}
          >
            {title}
          </h1>
          {description ? (
            <p
              className="marketing-fade-up mt-4 max-w-2xl text-base leading-relaxed text-balance text-muted-foreground sm:text-lg"
              style={{ animationDelay: "160ms" }}
            >
              {description}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
