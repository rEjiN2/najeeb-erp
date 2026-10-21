import { ShieldX } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ActivityPanel } from "@/components/activity/activity-panel";
import { MasterLoadError } from "@/components/master/master-states";
import { StatePanel } from "@/components/master/state-panel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCashInHandAccounts } from "@/features/accounts/api";
import { canManageCompany, getCompanyProfile } from "@/features/company/api";
import { CompanyProfileForm } from "@/features/company/company-profile-form";
import {
  COMPANY_ENTITY_TYPE,
  COMPANY_PROFILE_DESCRIPTION,
  COMPANY_PROFILE_PATH,
  COMPANY_PROFILE_TITLE,
} from "@/features/company/constants";

export const metadata: Metadata = {
  title: "Company Profile | ALA Dates",
};

const header = (
  <div>
    <h1 className="font-heading text-2xl font-semibold">
      {COMPANY_PROFILE_TITLE}
    </h1>
    <p className="text-muted-foreground text-sm">
      {COMPANY_PROFILE_DESCRIPTION}
    </p>
  </div>
);

export default async function Page() {
  // Hidden from the menu without company:manage; a direct link lands here.
  if (!(await canManageCompany())) {
    return (
      <div className="space-y-6">
        {header}
        <StatePanel icon={ShieldX} title="You don't have permission">
          Editing the company profile needs the &ldquo;Manage company&rdquo;
          permission. Ask an administrator for access.
        </StatePanel>
      </div>
    );
  }

  const [profile, accounts] = await Promise.all([
    getCompanyProfile(),
    getCashInHandAccounts(),
  ]);
  if (!profile.ok) {
    if (profile.reason === "unauthorized") {
      redirect(`/login?${new URLSearchParams({ from: COMPANY_PROFILE_PATH })}`);
    }
    return (
      <div className="space-y-6">
        {header}
        <MasterLoadError
          reason={profile.reason}
          subject="the company profile"
          status={profile.status}
          messages={profile.messages}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <CompanyProfileForm
          // Fresh form state once a save lands new values.
          key={profile.data.updatedAt ?? "initial"}
          profile={profile.data}
          // null: the default-account pickers say they couldn't load.
          accounts={accounts.ok ? accounts.data : null}
        />
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Change history</CardTitle>
            <CardDescription>Every saved change, oldest first.</CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityPanel
              key={profile.data.updatedAt ?? "initial"}
              entityType={COMPANY_ENTITY_TYPE}
              entityId={profile.data.id}
              subjectLabel="profile"
              className="max-h-[70vh]"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
