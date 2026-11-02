import { cn } from "@/lib/utils";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
};

/** Shared intro block for content pages: eyebrow, h1, lede. */
export function PageHeader({ eyebrow, title, description, className }: PageHeaderProps) {
  return (
    <div className={cn("marketing-fade-up", className)}>
      {eyebrow ? (
        <p className="text-sm font-medium text-brand">{eyebrow}</p>
      ) : null}
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        {title}
      </h1>
      {description ? (
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
}
