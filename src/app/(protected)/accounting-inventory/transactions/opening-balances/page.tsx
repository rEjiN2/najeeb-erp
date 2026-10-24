import type { Metadata } from "next";

import { OpeningBalanceListRoute } from "@/features/opening-balances/routes";

export const metadata: Metadata = {
  title: "Opening Balances | ALA Dates",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <OpeningBalanceListRoute searchParams={await searchParams} />;
}
