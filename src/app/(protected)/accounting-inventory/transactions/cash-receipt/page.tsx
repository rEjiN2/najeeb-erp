import type { Metadata } from "next";

import { CashReceiptPage } from "@/features/cash-receipt/cash-receipt-page";

export const metadata: Metadata = {
  title: "Cash Receipt | ALA Dates",
};

export default function Page() {
  return <CashReceiptPage />;
}
