"use client";

import { FileText, Loader2, Paperclip, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BACKEND_PROXY_PATH } from "@/features/auth/constants";
import {
  DOCUMENT_MAX_BYTES,
  DOCUMENT_MIME_TYPES,
} from "@/features/parties/constants";
import { describeFailure } from "@/lib/api-types";
import { browserApi, browserUpload } from "@/lib/browser-api";
import { formatExactUae } from "@/lib/datetime";

import type { VoucherAttachment } from "./types";

// Cheque photos and transfer slips on receipts. Files go through the backend
// (POST /cash-receipts/:id/attachments), never straight to storage.

export const ATTACHMENT_ACCEPT = DOCUMENT_MIME_TYPES.join(",");

/** Why `file` can't be attached, or null. */
export function attachmentProblem(file: File): string | null {
  if (!(DOCUMENT_MIME_TYPES as readonly string[]).includes(file.type)) {
    return "Attach a PDF or an image (JPEG, PNG, WebP or GIF).";
  }
  if (file.size > DOCUMENT_MAX_BYTES) {
    return `${file.name} is ${(file.size / 1024 / 1024).toFixed(1)} MB — files must be under 10 MB.`;
  }
  return null;
}

/** Uploads `file` onto a saved receipt. */
export async function uploadReceiptAttachment(
  receiptId: string,
  file: File,
): Promise<string | null> {
  const form = new FormData();
  form.set("file", file);
  const result = await browserUpload<unknown>(
    `/cash-receipts/${encodeURIComponent(receiptId)}/attachments`,
    form,
  );
  if (result.ok) return null;
  return result.reason === "forbidden"
    ? "You don't have permission to attach files to receipts."
    : describeFailure(result);
}

export function attachmentHref(fileId: string): string {
  return `${BACKEND_PROXY_PATH}/files/${encodeURIComponent(fileId)}`;
}

/** An image or PDF, shown full size: a local File (before saving) or a stored one. */
export function AttachmentPreview({
  source,
  title,
  open,
  onOpenChange,
  footer,
}: {
  source: File | { url: string; mimeType: string } | null;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  footer?: React.ReactNode;
}) {
  const objectUrl = useMemo(
    () => (source instanceof File ? URL.createObjectURL(source) : null),
    [source],
  );
  useEffect(
    () => () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    },
    [objectUrl],
  );

  const url = source instanceof File ? objectUrl : (source?.url ?? null);
  const mimeType =
    source instanceof File ? source.type : (source?.mimeType ?? "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Check it is readable (number, date, amount) before saving.
          </DialogDescription>
        </DialogHeader>
        <div className="bg-muted/40 flex max-h-[70vh] min-h-64 items-center justify-center overflow-auto rounded-lg border">
          {!url ? (
            <Loader2 className="text-muted-foreground size-5 animate-spin" />
          ) : mimeType === "application/pdf" ? (
            <iframe src={url} title={title} className="h-[70vh] w-full" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- a local blob or our own proxied file
            <img
              src={url}
              alt={title}
              className="max-h-[70vh] object-contain"
            />
          )}
        </div>
        {footer ? <DialogFooter>{footer}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  );
}

/** The view page's attachments: open, add (cash-receipts:create), remove (:edit). */
export function ReceiptAttachments({
  receiptId,
  attachments,
  canAdd,
  canRemove,
}: {
  receiptId: string;
  attachments: VoucherAttachment[];
  canAdd: boolean;
  canRemove: boolean;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<VoucherAttachment | null>(null);

  async function add(file: File | undefined) {
    if (!file) return;
    const problem = attachmentProblem(file);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setBusy("upload");
    const failure = await uploadReceiptAttachment(receiptId, file);
    setBusy(null);
    if (failure) setError(failure);
    else router.refresh();
  }

  async function remove(attachment: VoucherAttachment) {
    setError(null);
    setBusy(attachment.id);
    const result = await browserApi<unknown>(
      `/cash-receipts/${encodeURIComponent(receiptId)}/attachments/${encodeURIComponent(attachment.id)}`,
      { method: "DELETE" },
    );
    setBusy(null);
    if (!result.ok) setError(describeFailure(result));
    else router.refresh();
  }

  if (attachments.length === 0 && !canAdd) return null;

  return (
    <Card className="gap-3">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Paperclip className="size-4" /> Attachments ({attachments.length})
        </CardTitle>
        {canAdd ? (
          <>
            <input
              ref={input}
              type="file"
              accept={ATTACHMENT_ACCEPT}
              className="hidden"
              onChange={(event) => {
                void add(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => input.current?.click()}
              disabled={busy !== null}
            >
              {busy === "upload" ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Upload />
              )}
              Attach
            </Button>
          </>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-2">
        {attachments.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No cheque photo or transfer slip attached.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {attachments.map((attachment) => (
              <li
                key={attachment.id}
                className="flex items-center gap-3 p-2.5 text-sm"
              >
                <FileText className="text-muted-foreground size-4 shrink-0" />
                <button
                  type="button"
                  onClick={() => setPreview(attachment)}
                  className="min-w-0 flex-1 truncate text-left font-medium hover:underline"
                >
                  {attachment.title}
                </button>
                <span className="text-muted-foreground hidden text-xs sm:inline">
                  {formatExactUae(attachment.uploadedAt)}
                </span>
                {canRemove ? (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${attachment.title}`}
                    onClick={() => void remove(attachment)}
                    disabled={busy !== null}
                  >
                    {busy === attachment.id ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Trash2 />
                    )}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}
      </CardContent>
      <AttachmentPreview
        source={
          preview
            ? {
                url: attachmentHref(preview.fileId),
                mimeType: preview.mimeType,
              }
            : null
        }
        title={preview?.title ?? ""}
        open={preview !== null}
        onOpenChange={(open) => {
          if (!open) setPreview(null);
        }}
      />
    </Card>
  );
}
