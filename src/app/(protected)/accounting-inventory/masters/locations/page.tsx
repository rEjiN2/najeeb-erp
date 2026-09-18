import type { Metadata } from "next";

import { LocationsPage } from "@/features/locations/locations-page";

export const metadata: Metadata = {
  title: "Locations | ALA Dates",
};

export default function Page() {
  return <LocationsPage />;
}
