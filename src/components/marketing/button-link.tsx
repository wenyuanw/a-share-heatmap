import Link from "next/link";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const variantClasses = {
  primary:
    "bg-brand text-brand-foreground hover:-translate-y-px hover:bg-brand/90 shadow-[0_10px_28px_-14px_color-mix(in_srgb,var(--brand)_65%,transparent)]",
  outline: "border-border bg-background/60 text-foreground hover:bg-muted hover:border-border",
  ghost: "text-muted-foreground hover:text-foreground hover:bg-muted/60",
} as const;

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: keyof typeof variantClasses;
};

/** Anchor styled like the shared Button, for marketing page CTAs. */
export function ButtonLink({ variant = "primary", className, ...props }: ButtonLinkProps) {
  return (
    <Link
      className={cn(
        "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3.5 text-sm font-medium whitespace-nowrap transition-all outline-none select-none active:translate-y-px [&_svg]:pointer-events-none [&_svg]:size-4",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
