import type { Metadata } from "next";

import { CASH_PAYMENTS_MODULE } from "@/features/cash-payments/module";
import { VoucherEditRoute } from "@/features/vouchers/routes";

export const metadata: Metadata = {
  title: "Edit Cash Payment | ALA Dates",
};

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <VoucherEditRoute module={CASH_PAYMENTS_MODULE} id={id} />;
}
