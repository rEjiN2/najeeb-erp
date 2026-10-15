import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MasterPageHeader } from "@/components/master/master-page-header";
import { MasterLoadError } from "@/components/master/master-states";
import { getLocationRules, getLocations } from "@/features/locations/api";
import {
  LOCATIONS_DESCRIPTION,
  LOCATIONS_PATH,
  LOCATIONS_TITLE,
} from "@/features/locations/constants";
import { LocationsPage } from "@/features/locations/locations-page";
import type { ApiFailure } from "@/lib/api";

export const metadata: Metadata = {
  title: "Locations | ALA Dates",
};

function LoadFailure({ failure }: { failure: ApiFailure }) {
  if (failure.reason === "unauthorized") {
    redirect(`/login?${new URLSearchParams({ from: LOCATIONS_PATH })}`);
  }

  return (
    <div className="space-y-6">
      <MasterPageHeader
        title={LOCATIONS_TITLE}
        description={LOCATIONS_DESCRIPTION}
      />
      <MasterLoadError
        reason={failure.reason}
        subject="locations"
        status={failure.status}
      />
    </div>
  );
}

export default async function Page() {
  // Both are required: without the rules the parent picker can't be filtered,
  // and there's deliberately no hardcoded fallback.
  const [locations, rules] = await Promise.all([
    getLocations(),
    getLocationRules(),
  ]);

  if (!locations.ok) return <LoadFailure failure={locations} />;
  if (!rules.ok) return <LoadFailure failure={rules} />;

  return <LocationsPage locations={locations.data} rules={rules.data} />;
}
