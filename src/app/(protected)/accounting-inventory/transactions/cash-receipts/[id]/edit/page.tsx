import type { Metadata } from "next";

import { CASH_RECEIPTS_MODULE } from "@/features/cash-receipts/module";
import { VoucherEditRoute } from "@/features/vouchers/routes";

export const metadata: Metadata = {
  title: "Edit Receipt | ALA Dates",
};

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <VoucherEditRoute module={CASH_RECEIPTS_MODULE} id={id} />;
}
