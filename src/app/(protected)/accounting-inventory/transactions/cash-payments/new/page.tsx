import type { Metadata } from "next";

import { CASH_PAYMENTS_MODULE } from "@/features/cash-payments/module";
import { VoucherNewRoute } from "@/features/vouchers/routes";

export const metadata: Metadata = {
  title: "New Cash Payment | ALA Dates",
};

/** ?supplier=<partyId>&bill=<invoiceId> (a purchase invoice's "Pay") prefills the line. */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <VoucherNewRoute
      module={CASH_PAYMENTS_MODULE}
      searchParams={await searchParams}
    />
  );
}
