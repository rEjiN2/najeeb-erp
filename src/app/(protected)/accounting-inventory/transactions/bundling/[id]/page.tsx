import type { Metadata } from "next";

import { BundlingDetailRoute } from "@/features/bundling/routes";

export const metadata: Metadata = {
  title: "Bundling | ALA Dates",
};

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  return <BundlingDetailRoute id={id} searchParams={query} />;
}
