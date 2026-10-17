import type { Metadata } from "next";

import { HandoverNewRoute } from "@/features/cash-handovers/routes";

export const metadata: Metadata = {
  title: "New Cash Handover | ALA Dates",
};

export default function Page() {
  return <HandoverNewRoute />;
}
