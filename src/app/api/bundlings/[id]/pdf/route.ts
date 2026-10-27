import { proxyVoucherPdf } from "@/features/vouchers/pdf-route";

/** GET /api/bundlings/:id/pdf[?download=1] — see proxyVoucherPdf. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyVoucherPdf(request, {
    backendPath: "/bundlings",
    id,
    fallbackName: "bundling.pdf",
  });
}
