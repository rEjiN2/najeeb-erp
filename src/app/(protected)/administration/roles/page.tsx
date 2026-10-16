import { ShieldX } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MasterPageHeader } from "@/components/master/master-page-header";
import { MasterLoadError } from "@/components/master/master-states";
import { StatePanel } from "@/components/master/state-panel";
import {
  canManageRoles,
  getPermissionCatalog,
  getRoles,
} from "@/features/roles/api";
import {
  ROLES_DESCRIPTION,
  ROLES_PATH,
  ROLES_TITLE,
} from "@/features/roles/constants";
import { RolesPage } from "@/features/roles/roles-page";

export const metadata: Metadata = {
  title: "Roles | ALA Dates",
};

const header = (
  <MasterPageHeader title={ROLES_TITLE} description={ROLES_DESCRIPTION} />
);

export default async function Page() {
  // Hidden from the menu without roles:manage; a direct link lands here.
  if (!(await canManageRoles())) {
    return (
      <div className="space-y-6">
        {header}
        <StatePanel icon={ShieldX} title="You don't have permission">
          Managing roles needs the &ldquo;Manage roles&rdquo; permission. Ask an
          administrator for access.
        </StatePanel>
      </div>
    );
  }

  // The form can't be built without the catalog, so both are required.
  const [roles, catalog] = await Promise.all([
    getRoles(),
    getPermissionCatalog(),
  ]);
  const failure = !roles.ok ? roles : !catalog.ok ? catalog : null;
  if (failure) {
    if (failure.reason === "unauthorized") {
      redirect(`/login?${new URLSearchParams({ from: ROLES_PATH })}`);
    }
    return (
      <div className="space-y-6">
        {header}
        <MasterLoadError
          reason={failure.reason}
          subject="roles"
          status={failure.status}
          messages={failure.messages}
        />
      </div>
    );
  }

  return (
    <RolesPage
      roles={roles.ok ? roles.data : []}
      catalog={catalog.ok ? catalog.data : []}
    />
  );
}
