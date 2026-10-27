import { proxyVoucherPdf } from "@/features/vouchers/pdf-route";

/** GET /api/stock-counts/:id/pdf[?download=1] — the blind count sheet; see proxyVoucherPdf. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyVoucherPdf(request, {
    backendPath: "/stock-counts",
    id,
    fallbackName: "stock-count.pdf",
  });
}
