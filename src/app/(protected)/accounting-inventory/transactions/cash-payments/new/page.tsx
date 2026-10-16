import type { Metadata } from "next";

import { CASH_PAYMENTS_MODULE } from "@/features/cash-payments/module";
import { VoucherNewRoute } from "@/features/vouchers/routes";

export const metadata: Metadata = {
  title: "New Cash Payment | ALA Dates",
};

export default function Page() {
  return <VoucherNewRoute module={CASH_PAYMENTS_MODULE} />;
}
