"use client";

import {
  ArrowRight,
  Ban,
  CircleAlert,
  FilePlus2,
  History,
  Loader2,
  MessageSquare,
  Pencil,
  Printer,
  RotateCw,
  ShieldX,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { RelativeTime } from "@/components/shared/relative-time";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { describeFailure, type ApiFailure } from "@/lib/api-types";
import { browserApi } from "@/lib/browser-api";
import { formatCalendarDate } from "@/lib/datetime";
import { cn } from "@/lib/utils";

import {
  COMMENT_MAX_LENGTH,
  type ActivityItem,
  type ActivityTimeline,
  type AuditActivityItem,
  type AuditAction,
  type AuditChange,
  type CommentActivityItem,
  type CommentView,
} from "./types";

interface ActivityPanelProps {
  /** Backend entity type, e.g. "cash-receipt". */
  entityType: string;
  entityId: string;
  /** What the record is called in sentences — "receipt" → "created this receipt". */
  subjectLabel?: string;
  /** After a comment is saved — e.g. so a list can refresh its comment count. */
  onCommentAdded?: (comment: CommentView) => void;
  className?: string;
}

type LoadState =
  | { key: string; status: "ready"; timeline: ActivityTimeline }
  | { key: string; status: "failed"; failure: ApiFailure };

const ACTION_META: Record<
  AuditAction,
  { verb: string; icon: LucideIcon; tone: string }
> = {
  created: {
    verb: "created",
    icon: FilePlus2,
    tone: "bg-success/10 text-success",
  },
  updated: { verb: "edited", icon: Pencil, tone: "bg-primary/10 text-primary" },
  cancelled: {
    verb: "cancelled",
    icon: Ban,
    tone: "bg-destructive/10 text-destructive",
  },
  printed: {
    verb: "printed",
    icon: Printer,
    tone: "bg-muted text-muted-foreground",
  },
};

const MONEY_FIELDS = /(^|\.)(amount|vat|grandTotal|grossTotal|totalTax)$/;

const moneyFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function isBlank(value: unknown): boolean {
  return value === null || value === undefined || value === "";
}

/** Audit values are plain JSON — make each one read like the screen shows it. */
function formatChangeValue(field: string, value: unknown): string {
  if (typeof value === "number") {
    return MONEY_FIELDS.test(field)
      ? moneyFormatter.format(value)
      : String(value);
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string") {
    if (field === "status") {
      return value.charAt(0).toUpperCase() + value.slice(1);
    }
    if (field === "voucherDate" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      return formatCalendarDate(value);
    }
    return value;
  }
  return JSON.stringify(value);
}

function ChangeValue({
  field,
  value,
  struck = false,
}: {
  field: string;
  value: unknown;
  struck?: boolean;
}) {
  if (isBlank(value)) {
    return <span className="text-muted-foreground italic">empty</span>;
  }
  return (
    <span
      className={cn(
        "text-foreground font-medium break-words",
        struck && "text-muted-foreground line-through",
      )}
    >
      {formatChangeValue(field, value)}
    </span>
  );
}

function ChangeRow({
  change,
  valueOnly = false,
}: {
  change: AuditChange;
  /** A fact about the event rather than an edit (e.g. a print's copy) — no "from". */
  valueOnly?: boolean;
}) {
  const added = isBlank(change.from) && !isBlank(change.to);
  const removed = !isBlank(change.from) && isBlank(change.to);

  // Whole-line additions/removals carry their description as the value.
  if ((change.field === "lines" || valueOnly) && (added || removed)) {
    return (
      <li className="text-muted-foreground">
        {change.label}:{" "}
        <ChangeValue
          field={change.field}
          value={added ? change.to : change.from}
          struck={removed}
        />
      </li>
    );
  }

  return (
    <li className="text-muted-foreground">
      {change.label}: <ChangeValue field={change.field} value={change.from} />
      <ArrowRight
        className="mx-1 inline size-3 align-[-1px]"
        aria-label="changed to"
      />
      <ChangeValue field={change.field} value={change.to} />
    </li>
  );
}

function TimelineEntry({
  icon: Icon,
  tone,
  children,
}: {
  icon: LucideIcon;
  tone: string;
  children: ReactNode;
}) {
  return (
    <li className="relative flex gap-3 pb-5 last:pb-0">
      {/* Connector line down to the next entry. */}
      <span
        aria-hidden
        className="bg-border absolute top-8 bottom-0 left-3.5 w-px [li:last-child>&]:hidden"
      />
      <span
        className={cn(
          "relative flex size-7 shrink-0 items-center justify-center rounded-full",
          tone,
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1 space-y-1.5 pt-0.5 text-sm">
        {children}
      </div>
    </li>
  );
}

function AuditEntry({
  item,
  subjectLabel,
}: {
  item: AuditActivityItem;
  subjectLabel: string;
}) {
  const meta = ACTION_META[item.action] ?? {
    verb: item.action,
    icon: History,
    tone: "bg-muted text-muted-foreground",
  };
  // A cancel's only change is Posted → Cancelled, which the sentence says.
  const changes =
    item.action === "cancelled"
      ? item.changes.filter((change) => change.field !== "status")
      : item.changes;

  return (
    <TimelineEntry icon={meta.icon} tone={meta.tone}>
      <p className="leading-snug">
        <span className="font-medium">{item.actor.name}</span>{" "}
        <span className="text-muted-foreground">
          {meta.verb} {item.entityRef ?? `this ${subjectLabel}`}
        </span>
        <span className="text-muted-foreground"> · </span>
        <RelativeTime value={item.at} className="text-muted-foreground" />
      </p>
      {item.reason ? (
        <p className="bg-muted/60 rounded-md px-2.5 py-1.5">
          <span className="text-muted-foreground">Reason: </span>
          {item.reason}
        </p>
      ) : null}
      {changes.length > 0 ? (
        <ul className="space-y-0.5">
          {changes.map((change, index) => (
            <ChangeRow
              key={`${change.field}-${index}`}
              change={change}
              valueOnly={item.action === "printed"}
            />
          ))}
        </ul>
      ) : null}
    </TimelineEntry>
  );
}

function CommentEntry({ item }: { item: CommentActivityItem }) {
  return (
    <TimelineEntry icon={MessageSquare} tone="bg-accent text-accent-foreground">
      <p className="leading-snug">
        <span className="font-medium">{item.author.name}</span>{" "}
        <span className="text-muted-foreground">commented · </span>
        <RelativeTime value={item.at} className="text-muted-foreground" />
      </p>
      <p className="bg-card rounded-md border px-3 py-2 break-words whitespace-pre-wrap">
        {item.text}
      </p>
    </TimelineEntry>
  );
}

function TimelineSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading activity" className="space-y-5">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="flex gap-3">
          <div className="bg-muted size-7 shrink-0 animate-pulse rounded-full" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="bg-muted h-3.5 w-2/3 animate-pulse rounded" />
            <div className="bg-muted h-3.5 w-1/2 animate-pulse rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function LoadFailure({
  failure,
  onRetry,
}: {
  failure: ApiFailure;
  onRetry: () => void;
}) {
  const forbidden = failure.reason === "forbidden";
  const Icon = forbidden ? ShieldX : CircleAlert;

  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center text-sm">
      <span className="bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-full">
        <Icon className="size-4" />
      </span>
      <p className="font-medium">
        {forbidden
          ? "You don't have permission to view this activity"
          : "Couldn't load activity"}
      </p>
      {!forbidden ? (
        <>
          <p className="text-muted-foreground max-w-xs">
            {describeFailure(failure)}
          </p>
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RotateCw /> Try again
          </Button>
        </>
      ) : null}
    </div>
  );
}

/**
 * Merged audit + comment timeline for any record the backend registers for
 * comments (GET /activity), plus a box to add a comment (POST /comments).
 * Reads through the browser proxy, so it works the same on a full page and
 * inside a drawer. Shown oldest first, so a new comment lands right above
 * the box it was typed in.
 */
export function ActivityPanel({
  entityType,
  entityId,
  subjectLabel = "record",
  onCommentAdded,
  className,
}: ActivityPanelProps) {
  const [reloadCount, setReloadCount] = useState(0);
  const [state, setState] = useState<LoadState | null>(null);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const scrollOnRender = useRef(false);

  const key = `${entityType}:${entityId}:${reloadCount}`;
  // Anything loaded for another record (or before a retry) is stale.
  const current = state?.key === key ? state : null;

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ entityType, entityId });

    browserApi<ActivityTimeline>(`/activity?${query}`, {
      signal: controller.signal,
    })
      .then((result) =>
        setState(
          result.ok
            ? { key, status: "ready", timeline: result.data }
            : { key, status: "failed", failure: result },
        ),
      )
      .catch(() => {
        // Aborted: the record changed or the panel closed.
      });

    return () => controller.abort();
  }, [entityType, entityId, key]);

  useEffect(() => {
    if (scrollOnRender.current) {
      scrollOnRender.current = false;
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  });

  async function saveComment() {
    const text = draft.trim();
    if (!text || posting) return;

    setPosting(true);
    setPostError(null);
    const result = await browserApi<CommentView>("/comments", {
      method: "POST",
      body: { entityType, entityId, text },
    });
    setPosting(false);

    if (!result.ok) {
      setPostError(
        result.reason === "forbidden"
          ? "You don't have permission to comment here."
          : describeFailure(result),
      );
      return;
    }

    const comment = result.data;
    setDraft("");
    scrollOnRender.current = true;
    setState((previous) =>
      previous?.status === "ready"
        ? {
            ...previous,
            timeline: {
              items: [
                { kind: "comment", at: comment.createdAt, ...comment },
                ...previous.timeline.items,
              ],
              commentCount: previous.timeline.commentCount + 1,
            },
          }
        : previous,
    );
    onCommentAdded?.(comment);
  }

  const chronological: ActivityItem[] =
    current?.status === "ready" ? [...current.timeline.items].reverse() : [];
  const remaining = COMMENT_MAX_LENGTH - draft.length;

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {current === null ? (
          <TimelineSkeleton />
        ) : current.status === "failed" ? (
          <LoadFailure
            failure={current.failure}
            onRetry={() => setReloadCount((count) => count + 1)}
          />
        ) : chronological.length === 0 ? (
          <div className="text-muted-foreground flex flex-col items-center gap-2 py-6 text-center text-sm">
            <History className="size-5" />
            <p>No activity recorded yet.</p>
          </div>
        ) : (
          <ol aria-label="Activity">
            {chronological.map((item) =>
              item.kind === "audit" ? (
                <AuditEntry
                  key={`audit-${item.id}`}
                  item={item}
                  subjectLabel={subjectLabel}
                />
              ) : (
                <CommentEntry key={`comment-${item.id}`} item={item} />
              ),
            )}
          </ol>
        )}
        <div ref={endRef} />
      </div>

      {current?.status === "failed" &&
      current.failure.reason === "forbidden" ? null : (
        <form
          className="mt-4 space-y-2 border-t pt-4 print:hidden"
          onSubmit={(event) => {
            event.preventDefault();
            void saveComment();
          }}
        >
          <label htmlFor={`comment-${entityId}`} className="sr-only">
            Add a comment
          </label>
          <Textarea
            id={`comment-${entityId}`}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              if (postError) setPostError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                void saveComment();
              }
            }}
            maxLength={COMMENT_MAX_LENGTH}
            placeholder="Add a comment…"
            disabled={posting}
            aria-invalid={postError ? true : undefined}
            aria-describedby={`comment-${entityId}-hint`}
            className="min-h-20 resize-y"
          />
          {postError ? (
            <p role="alert" className="text-destructive text-sm">
              {postError}
            </p>
          ) : null}
          <div className="flex items-center justify-between gap-2">
            <p
              id={`comment-${entityId}-hint`}
              className={cn(
                "text-muted-foreground text-xs tabular-nums",
                remaining < 50 && "text-destructive",
              )}
            >
              {draft.length > 0
                ? `${remaining} characters left`
                : "Ctrl + Enter to save"}
            </p>
            <Button type="submit" size="sm" disabled={posting || !draft.trim()}>
              {posting ? <Loader2 className="animate-spin" /> : null}
              {posting ? "Saving…" : "Save comment"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
