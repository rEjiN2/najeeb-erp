import type { Metadata } from "next";

import { PartiesRoute } from "@/features/parties/parties-route";

export const metadata: Metadata = {
  title: "Suppliers | ALA Dates",
};

export default function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <PartiesRoute kind="supplier" searchParams={searchParams} />;
}
