import { Ban, ShieldX } from "lucide-react";
import Link from "next/link";

import { StatePanel } from "@/components/master/state-panel";
import { buttonVariants } from "@/components/ui/button";
import { VoucherToolbar } from "@/components/voucher/voucher-toolbar";

import {
  CASH_RECEIPTS_PATH,
  CASH_RECEIPTS_TITLE,
  cashReceiptPath,
} from "./constants";

const BACK = { href: CASH_RECEIPTS_PATH, label: CASH_RECEIPTS_TITLE };

/** The user can read receipts but not create/edit them (no cash-receipts:manage). */
export function ManageForbidden({ title }: { title: string }) {
  return (
    <div className="space-y-6">
      <VoucherToolbar title={title} back={BACK} />
      <StatePanel
        icon={ShieldX}
        title="You don't have permission"
        action={
          <Link
            href={CASH_RECEIPTS_PATH}
            className={buttonVariants({ variant: "outline" })}
          >
            Back to receipts
          </Link>
        }
      >
        Creating and editing cash receipts needs the &ldquo;Manage cash
        receipts&rdquo; permission. Ask an administrator for access.
      </StatePanel>
    </div>
  );
}

export function CancelledNotEditable({
  id,
  voucherNo,
}: {
  id: string;
  voucherNo: string;
}) {
  return (
    <div className="space-y-6">
      <VoucherToolbar
        title={`Edit Cash Receipt ${voucherNo}`}
        back={{ href: cashReceiptPath(id), label: voucherNo }}
      />
      <StatePanel
        icon={Ban}
        title="Cancelled receipts can't be edited"
        action={
          <Link
            href={cashReceiptPath(id)}
            className={buttonVariants({ variant: "outline" })}
          >
            View {voucherNo}
          </Link>
        }
      >
        {voucherNo} was cancelled and its posting reversed. Create a new receipt
        if the cash still needs recording.
      </StatePanel>
    </div>
  );
}

export function ReceiptPageSkeleton({ title }: { title: string }) {
  return (
    <div aria-busy="true" aria-label="Loading" className="space-y-6">
      <VoucherToolbar title={title} back={BACK} />
      <div className="bg-muted h-48 animate-pulse rounded-xl" />
      <div className="bg-muted h-56 animate-pulse rounded-lg" />
      <div className="bg-muted ml-auto h-16 w-full max-w-md animate-pulse rounded-lg" />
    </div>
  );
}
