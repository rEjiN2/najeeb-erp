"use client";

import {
  ArrowLeft,
  Ban,
  CircleCheck,
  Download,
  Loader2,
  Pencil,
  Plus,
  Printer,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { ActivityPanel } from "@/components/activity/activity-panel";
import { RelativeTime } from "@/components/shared/relative-time";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { VoucherLineGrid } from "@/components/voucher/voucher-line-grid";
import { VoucherStatusBadge } from "@/components/voucher/voucher-status-badge";
import { VoucherToolbar } from "@/components/voucher/voucher-toolbar";
import { VoucherTotalsFooter } from "@/components/voucher/voucher-totals-footer";
import { formatCalendarDate } from "@/lib/datetime";
import { formatAmount } from "@/lib/format";

import { CancelReceiptDialog } from "../cancel-receipt-dialog";
import {
  CASH_RECEIPTS_PATH,
  CASH_RECEIPTS_TITLE,
  CASH_RECEIPT_ENTITY_TYPE,
  NEW_CASH_RECEIPT_PATH,
  editCashReceiptPath,
} from "../constants";
import { VIEW_COLUMNS } from "../receipt-columns";
import type { CashReceiptDetail, CashierRef, UserRef } from "../types";
import { useReceiptPdf } from "../use-receipt-pdf";

const NO_PERMISSION = "You don't have permission to manage cash receipts";

function Who({ user }: { user: UserRef | null }) {
  return user ? (
    <span className="text-foreground font-medium">{user.name}</span>
  ) : (
    <span className="italic">an unknown user</span>
  );
}

function Stamp({
  label,
  user,
  at,
}: {
  label: string;
  user: UserRef | null;
  at: string | null;
}) {
  return (
    <span>
      {label} <Who user={user} />
      {at ? (
        <>
          {" "}
          <RelativeTime value={at} />
        </>
      ) : null}
    </span>
  );
}

/** "Created by X 2 days ago · Last updated by Y 1 hour ago · Cancelled by Z · reason" */
function MetaStrip({ receipt }: { receipt: CashReceiptDetail }) {
  const parts: ReactNode[] = [
    <Stamp
      key="created"
      label="Created by"
      user={receipt.createdBy}
      at={receipt.createdAt}
    />,
  ];
  if (receipt.updatedBy || receipt.updatedAt) {
    parts.push(
      <Stamp
        key="updated"
        label="Last updated by"
        user={receipt.updatedBy}
        at={receipt.updatedAt}
      />,
    );
  }
  if (receipt.status === "cancelled") {
    parts.push(
      <span key="cancelled" className="text-destructive">
        <Stamp
          label="Cancelled by"
          user={receipt.cancelledBy}
          at={receipt.cancelledAt}
        />
        {receipt.cancelReason ? ` · ${receipt.cancelReason}` : null}
      </span>,
    );
  }

  return (
    <p className="text-muted-foreground flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
      {parts.map((part, index) => (
        <span key={index} className="contents">
          {index > 0 ? <span aria-hidden>·</span> : null}
          {part}
        </span>
      ))}
    </p>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {label}
      </dt>
      <dd className="text-sm break-words">{children}</dd>
    </div>
  );
}

function CashierName({ cashier }: { cashier: CashierRef }) {
  if (!cashier.name) return <span className="text-muted-foreground">—</span>;
  return (
    <span>
      {cashier.name}
      {cashier.id ? null : (
        <span className="text-muted-foreground text-xs">
          {" "}
          (entered before cashiers were set up)
        </span>
      )}
    </span>
  );
}

interface CashReceiptViewProps {
  receipt: CashReceiptDetail;
  canManage: boolean;
  /** Arrived straight from saving: show the "saved" banner. */
  justSaved: boolean;
}

export function CashReceiptView({
  receipt,
  canManage,
  justSaved,
}: CashReceiptViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [cancelOpen, setCancelOpen] = useState(false);
  // Bumped after each print/download: the backend logs a "printed" event.
  const [printCount, setPrintCount] = useState(0);
  const pdf = useReceiptPdf({ onPrinted: () => setPrintCount((n) => n + 1) });
  const isPosted = receipt.status === "posted";

  const printButton = (
    <Button
      variant="outline"
      onClick={() => void pdf.print(receipt.id, receipt.voucherNo)}
      disabled={pdf.busy !== null}
    >
      {pdf.busy === "print" ? (
        <Loader2 className="animate-spin" />
      ) : (
        <Printer />
      )}
      Print
    </Button>
  );
  const downloadButton = (
    <Button
      variant="outline"
      onClick={() => void pdf.download(receipt.id, receipt.voucherNo)}
      disabled={pdf.busy !== null}
    >
      {pdf.busy === "download" ? (
        <Loader2 className="animate-spin" />
      ) : (
        <Download />
      )}
      Download PDF
    </Button>
  );

  const lines = receipt.lines.map((line, index) => ({
    ...line,
    id: `line-${index}`,
  }));

  return (
    <div className="space-y-6">
      <VoucherToolbar
        title={`Cash Receipt ${receipt.voucherNo}`}
        badge={<VoucherStatusBadge status={receipt.status} />}
        description={<MetaStrip receipt={receipt} />}
        back={{ href: CASH_RECEIPTS_PATH, label: CASH_RECEIPTS_TITLE }}
        actions={
          <>
            {printButton}
            {downloadButton}
            {isPosted ? (
              canManage ? (
                <>
                  <Button
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setCancelOpen(true)}
                  >
                    <Ban /> Cancel receipt
                  </Button>
                  <Link
                    href={editCashReceiptPath(receipt.id)}
                    className={buttonVariants()}
                  >
                    <Pencil /> Edit
                  </Link>
                </>
              ) : (
                <Button disabled title={NO_PERMISSION}>
                  <Pencil /> Edit
                </Button>
              )
            ) : null}
          </>
        }
      />

      {justSaved ? (
        <div
          role="status"
          className="border-success/30 bg-success/5 flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center"
        >
          <p className="text-success flex flex-1 items-center gap-2 font-medium">
            <CircleCheck className="size-5 shrink-0" />
            Receipt {receipt.voucherNo} saved
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {printButton}
            {downloadButton}
            {canManage ? (
              <Link
                href={NEW_CASH_RECEIPT_PATH}
                className={buttonVariants({ variant: "outline" })}
              >
                <Plus /> New Receipt
              </Link>
            ) : null}
            <Link
              href={CASH_RECEIPTS_PATH}
              className={buttonVariants({ variant: "ghost" })}
            >
              <ArrowLeft /> Back to list
            </Link>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Dismiss"
              onClick={() => router.replace(pathname, { scroll: false })}
            >
              <X />
            </Button>
          </div>
        </div>
      ) : null}

      {receipt.status === "cancelled" ? (
        <div
          role="status"
          className="border-destructive/30 bg-destructive/5 flex flex-col gap-1 rounded-lg border p-4 text-sm"
        >
          <p className="text-destructive flex items-center gap-1.5 font-medium">
            <Ban className="size-4" /> This receipt is cancelled
          </p>
          {receipt.cancelReason ? (
            <p className="text-foreground">
              <span className="text-muted-foreground">Reason: </span>
              {receipt.cancelReason}
            </p>
          ) : null}
          <p className="text-muted-foreground">
            The posting was reversed. This receipt no longer counts towards any
            balance and can&apos;t be edited.
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px] print:block">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Voucher Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Voucher No">
                  <span className="font-mono">{receipt.voucherNo}</span>
                </Field>
                <Field label="Voucher Date">
                  {formatCalendarDate(receipt.voucherDate)}
                </Field>
                <Field label="Cash Account">
                  {receipt.cashAccount.name ?? (
                    <span className="text-muted-foreground italic">
                      Unknown account
                    </span>
                  )}
                </Field>
                <Field label="Cashier">
                  <CashierName cashier={receipt.cashier} />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Comments">
                    {receipt.comments ? (
                      <span className="whitespace-pre-wrap">
                        {receipt.comments}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </Field>
                </div>
              </dl>
            </CardContent>
          </Card>

          <VoucherLineGrid columns={VIEW_COLUMNS} lines={lines} />

          <VoucherTotalsFooter
            totals={[
              { label: "Gross", value: formatAmount(receipt.grossTotal) },
              { label: "Total Tax", value: formatAmount(receipt.totalTax) },
              {
                label: "Grand Total",
                value: formatAmount(receipt.grandTotal),
                emphasize: true,
              },
            ]}
          />
        </div>

        <Card className="h-fit xl:sticky xl:top-0 print:hidden">
          <CardHeader>
            <CardTitle>Activity</CardTitle>
            <CardDescription>
              Changes and comments, oldest first.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityPanel
              // Re-read after a cancel or edit lands a new audit entry.
              key={`${receipt.status}-${receipt.updatedAt ?? ""}-${printCount}`}
              entityType={CASH_RECEIPT_ENTITY_TYPE}
              entityId={receipt.id}
              subjectLabel="receipt"
              className="max-h-[70vh]"
            />
          </CardContent>
        </Card>
      </div>

      {pdf.fallback}

      <CancelReceiptDialog
        target={
          cancelOpen
            ? {
                id: receipt.id,
                voucherNo: receipt.voucherNo,
                grandTotal: receipt.grandTotal,
              }
            : null
        }
        onClose={() => setCancelOpen(false)}
      />
    </div>
  );
}
