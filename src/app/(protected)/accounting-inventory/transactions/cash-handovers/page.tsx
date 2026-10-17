import type { Metadata } from "next";

import { CASH_HANDOVERS_MODULE } from "@/features/cash-handovers/routes";
import { VoucherListRoute } from "@/features/vouchers/routes";

export const metadata: Metadata = {
  title: "Cash Handovers | ALA Dates",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <VoucherListRoute
      module={CASH_HANDOVERS_MODULE}
      searchParams={await searchParams}
    />
  );
}
