"use client";

import {
  CircleAlert,
  Loader2,
  Plus,
  RotateCw,
  ShieldX,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";

import { StatePanel } from "./state-panel";

export function RetryButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
    >
      {pending ? <Loader2 className="animate-spin" /> : <RotateCw />}
      Try again
    </Button>
  );
}

export type MasterLoadFailure = "forbidden" | "unavailable" | "error";

interface MasterLoadErrorProps {
  reason: MasterLoadFailure;
  /** Plural noun for the records, e.g. "locations". */
  subject: string;
  status?: number;
  /** Backend messages — shown for 4xx errors (e.g. an invalid filter). */
  messages?: string[];
}

/** Why a master list couldn't load. 401 never reaches here — the page
 * redirects to /login first. */
export function MasterLoadError({
  reason,
  subject,
  status,
  messages = [],
}: MasterLoadErrorProps) {
  if (reason === "forbidden") {
    return (
      <StatePanel icon={ShieldX} title="You don't have permission">
        Your account isn&apos;t allowed to view {subject}. Ask an administrator
        for access.
      </StatePanel>
    );
  }

  if (reason === "unavailable") {
    return (
      <StatePanel
        icon={WifiOff}
        title="Server unreachable"
        action={<RetryButton />}
      >
        Couldn&apos;t connect to the server to load {subject}. Check your
        connection and try again.
      </StatePanel>
    );
  }

  return (
    <StatePanel
      icon={CircleAlert}
      title={`Couldn't load ${subject}`}
      action={<RetryButton />}
    >
      {status && status < 500 && messages.length > 0
        ? messages.join(" ")
        : `The server returned an error${status ? ` (HTTP ${status})` : ""}. Try again in a moment.`}
    </StatePanel>
  );
}

interface MasterEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}

/** Nothing exists yet (as opposed to a search with no matches). */
export function MasterEmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: MasterEmptyStateProps) {
  return (
    <StatePanel
      icon={icon}
      title={title}
      action={
        <Button onClick={onAction}>
          <Plus /> {actionLabel}
        </Button>
      }
    >
      {description}
    </StatePanel>
  );
}

/** Placeholder for a master list while its data loads. */
export function MasterTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading" className="space-y-6">
      <div className="bg-muted h-10 w-full max-w-xs animate-pulse rounded-md" />
      <div className="overflow-hidden rounded-lg border">
        <div className="bg-muted/40 h-10 border-b" />
        {Array.from({ length: rows }, (_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b px-4 py-3 last:border-b-0"
          >
            <div
              className="bg-muted h-4 animate-pulse rounded"
              style={{
                width: `${30 - (i % 3) * 5}%`,
                marginLeft: `${(i % 3) * 1.25}rem`,
              }}
            />
            <div className="bg-muted h-4 w-20 animate-pulse rounded" />
            <div className="bg-muted ml-auto h-4 w-6 animate-pulse rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
