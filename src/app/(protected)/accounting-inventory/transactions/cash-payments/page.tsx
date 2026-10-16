import type { Metadata } from "next";

import { CASH_PAYMENTS_MODULE } from "@/features/cash-payments/module";
import { VoucherListRoute } from "@/features/vouchers/routes";

export const metadata: Metadata = {
  title: "Cash Payments | ALA Dates",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <VoucherListRoute
      module={CASH_PAYMENTS_MODULE}
      searchParams={await searchParams}
    />
  );
}
