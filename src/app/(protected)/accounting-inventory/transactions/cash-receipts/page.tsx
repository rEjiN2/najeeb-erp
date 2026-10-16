import type { Metadata } from "next";

import { CASH_RECEIPTS_MODULE } from "@/features/cash-receipts/module";
import { VoucherListRoute } from "@/features/vouchers/routes";

export const metadata: Metadata = {
  title: "Cash Receipts | ALA Dates",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <VoucherListRoute
      module={CASH_RECEIPTS_MODULE}
      searchParams={await searchParams}
    />
  );
}
