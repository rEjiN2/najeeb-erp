import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MasterPageHeader } from "@/components/master/master-page-header";
import { MasterLoadError } from "@/components/master/master-states";
import { canManageUnits, getUnits } from "@/features/units/api";
import {
  UNITS_DESCRIPTION,
  UNITS_PATH,
  UNITS_TITLE,
} from "@/features/units/constants";
import { UnitsPage } from "@/features/units/units-page";

export const metadata: Metadata = {
  title: "Units | ALA Dates",
};

export default async function Page() {
  const [units, canManage] = await Promise.all([getUnits(), canManageUnits()]);

  if (units.ok) {
    return <UnitsPage units={units.data} canManage={canManage} />;
  }
  if (units.reason === "unauthorized") {
    redirect(`/login?${new URLSearchParams({ from: UNITS_PATH })}`);
  }
  return (
    <div className="space-y-6">
      <MasterPageHeader title={UNITS_TITLE} description={UNITS_DESCRIPTION} />
      <MasterLoadError
        reason={units.reason}
        subject="units"
        status={units.status}
        messages={units.messages}
      />
    </div>
  );
}
