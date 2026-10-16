// Mirrors the backend's GET /activity (comments/activity.service.ts) and
// POST /comments (comments.service.ts) responses. Dates arrive as ISO strings.

export interface ActivityUser {
  id: string;
  name: string;
}

/** One readable difference, e.g. { label: "Amount", from: 500, to: 300 }. */
export interface AuditChange {
  field: string;
  label: string;
  from: unknown;
  to: unknown;
}

export type AuditAction = "created" | "updated" | "cancelled" | "printed";

export interface AuditActivityItem {
  kind: "audit";
  id: string;
  at: string;
  actor: ActivityUser;
  action: AuditAction;
  /** Human reference when it happened, e.g. a voucher number. */
  entityRef: string | null;
  changes: AuditChange[];
  reason: string | null;
}

export interface CommentView {
  id: string;
  entityType: string;
  entityId: string;
  text: string;
  author: ActivityUser;
  createdAt: string;
}

export type CommentActivityItem = { kind: "comment"; at: string } & CommentView;

export type ActivityItem = AuditActivityItem | CommentActivityItem;

export interface ActivityTimeline {
  /** Newest first. */
  items: ActivityItem[];
  commentCount: number;
}

/** Backend limit on comment text (COMMENT_MAX_LENGTH). */
export const COMMENT_MAX_LENGTH = 1000;
