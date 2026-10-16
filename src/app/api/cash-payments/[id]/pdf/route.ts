import { proxyVoucherPdf } from "@/features/vouchers/pdf-route";

/** GET /api/cash-payments/:id/pdf[?download=1] — see proxyVoucherPdf. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyVoucherPdf(request, {
    backendPath: "/cash-payments",
    id,
    fallbackName: "cash-payment.pdf",
  });
}
