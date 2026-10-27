import type { Metadata } from "next";

import { ReturnListRoute } from "@/features/returns/routes";

export const metadata: Metadata = {
  title: "Sales Returns | ALA Dates",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <ReturnListRoute kind="sales" searchParams={await searchParams} />;
}
