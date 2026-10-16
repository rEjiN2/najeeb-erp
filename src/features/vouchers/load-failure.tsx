import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { MasterLoadError } from "@/components/master/master-states";
import type { ApiFailure } from "@/lib/api";

/**
 * A page that couldn't load its data. 401 goes back to sign in (and returns
 * here afterwards); everything else renders a state under the page's header.
 */
export function LoadFailure({
  failure,
  returnTo,
  subject,
  header,
}: {
  failure: ApiFailure;
  returnTo: string;
  subject: string;
  header: ReactNode;
}) {
  if (failure.reason === "unauthorized") {
    redirect(`/login?${new URLSearchParams({ from: returnTo })}`);
  }

  return (
    <div className="space-y-6">
      {header}
      <MasterLoadError
        reason={failure.reason}
        subject={subject}
        status={failure.status}
        messages={failure.messages}
      />
    </div>
  );
}
