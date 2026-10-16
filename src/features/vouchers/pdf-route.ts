import "server-only";

import { apiFetchRaw } from "@/lib/api";

/**
 * GET /api/<vouchers>/:id/pdf[?download=1] — the voucher's PDF, fetched
 * from the backend with the caller's session cookie and streamed back, so
 * the browser only ever talks to this app. Every call is a print on the
 * backend: it's audited ("printed") and later copies are marked DUPLICATE.
 *
 * Errors keep the backend's status and JSON body, so the client can tell a
 * 401/403/404 apart and show the backend's own message.
 */
export async function proxyVoucherPdf(
  request: Request,
  {
    backendPath,
    id,
    fallbackName,
  }: {
    /** e.g. "/cash-receipts". */
    backendPath: string;
    id: string;
    fallbackName: string;
  },
): Promise<Response> {
  const download = new URL(request.url).searchParams.get("download") === "1";

  let upstream: Response;
  try {
    upstream = await apiFetchRaw(
      `${backendPath}/${encodeURIComponent(id)}/pdf`,
    );
  } catch {
    return Response.json(
      {
        message: "Can't reach the server. Check your connection and try again.",
      },
      { status: 503 },
    );
  }

  if (!upstream.ok) {
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type":
          upstream.headers.get("Content-Type") ?? "application/json",
        "Cache-Control": "private, no-store",
      },
    });
  }

  // Keep the backend's filename (e.g. CP-0001.pdf); only the disposition
  // changes between viewing/printing and saving.
  const filename =
    /filename="([^"]+)"/.exec(
      upstream.headers.get("Content-Disposition") ?? "",
    )?.[1] ?? fallbackName;
  const safeName = filename.replace(/["\\\r\n]/g, "_");
  const headers = new Headers({
    "Content-Type": "application/pdf",
    "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${safeName}"`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  });
  const length = upstream.headers.get("Content-Length");
  if (length) headers.set("Content-Length", length);

  return new Response(upstream.body, { status: 200, headers });
}
