import { proxyVoucherPdf } from "@/features/vouchers/pdf-route";

/** GET /api/sales-invoices/:id/pdf[?download=1] — see proxyVoucherPdf. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyVoucherPdf(request, {
    backendPath: "/sales-invoices",
    id,
    fallbackName: "sales-invoice.pdf",
  });
}
