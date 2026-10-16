import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { VoucherToolbar } from "@/components/voucher/voucher-toolbar";
import { getCashReceipt } from "@/features/cash-receipts/api";
import {
  CASH_RECEIPTS_PATH,
  CASH_RECEIPTS_TITLE,
  editCashReceiptPath,
} from "@/features/cash-receipts/constants";
import { loadReceiptFormData } from "@/features/cash-receipts/form-data";
import { CashReceiptForm } from "@/features/cash-receipts/form/cash-receipt-form";
import { LoadFailure } from "@/features/cash-receipts/load-failure";
import { canManageCashReceipts } from "@/features/cash-receipts/permissions";
import {
  CancelledNotEditable,
  ManageForbidden,
} from "@/features/cash-receipts/receipt-states";

export const metadata: Metadata = {
  title: "Edit Cash Receipt | ALA Dates",
};

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const returnTo = editCashReceiptPath(id);

  if (!(await canManageCashReceipts())) {
    return <ManageForbidden title="Edit Cash Receipt" />;
  }

  const [receipt, formData] = await Promise.all([
    getCashReceipt(id),
    loadReceiptFormData({ preselectMine: false }),
  ]);

  const header = (
    <VoucherToolbar
      title="Edit Cash Receipt"
      back={{ href: CASH_RECEIPTS_PATH, label: CASH_RECEIPTS_TITLE }}
    />
  );

  if (!receipt.ok) {
    if (
      receipt.reason === "error" &&
      (receipt.status === 404 || receipt.status === 400)
    ) {
      notFound();
    }
    return (
      <LoadFailure
        failure={receipt}
        returnTo={returnTo}
        subject="this cash receipt"
        header={header}
      />
    );
  }
  if (receipt.data.status === "cancelled") {
    return <CancelledNotEditable id={id} voucherNo={receipt.data.voucherNo} />;
  }
  if (!formData.ok) {
    return (
      <LoadFailure
        failure={formData}
        returnTo={returnTo}
        subject="the receipt form"
        header={header}
      />
    );
  }

  return (
    <CashReceiptForm mode="edit" receipt={receipt.data} {...formData.data} />
  );
}
