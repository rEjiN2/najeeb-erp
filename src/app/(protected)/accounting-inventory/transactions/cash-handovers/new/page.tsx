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
  const { user } = await searchParams;
  return <HandoverNewRoute userParam={typeof user === "string" ? user : ""} />;
}
