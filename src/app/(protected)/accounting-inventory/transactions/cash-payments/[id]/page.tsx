import type { Metadata } from "next";

import { CASH_PAYMENTS_MODULE } from "@/features/cash-payments/module";
import { VoucherDetailRoute } from "@/features/vouchers/routes";

export const metadata: Metadata = {
  title: "Cash Payment | ALA Dates",
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
      module={CASH_PAYMENTS_MODULE}
      id={id}
      searchParams={query}
    />
  );
}
