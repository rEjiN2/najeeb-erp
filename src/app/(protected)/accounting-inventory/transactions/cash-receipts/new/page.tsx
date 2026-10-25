import type { Metadata } from "next";

import { CASH_RECEIPTS_MODULE } from "@/features/cash-receipts/module";
import { VoucherNewRoute } from "@/features/vouchers/routes";

export const metadata: Metadata = {
  title: "New Receipt | ALA Dates",
};

/** ?customer=<partyId>&bill=<invoiceId> (a sales invoice's "Pay") prefills the line. */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <VoucherNewRoute
      module={CASH_RECEIPTS_MODULE}
      searchParams={await searchParams}
    />
  );
}
