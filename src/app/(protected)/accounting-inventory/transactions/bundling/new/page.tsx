import type { Metadata } from "next";

import { BundlingNewRoute } from "@/features/bundling/routes";

export const metadata: Metadata = {
  title: "New Bundling | ALA Dates",
};

export default function Page() {
  return <BundlingNewRoute />;
}
