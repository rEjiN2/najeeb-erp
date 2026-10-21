import type { Metadata } from "next";

import { ChequesRoute } from "@/features/cheques/route";

export const metadata: Metadata = {
  title: "Cheques | ALA Dates",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <ChequesRoute searchParams={await searchParams} />;
}
