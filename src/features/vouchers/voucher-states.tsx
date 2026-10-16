import { Ban, SearchX, ShieldX } from "lucide-react";
import Link from "next/link";

import { MasterTableSkeleton } from "@/components/master/master-states";
import { StatePanel } from "@/components/master/state-panel";
import { buttonVariants } from "@/components/ui/button";
import { VoucherToolbar } from "@/components/voucher/voucher-toolbar";

import { voucherPath, type VoucherConfig } from "./config";

function backTo(config: VoucherConfig) {
  return { href: config.basePath, label: config.title };
}

/** The user can read vouchers but not create/edit them (no manage permission). */
export function ManageForbidden({
  config,
  title,
}: {
  config: VoucherConfig;
  title: string;
}) {
  return (
    <div className="space-y-6">
      <VoucherToolbar title={title} back={backTo(config)} />
      <StatePanel
        icon={ShieldX}
        title="You don't have permission"
        action={
          <Link
            href={config.basePath}
            className={buttonVariants({ variant: "outline" })}
          >
            Back to {config.nounPlural}
          </Link>
        }
      >
        Creating and editing {config.title.toLowerCase()} needs the &ldquo;
        {config.permissionLabel}&rdquo; permission. Ask an administrator for
        access.
      </StatePanel>
    </div>
  );
}

export function CancelledNotEditable({
  config,
  id,
  voucherNo,
}: {
  config: VoucherConfig;
  id: string;
  voucherNo: string;
}) {
  return (
    <div className="space-y-6">
      <VoucherToolbar
        title={`Edit ${config.singular} ${voucherNo}`}
        back={{ href: voucherPath(config, id), label: voucherNo }}
      />
      <StatePanel
        icon={Ban}
        title={`Cancelled ${config.nounPlural} can't be edited`}
        action={
          <Link
            href={voucherPath(config, id)}
            className={buttonVariants({ variant: "outline" })}
          >
            View {voucherNo}
          </Link>
        }
      >
        {voucherNo} was cancelled and its posting reversed.{" "}
        {config.copy.cancelledNotEditableHint}
      </StatePanel>
    </div>
  );
}

export function VoucherNotFound({ config }: { config: VoucherConfig }) {
  return (
    <div className="space-y-6">
      <VoucherToolbar title={config.singular} back={backTo(config)} />
      <StatePanel
        icon={SearchX}
        title={`${config.Noun} not found`}
        action={
          <Link
            href={config.basePath}
            className={buttonVariants({ variant: "outline" })}
          >
            Back to {config.nounPlural}
          </Link>
        }
      >
        This {config.noun} doesn&apos;t exist, or the link is wrong.
      </StatePanel>
    </div>
  );
}

export function VoucherPageSkeleton({
  config,
  title,
}: {
  config: VoucherConfig;
  title: string;
}) {
  return (
    <div aria-busy="true" aria-label="Loading" className="space-y-6">
      <VoucherToolbar title={title} back={backTo(config)} />
      <div className="bg-muted h-48 animate-pulse rounded-xl" />
      <div className="bg-muted h-56 animate-pulse rounded-lg" />
      <div className="bg-muted ml-auto h-16 w-full max-w-md animate-pulse rounded-lg" />
    </div>
  );
}

/** The list route's loading state: header, filter bar, summary, table. */
export function VoucherListSkeleton({ config }: { config: VoucherConfig }) {
  return (
    <div className="space-y-6">
      <VoucherListHeading config={config} />
      <div className="bg-muted h-28 animate-pulse rounded-lg" />
      <div className="bg-muted h-20 animate-pulse rounded-lg" />
      <MasterTableSkeleton rows={8} />
    </div>
  );
}

export function VoucherListHeading({ config }: { config: VoucherConfig }) {
  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold">{config.title}</h1>
      <p className="text-muted-foreground text-sm">{config.description}</p>
    </div>
  );
}
