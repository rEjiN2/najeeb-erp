import type { Metadata } from "next";

import { ReturnNewRoute } from "@/features/returns/routes";

export const metadata: Metadata = {
  title: "New Purchase Return | ALA Dates",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <ReturnNewRoute kind="purchase" searchParams={await searchParams} />;
}
