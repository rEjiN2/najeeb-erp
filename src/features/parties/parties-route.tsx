import { redirect } from "next/navigation";

import { MasterPageHeader } from "@/components/master/master-page-header";
import {
  MasterLoadError,
  MasterTableSkeleton,
} from "@/components/master/master-states";

import { canManageParties, getParties, parsePartyFilters } from "./api";
import { PARTY_KIND_CONFIG } from "./constants";
import { PartiesPage } from "./parties-page";
import type { PartyKind } from "./types";

type SearchParams = Record<string, string | string[] | undefined>;

/** Server page for /masters/customers and /masters/suppliers. */
export async function PartiesRoute({
  kind,
  searchParams,
}: {
  kind: PartyKind;
  searchParams: Promise<SearchParams>;
}) {
  const config = PARTY_KIND_CONFIG[kind];
  const filters = parsePartyFilters(await searchParams);
  const [parties, canManage] = await Promise.all([
    getParties(kind, filters),
    canManageParties(),
  ]);

  if (!parties.ok) {
    if (parties.reason === "unauthorized") {
      redirect(`/login?${new URLSearchParams({ from: config.path })}`);
    }
    return (
      <div className="space-y-6">
        <MasterPageHeader
          title={config.title}
          description={config.description}
        />
        <MasterLoadError
          reason={parties.reason}
          subject={`${config.noun}s`}
          status={parties.status}
          messages={parties.messages}
        />
      </div>
    );
  }

  return (
    <PartiesPage
      config={config}
      page={parties.data}
      filters={filters}
      canManage={canManage}
    />
  );
}

export function PartiesLoading({ kind }: { kind: PartyKind }) {
  const config = PARTY_KIND_CONFIG[kind];
  return (
    <div className="space-y-6">
      <MasterPageHeader title={config.title} description={config.description} />
      <MasterTableSkeleton />
    </div>
  );
}
