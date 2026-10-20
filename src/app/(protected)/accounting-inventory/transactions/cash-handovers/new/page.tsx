import type { Metadata } from "next";

import { HandoverNewRoute } from "@/features/cash-handovers/routes";

export const metadata: Metadata = {
  title: "New Cash Handover | ALA Dates",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { staff } = await searchParams;
  return (
    <HandoverNewRoute staffParam={typeof staff === "string" ? staff : ""} />
  );
}
