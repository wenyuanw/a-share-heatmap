import { CopyButton } from "@/components/marketing/copy-button";
import { cn } from "@/lib/utils";

type CodeBlockProps = {
  code: string;
  /** Language/tool chip shown in the header bar, e.g. "HTML" / "终端". */
  label?: string;
  className?: string;
};

/**
 * Framed code block with a label bar and copy action. The inner <pre> keeps
 * the .mdx-content typography but sheds its standalone chrome via globals.css.
 */
export function CodeBlock({ code, label = "代码", className }: CodeBlockProps) {
  return (
    <figure className={cn("code-block overflow-hidden rounded-xl border border-border/70 bg-card/60", className)}>
      <figcaption className="flex items-center justify-between gap-2 border-b border-border/60 bg-background/50 py-1.5 pr-1.5 pl-3.5 backdrop-blur">
        <span className="font-mono text-xs tracking-wide text-muted-foreground uppercase">{label}</span>
        <CopyButton text={code} label={`复制${label}代码`} />
      </figcaption>
      <pre>
        <code>{code}</code>
      </pre>
    </figure>
  );
}
