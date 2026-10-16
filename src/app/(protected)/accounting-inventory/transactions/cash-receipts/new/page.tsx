import type { Metadata } from "next";

import { VoucherToolbar } from "@/components/voucher/voucher-toolbar";
import {
  CASH_RECEIPTS_PATH,
  CASH_RECEIPTS_TITLE,
  NEW_CASH_RECEIPT_PATH,
} from "@/features/cash-receipts/constants";
import { loadReceiptFormData } from "@/features/cash-receipts/form-data";
import { CashReceiptForm } from "@/features/cash-receipts/form/cash-receipt-form";
import { LoadFailure } from "@/features/cash-receipts/load-failure";
import { canManageCashReceipts } from "@/features/cash-receipts/permissions";
import { ManageForbidden } from "@/features/cash-receipts/receipt-states";

export const metadata: Metadata = {
  title: "New Cash Receipt | ALA Dates",
};

export default async function Page() {
  if (!(await canManageCashReceipts())) {
    return <ManageForbidden title="New Cash Receipt" />;
  }

  const formData = await loadReceiptFormData({ preselectMine: true });
  if (!formData.ok) {
    return (
      <LoadFailure
        failure={formData}
        returnTo={NEW_CASH_RECEIPT_PATH}
        subject="the receipt form"
        header={
          <VoucherToolbar
            title="New Cash Receipt"
            back={{ href: CASH_RECEIPTS_PATH, label: CASH_RECEIPTS_TITLE }}
          />
        }
      />
    );
  }

  return <CashReceiptForm mode="create" {...formData.data} />;
}
