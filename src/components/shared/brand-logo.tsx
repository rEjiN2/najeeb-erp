import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * The ALA Dates round logo (public/logo.png). The single place the logo
 * asset is referenced, so every screen shows the same mark.
 */
export function BrandLogo({
  size = 32,
  priority = false,
  className,
}: {
  /** Rendered width and height in px. */
  size?: number;
  priority?: boolean;
  className?: string;
}) {
  return (
    <Image
      src="/logo.png"
      alt="ALA Dates L.L.C"
      width={size}
      height={size}
      priority={priority}
      className={cn("shrink-0 rounded-full", className)}
    />
  );
}
