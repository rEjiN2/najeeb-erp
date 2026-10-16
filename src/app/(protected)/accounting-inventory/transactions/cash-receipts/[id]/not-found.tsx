import { SearchX } from "lucide-react";
import Link from "next/link";

import { StatePanel } from "@/components/master/state-panel";
import { buttonVariants } from "@/components/ui/button";
import { VoucherToolbar } from "@/components/voucher/voucher-toolbar";
import {
  CASH_RECEIPTS_PATH,
  CASH_RECEIPTS_TITLE,
} from "@/features/cash-receipts/constants";

export default function NotFound() {
  return (
    <div className="space-y-6">
      <VoucherToolbar
        title="Cash Receipt"
        back={{ href: CASH_RECEIPTS_PATH, label: CASH_RECEIPTS_TITLE }}
      />
      <StatePanel
        icon={SearchX}
        title="Receipt not found"
        action={
          <Link
            href={CASH_RECEIPTS_PATH}
            className={buttonVariants({ variant: "outline" })}
          >
            Back to receipts
          </Link>
        }
      >
        This receipt doesn&apos;t exist, or the link is wrong.
      </StatePanel>
    </div>
  );
}
