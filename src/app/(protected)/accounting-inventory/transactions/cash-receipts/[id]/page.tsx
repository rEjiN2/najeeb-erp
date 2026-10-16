import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { VoucherToolbar } from "@/components/voucher/voucher-toolbar";
import { getCashReceipt } from "@/features/cash-receipts/api";
import {
  CASH_RECEIPTS_PATH,
  CASH_RECEIPTS_TITLE,
  cashReceiptPath,
} from "@/features/cash-receipts/constants";
import { LoadFailure } from "@/features/cash-receipts/load-failure";
import { canManageCashReceipts } from "@/features/cash-receipts/permissions";
import { CashReceiptView } from "@/features/cash-receipts/view/cash-receipt-view";

export const metadata: Metadata = {
  title: "Cash Receipt | ALA Dates",
};

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [receipt, canManage] = await Promise.all([
    getCashReceipt(id),
    canManageCashReceipts(),
  ]);

  if (!receipt.ok) {
    // 400 is a malformed id — as far as the user can tell, no such receipt.
    if (
      receipt.reason === "error" &&
      (receipt.status === 404 || receipt.status === 400)
    ) {
      notFound();
    }
    return (
      <LoadFailure
        failure={receipt}
        returnTo={cashReceiptPath(id)}
        subject="this cash receipt"
        header={
          <VoucherToolbar
            title="Cash Receipt"
            back={{ href: CASH_RECEIPTS_PATH, label: CASH_RECEIPTS_TITLE }}
          />
        }
      />
    );
  }

  return (
    <CashReceiptView
      receipt={receipt.data}
      canManage={canManage}
      justSaved={query.saved === "1"}
    />
  );
}
