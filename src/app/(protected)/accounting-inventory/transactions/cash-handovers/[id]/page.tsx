import type { Metadata } from "next";

import { CASH_HANDOVERS_MODULE } from "@/features/cash-handovers/routes";
import { VoucherDetailRoute } from "@/features/vouchers/routes";

export const metadata: Metadata = {
  title: "Cash Handover | ALA Dates",
};

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  return (
    <VoucherDetailRoute
      module={CASH_HANDOVERS_MODULE}
      id={id}
      searchParams={query}
    />
  );
}
