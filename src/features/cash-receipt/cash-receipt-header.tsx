"use client";

import { AllocationButton } from "@/components/voucher/allocation-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/shared/searchable-select";

import { CASHIERS, CASH_ACCOUNTS } from "./mock-data";
import type { CashReceiptVoucher } from "./types";

interface CashReceiptHeaderProps {
  voucher: CashReceiptVoucher;
  onChange: (patch: Partial<CashReceiptVoucher>) => void;
}

const CASH_ACCOUNT_OPTIONS = CASH_ACCOUNTS.map((account) => ({
  value: account.id,
  label: account.name,
}));

export function CashReceiptHeader({
  voucher,
  onChange,
}: CashReceiptHeaderProps) {
  return (
    <Card className="gap-4">
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <CardTitle>Voucher Details</CardTitle>
        <AllocationButton />
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="voucher-no">Voucher No</Label>
          <Input
            id="voucher-no"
            value={voucher.voucherNo}
            readOnly
            className="bg-muted/50"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="voucher-date">Voucher Date</Label>
          <Input
            id="voucher-date"
            type="date"
            value={voucher.voucherDate}
            onChange={(event) => onChange({ voucherDate: event.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>Cash Account</Label>
          <SearchableSelect
            value={voucher.cashAccountId || null}
            onChange={(value) => onChange({ cashAccountId: value ?? "" })}
            options={CASH_ACCOUNT_OPTIONS}
            placeholder="Select cash / bank account"
            emptyText="No matching accounts"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cashier">Cashier</Label>
          <Select
            value={voucher.cashierId}
            onValueChange={(value) => value && onChange({ cashierId: value })}
          >
            <SelectTrigger id="cashier" className="w-full">
              <SelectValue placeholder="Select cashier" />
            </SelectTrigger>
            <SelectContent>
              {CASHIERS.map((cashier) => (
                <SelectItem key={cashier.id} value={cashier.id}>
                  {cashier.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="comments">Comments</Label>
          <Textarea
            id="comments"
            value={voucher.comments}
            onChange={(event) => onChange({ comments: event.target.value })}
            placeholder="Optional notes about this receipt"
            className="min-h-10"
          />
        </div>
      </CardContent>
    </Card>
  );
}
