import Image from "next/image";

import { cn } from "@/lib/utils";

/** The project's official icon mark, shared by header, footer and signatures. */
export function SiteMark({
  className,
  size = 24,
  priority,
}: {
  className?: string;
  size?: number;
  priority?: boolean;
}) {
  return (
    <Image
      src="/icon.svg"
      alt=""
      width={size}
      height={size}
      priority={priority}
      className={cn("rounded-md", className)}
    />
  );
}
