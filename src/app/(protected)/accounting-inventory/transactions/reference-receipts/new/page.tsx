import type { Metadata } from "next";

import { REFERENCE_RECEIPTS_MODULE } from "@/features/cash-receipts/module";
import { VoucherNewRoute } from "@/features/vouchers/routes";

export const metadata: Metadata = {
  title: "New Reference Receipt | ALA Dates",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <VoucherNewRoute
      module={REFERENCE_RECEIPTS_MODULE}
      searchParams={await searchParams}
    />
  );
}
