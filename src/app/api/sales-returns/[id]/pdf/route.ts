import { proxyVoucherPdf } from "@/features/vouchers/pdf-route";

/** GET /api/sales-returns/:id/pdf[?download=1] — see proxyVoucherPdf. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyVoucherPdf(request, {
    backendPath: "/sales-returns",
    id,
    fallbackName: "sales-return.pdf",
  });
}
