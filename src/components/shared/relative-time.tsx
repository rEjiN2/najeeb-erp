"use client";

import { useSyncExternalStore } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDayUae, formatExactUae, formatRelative } from "@/lib/datetime";
import { cn } from "@/lib/utils";

const MINUTE = 60_000;

// One shared minute tick for every timestamp on the page. The snapshot only
// changes once a minute, so it stays referentially stable between renders.
function subscribe(onTick: () => void) {
  const timer = setInterval(onTick, MINUTE);
  return () => clearInterval(timer);
}
const currentMinute = () => Math.floor(Date.now() / MINUTE) * MINUTE;
// The server can't know the viewer's "now"; it renders the plain day and the
// client swaps in the relative text after hydration.
const serverMinute = () => null;

interface RelativeTimeProps {
  value: string;
  className?: string;
}

/** "5 minutes ago", with the exact UAE time on hover. */
export function RelativeTime({ value, className }: RelativeTimeProps) {
  const now = useSyncExternalStore(subscribe, currentMinute, serverMinute);
  const exact = formatExactUae(value);

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <time
            dateTime={value}
            aria-label={exact}
            className={cn("cursor-default whitespace-nowrap", className)}
          />
        }
      >
        {now === null ? formatDayUae(value) : formatRelative(value, now)}
      </TooltipTrigger>
      <TooltipContent>{exact}</TooltipContent>
    </Tooltip>
  );
}
