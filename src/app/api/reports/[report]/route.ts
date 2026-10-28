import { apiFetchRaw } from "@/lib/api";

const REPORTS = ["ledger", "day-book", "cash-book", "trial-balance"];

/**
 * GET /api/reports/:report?<filters>&format=csv|pdf — the accounting report
 * export, fetched with the caller's session cookie and streamed back.
 * Errors keep the backend's status and JSON body.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ report: string }> },
) {
  const { report } = await params;
  const search = new URL(request.url).searchParams;
  const format = search.get("format");
  if (!REPORTS.includes(report) || (format !== "csv" && format !== "pdf")) {
    return Response.json({ message: "Unknown report." }, { status: 404 });
  }

  let upstream: Response;
  try {
    upstream = await apiFetchRaw(`/reports/${report}?${search}`);
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

  const filename = (
    /filename="([^"]+)"/.exec(
      upstream.headers.get("Content-Disposition") ?? "",
    )?.[1] ?? `${report}.${format}`
  ).replace(/["\\r\n]/g, "_");
  const headers = new Headers({
    "Content-Type":
      format === "pdf" ? "application/pdf" : "text/csv; charset=utf-8",
    "Content-Disposition": `${format === "pdf" ? "inline" : "attachment"}; filename="${filename}"`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  });
  const length = upstream.headers.get("Content-Length");
  if (length) headers.set("Content-Length", length);
  return new Response(upstream.body, { status: 200, headers });
}
