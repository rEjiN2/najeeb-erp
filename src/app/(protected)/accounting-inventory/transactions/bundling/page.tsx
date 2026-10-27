import type { Metadata } from "next";

import { BundlingListRoute } from "@/features/bundling/routes";

export const metadata: Metadata = {
  title: "Bundling | ALA Dates",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <BundlingListRoute searchParams={await searchParams} />;
}
