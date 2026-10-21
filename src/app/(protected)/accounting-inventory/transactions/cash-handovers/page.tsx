import type { Metadata } from "next";

import { HandoverListRoute } from "@/features/cash-handovers/routes";

export const metadata: Metadata = {
  title: "Cash Handovers | ALA Dates",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <HandoverListRoute searchParams={await searchParams} />;
}
