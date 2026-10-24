import type { Metadata } from "next";

import { OpeningBalanceEditRoute } from "@/features/opening-balances/routes";

export const metadata: Metadata = {
  title: "Edit Opening Balance | ALA Dates",
};

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <OpeningBalanceEditRoute id={(await params).id} />;
}
