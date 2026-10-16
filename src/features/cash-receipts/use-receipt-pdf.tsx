"use client";

import { ExternalLink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { readErrorMessages } from "@/lib/api-types";
import { redirectToLogin } from "@/lib/browser-api";

/** Same-origin route handler that streams the backend PDF (app/api/...). */
export function receiptPdfUrl(id: string, download = false): string {
  return `/api/cash-receipts/${encodeURIComponent(id)}/pdf${download ? "?download=1" : ""}`;
}

type PdfResult =
  { ok: true; blob: Blob; filename: string } | { ok: false; message: string };

async function fetchPdf(id: string, download: boolean): Promise<PdfResult> {
  let response: Response;
  try {
    response = await fetch(receiptPdfUrl(id, download), { cache: "no-store" });
  } catch {
    return {
      ok: false,
      message: "Can't reach the app. Check your connection and try again.",
    };
  }

  if (!response.ok) {
    if (response.status === 401) {
      redirectToLogin();
      return { ok: false, message: "Your session has expired." };
    }
    if (response.status === 403) {
      return {
        ok: false,
        message: "You don't have permission to print this receipt.",
      };
    }
    if (response.status === 404) {
      return { ok: false, message: "This receipt no longer exists." };
    }
    const messages = await readErrorMessages(response);
    return {
      ok: false,
      message:
        response.status < 500 && messages.length > 0
          ? messages.join(" ")
          : `Couldn't create the PDF (HTTP ${response.status}). Try again in a moment.`,
    };
  }

  const filename =
    /filename="([^"]+)"/.exec(
      response.headers.get("Content-Disposition") ?? "",
    )?.[1] ?? "cash-receipt.pdf";
  return { ok: true, blob: await response.blob(), filename };
}

/** Object URLs must outlive the print dialog; a minute is plenty once loaded. */
const REVOKE_AFTER_MS = 60_000;

/**
 * Print and Download PDF for a receipt. Print opens a window synchronously
 * (inside the click, so popup blockers allow it), fills it with the PDF and
 * opens the print dialog; when the window is blocked, a dialog offers a plain
 * link instead. Each successful fetch is a "printed" event on the backend, so
 * `onPrinted` lets the caller refresh its activity timeline.
 */
export function useReceiptPdf({ onPrinted }: { onPrinted?: () => void } = {}) {
  const [busy, setBusy] = useState<"print" | "download" | null>(null);
  const [blocked, setBlocked] = useState<{
    id: string;
    voucherNo: string;
  } | null>(null);

  async function print(id: string, voucherNo: string) {
    const win = window.open("", "_blank");
    if (!win) {
      setBlocked({ id, voucherNo });
      return;
    }
    win.document.title = `Printing ${voucherNo}…`;
    win.document.body.style.cssText =
      "margin:0;font:14px system-ui,sans-serif;color:#555;display:grid;place-items:center;height:100vh";
    win.document.body.textContent = `Preparing ${voucherNo}…`;

    setBusy("print");
    const result = await fetchPdf(id, false);
    setBusy(null);
    if (!result.ok) {
      win.close();
      toast.error(`Couldn't print ${voucherNo}`, {
        description: result.message,
      });
      return;
    }

    const url = URL.createObjectURL(result.blob);
    setTimeout(() => URL.revokeObjectURL(url), REVOKE_AFTER_MS);
    const doc = win.document;
    doc.title = result.filename;
    doc.body.textContent = "";
    doc.body.style.cssText = "margin:0;height:100vh";
    const frame = doc.createElement("iframe");
    frame.style.cssText = "border:0;width:100%;height:100%";
    frame.title = voucherNo;
    frame.addEventListener("load", () => {
      // Give the PDF viewer a beat to lay out before printing.
      setTimeout(() => {
        try {
          frame.contentWindow?.focus();
          frame.contentWindow?.print();
        } catch {
          // The viewer is open either way; the user can print from it.
        }
      }, 300);
    });
    frame.src = url;
    doc.body.appendChild(frame);
    onPrinted?.();
  }

  async function download(id: string, voucherNo: string) {
    setBusy("download");
    const result = await fetchPdf(id, true);
    setBusy(null);
    if (!result.ok) {
      toast.error(`Couldn't download ${voucherNo}`, {
        description: result.message,
      });
      return;
    }
    const url = URL.createObjectURL(result.blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = result.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), REVOKE_AFTER_MS);
    onPrinted?.();
  }

  const fallback = (
    <AlertDialog
      open={blocked !== null}
      onOpenChange={(open) => {
        if (!open) setBlocked(null);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>The print window was blocked</AlertDialogTitle>
          <AlertDialogDescription>
            Your browser stopped the pop-up. Open the PDF from this link
            instead, then print it from the viewer — or allow pop-ups for this
            site and try again.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
          {blocked ? (
            <a
              href={receiptPdfUrl(blocked.id)}
              target="_blank"
              rel="noopener"
              className={buttonVariants()}
              onClick={() => {
                setBlocked(null);
                onPrinted?.();
              }}
            >
              <ExternalLink /> Open {blocked.voucherNo} PDF
            </a>
          ) : null}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { print, download, busy, fallback };
}
