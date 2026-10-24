import type { Metadata } from "next";

import { OpeningBalanceDetailRoute } from "@/features/opening-balances/routes";

export const metadata: Metadata = {
  title: "Opening Balance | ALA Dates",
};

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  return <OpeningBalanceDetailRoute id={id} searchParams={query} />;
}
