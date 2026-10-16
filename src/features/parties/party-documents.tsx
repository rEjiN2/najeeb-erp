"use client";

import { FileText, Loader2, Paperclip, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BACKEND_PROXY_PATH } from "@/features/auth/constants";
import { describeFailure } from "@/lib/api-types";
import { browserApi, browserUpload } from "@/lib/browser-api";
import { formatDayUae, formatExactUae } from "@/lib/datetime";

import { DOCUMENT_MAX_BYTES, DOCUMENT_MIME_TYPES } from "./constants";
import type { Party, PartyDocument } from "./types";

/** Our own route for the file — never the storage provider's URL. */
function documentHref(document: PartyDocument): string {
  return `${BACKEND_PROXY_PATH}/files/${encodeURIComponent(document.fileId)}`;
}

interface PartyDocumentsProps {
  partyId: string;
  documents: PartyDocument[];
  canManage: boolean;
}

/**
 * Upload, list and delete a saved party's documents. Each change is its own
 * request (POST/DELETE /parties/:id/documents), applied immediately — it isn't
 * part of the form's Save.
 */
export function PartyDocuments({
  partyId,
  documents: initialDocuments,
  canManage,
}: PartyDocumentsProps) {
  const router = useRouter();
  const [documents, setDocuments] = useState(initialDocuments);
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  function applied(party: Party) {
    setDocuments(party.documents);
    // The list holds the party too; keep it current for the next open.
    router.refresh();
  }

  async function upload(file: File | undefined) {
    if (!file) return;
    if (!(DOCUMENT_MIME_TYPES as readonly string[]).includes(file.type)) {
      setError("Attach a PDF or an image (JPEG, PNG, WebP or GIF).");
      return;
    }
    if (file.size > DOCUMENT_MAX_BYTES) {
      setError(
        `${file.name} is ${(file.size / 1024 / 1024).toFixed(1)} MB — files must be under 10 MB.`,
      );
      return;
    }

    setError(null);
    setUploading(true);
    const form = new FormData();
    form.set("file", file);
    if (title.trim()) form.set("title", title.trim());
    const result = await browserUpload<Party>(
      `/parties/${encodeURIComponent(partyId)}/documents`,
      form,
    );
    setUploading(false);

    if (!result.ok) {
      setError(
        result.reason === "forbidden"
          ? "You don't have permission to attach documents."
          : describeFailure(result),
      );
      return;
    }
    setTitle("");
    applied(result.data);
  }

  async function remove(document: PartyDocument) {
    setError(null);
    setRemovingId(document.id);
    const result = await browserApi<Party>(
      `/parties/${encodeURIComponent(partyId)}/documents/${encodeURIComponent(document.id)}`,
      { method: "DELETE" },
    );
    setRemovingId(null);
    setConfirmId(null);

    if (!result.ok) {
      setError(
        result.reason === "forbidden"
          ? "You don't have permission to delete documents."
          : describeFailure(result),
      );
      return;
    }
    applied(result.data);
  }

  return (
    <div className="space-y-3">
      {documents.length === 0 ? (
        <p className="text-muted-foreground flex items-center gap-2 rounded-md border border-dashed px-3 py-4 text-sm">
          <Paperclip className="size-4" /> No documents attached yet.
        </p>
      ) : (
        <ul className="divide-y rounded-md border">
          {documents.map((document) => (
            <li key={document.id} className="flex items-center gap-3 px-3 py-2">
              <FileText className="text-muted-foreground size-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <a
                  href={documentHref(document)}
                  target="_blank"
                  rel="noopener"
                  className="block truncate text-sm font-medium hover:underline"
                >
                  {document.title}
                </a>
                <p
                  className="text-muted-foreground text-xs"
                  title={formatExactUae(document.uploadedAt)}
                >
                  Uploaded {formatDayUae(document.uploadedAt)}
                </p>
              </div>
              {canManage ? (
                confirmId === document.id ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => void remove(document)}
                      disabled={removingId !== null}
                    >
                      {removingId === document.id ? (
                        <Loader2 className="animate-spin" />
                      ) : null}
                      Delete
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmId(null)}
                      disabled={removingId !== null}
                    >
                      Keep
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete ${document.title}`}
                    onClick={() => setConfirmId(document.id)}
                    disabled={uploading || removingId !== null}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canManage ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Title (optional — defaults to the file name)"
            aria-label="Document title"
            maxLength={200}
            disabled={uploading}
          />
          <input
            ref={fileInput}
            type="file"
            accept={DOCUMENT_MIME_TYPES.join(",")}
            className="sr-only"
            aria-label="Choose a document"
            onChange={(event) => {
              void upload(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
            className="shrink-0"
          >
            {uploading ? <Loader2 className="animate-spin" /> : <Upload />}
            {uploading ? "Uploading…" : "Upload"}
          </Button>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
      <p className="text-muted-foreground text-xs">
        PDF or image, under 10 MB. Uploads and deletes apply straight away.
      </p>
    </div>
  );
}
