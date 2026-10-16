"use client";

import type { ReactNode } from "react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { ActivityPanel } from "./activity-panel";
import type { CommentView } from "./types";

interface ActivitySheetProps {
  /** null closes the drawer. */
  target: { entityId: string; title: string } | null;
  onClose: () => void;
  entityType: string;
  subjectLabel?: string;
  description?: ReactNode;
  onCommentAdded?: (comment: CommentView) => void;
}

/** The Activity panel in a side drawer — for opening it from a list row. */
export function ActivitySheet({
  target,
  onClose,
  entityType,
  subjectLabel,
  description = "Changes and comments, oldest first.",
  onCommentAdded,
}: ActivitySheetProps) {
  return (
    <Sheet
      open={target !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent className="flex w-full flex-col overflow-hidden sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{target?.title ?? "Activity"}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        {target ? (
          <ActivityPanel
            key={target.entityId}
            entityType={entityType}
            entityId={target.entityId}
            subjectLabel={subjectLabel}
            onCommentAdded={onCommentAdded}
            className="flex-1 px-4 pb-4"
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
