import type { Metadata } from "next";

import { REFERENCE_RECEIPTS_MODULE } from "@/features/cash-receipts/module";
import { VoucherEditRoute } from "@/features/vouchers/routes";

export const metadata: Metadata = {
  title: "Edit Reference Receipt | ALA Dates",
};

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <VoucherEditRoute module={REFERENCE_RECEIPTS_MODULE} id={id} />;
}
