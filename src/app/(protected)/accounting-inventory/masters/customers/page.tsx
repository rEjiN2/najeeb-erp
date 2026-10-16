import type { Metadata } from "next";

import { PartiesRoute } from "@/features/parties/parties-route";

export const metadata: Metadata = {
  title: "Customers | ALA Dates",
};

export default function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <PartiesRoute kind="customer" searchParams={searchParams} />;
}
