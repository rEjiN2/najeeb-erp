import type { Metadata } from "next";

import { HandoverDetailRoute } from "@/features/cash-handovers/routes";

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
  return <HandoverDetailRoute id={id} searchParams={query} />;
}
