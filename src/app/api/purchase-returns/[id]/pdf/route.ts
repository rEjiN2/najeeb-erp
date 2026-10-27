import { proxyVoucherPdf } from "@/features/vouchers/pdf-route";

/** GET /api/purchase-returns/:id/pdf[?download=1] — see proxyVoucherPdf. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyVoucherPdf(request, {
    backendPath: "/purchase-returns",
    id,
    fallbackName: "purchase-return.pdf",
  });
}
