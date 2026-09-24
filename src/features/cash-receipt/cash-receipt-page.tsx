"use client";

import { useState } from "react";

import { DeleteConfirmDialog } from "@/components/master/delete-confirm-dialog";
import { SearchableSelect } from "@/components/shared/searchable-select";
import { VoucherLineGrid } from "@/components/voucher/voucher-line-grid";
import { VoucherSearchDialog } from "@/components/voucher/voucher-search-dialog";
import { VoucherToolbar } from "@/components/voucher/voucher-toolbar";
import { VoucherTotalsFooter } from "@/components/voucher/voucher-totals-footer";
import { useVoucherCrud } from "@/hooks/use-voucher-crud";
import { formatCurrency } from "@/lib/format";

import { CashReceiptHeader } from "./cash-receipt-header";
import {
  CASH_RECEIPT_COLUMNS,
  computeCashReceiptTotals,
} from "./cash-receipt-columns";
import {
  MOCK_CASH_RECEIPTS,
  PARTY_LEDGER_ACCOUNTS,
  createBlankCashReceipt,
  nextCashReceiptNo,
} from "./mock-data";
import type { CashReceiptLine } from "./types";

const ACCOUNT_OPTIONS = PARTY_LEDGER_ACCOUNTS.map((account) => ({
  value: account.id,
  label: account.name,
}));

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function AddLineControl({ onAdd }: { onAdd: (line: CashReceiptLine) => void }) {
  const [pickerValue, setPickerValue] = useState<string | null>(null);

  return (
    <div className="max-w-xs">
      <SearchableSelect
        value={pickerValue}
        onChange={(accountId) => {
          if (!accountId) return;
          const account = PARTY_LEDGER_ACCOUNTS.find(
            (candidate) => candidate.id === accountId,
          );
          if (!account) return;

          onAdd({
            id: createId(),
            accountId: account.id,
            accountName: account.name,
            narration: "",
            remarks: "",
            oldBalance: account.outstanding,
            amount: 0,
            vat: 0,
          });
          setPickerValue(null);
        }}
        options={ACCOUNT_OPTIONS}
        placeholder="+ Select an account to add a line"
        emptyText="No matching accounts"
      />
    </div>
  );
}

export function CashReceiptPage() {
  const crud = useVoucherCrud({
    initialVouchers: MOCK_CASH_RECEIPTS,
    createBlank: createBlankCashReceipt,
    nextVoucherNo: nextCashReceiptNo,
  });

  const totals = computeCashReceiptTotals(crud.voucher.lines);

  return (
    <div className="space-y-6">
      <VoucherToolbar
        title="Cash Receipt"
        description="Record cash received against one or more party accounts."
        onNew={crud.newVoucher}
        onSave={crud.save}
        onPrint={() => window.print()}
        onDelete={crud.requestDelete}
        onSearch={() => crud.setIsSearchOpen(true)}
        isDeleteDisabled={!crud.isSaved}
      />

      <CashReceiptHeader voucher={crud.voucher} onChange={crud.updateVoucher} />

      <VoucherLineGrid
        columns={CASH_RECEIPT_COLUMNS}
        lines={crud.voucher.lines}
        onUpdateLine={crud.updateLine}
        onRemoveLine={crud.removeLine}
        addRowControl={<AddLineControl onAdd={crud.addLine} />}
      />

      <VoucherTotalsFooter
        totals={[
          { label: "Gross", value: formatCurrency(totals.gross) },
          { label: "Total Tax", value: formatCurrency(totals.tax) },
          {
            label: "Grand Total",
            value: formatCurrency(totals.grandTotal),
            emphasize: true,
          },
        ]}
      />

      <VoucherSearchDialog
        open={crud.isSearchOpen}
        onOpenChange={crud.setIsSearchOpen}
        vouchers={crud.vouchers}
        onSelect={crud.loadVoucher}
        getLabel={(voucher) => voucher.voucherNo}
        getMeta={(voucher) => voucher.voucherDate}
        emptyMessage="No saved cash receipts yet."
      />

      <DeleteConfirmDialog
        open={crud.isDeleteOpen}
        onOpenChange={(open) => {
          if (!open) crud.cancelDelete();
        }}
        itemLabel={crud.voucher.voucherNo}
        onConfirm={crud.confirmDelete}
      />
    </div>
  );
}
