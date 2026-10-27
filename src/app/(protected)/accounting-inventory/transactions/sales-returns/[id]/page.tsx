import type { Metadata } from "next";

import { ReturnDetailRoute } from "@/features/returns/routes";

export const metadata: Metadata = {
  title: "Sales Return | ALA Dates",
};

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  return <ReturnDetailRoute kind="sales" id={id} searchParams={query} />;
}
