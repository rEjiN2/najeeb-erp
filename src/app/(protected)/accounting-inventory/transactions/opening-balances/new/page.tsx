import type { Metadata } from "next";

import { OpeningBalanceNewRoute } from "@/features/opening-balances/routes";

export const metadata: Metadata = {
  title: "New Opening Balance | ALA Dates",
};

export default function Page() {
  return <OpeningBalanceNewRoute />;
}
