import type { Metadata } from "next";

import { HandoverEditRoute } from "@/features/cash-handovers/routes";

export const metadata: Metadata = {
  title: "Edit Cash Handover | ALA Dates",
};

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <HandoverEditRoute id={id} />;
}
