import type { Metadata } from "next";

import { CASH_RECEIPTS_MODULE } from "@/features/cash-receipts/module";
import { VoucherNewRoute } from "@/features/vouchers/routes";

export const metadata: Metadata = {
  title: "New Cash Receipt | ALA Dates",
};

export default function Page() {
  return <VoucherNewRoute module={CASH_RECEIPTS_MODULE} />;
}
