import type { Metadata } from "next";

import { REFERENCE_RECEIPTS_MODULE } from "@/features/cash-receipts/module";
import { VoucherDetailRoute } from "@/features/vouchers/routes";

export const metadata: Metadata = {
  title: "Reference Receipt | ALA Dates",
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
      module={REFERENCE_RECEIPTS_MODULE}
      id={id}
      searchParams={query}
    />
  );
}
