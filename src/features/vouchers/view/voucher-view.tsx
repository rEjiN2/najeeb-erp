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
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { VoucherLineGrid } from "@/components/voucher/voucher-line-grid";
import {
  VoucherStatusBadge,
  isVoidStatus,
} from "@/components/voucher/voucher-status-badge";
import { VoucherToolbar } from "@/components/voucher/voucher-toolbar";
import { VoucherTotalsFooter } from "@/components/voucher/voucher-totals-footer";
import { ChequeStatusBadge } from "@/features/cheques/cheque-status-badge";
import { formatCalendarDate, toDateInputValue } from "@/lib/datetime";
import { formatAmount } from "@/lib/format";

import { ReceiptAttachments } from "../attachments";
import { CancelVoucherDialog } from "../cancel-voucher-dialog";
import {
  editVoucherPath,
  newVoucherPath,
  type VoucherAccess,
  type VoucherConfig,
} from "../config";
import { PaymentMethodBadge } from "../payment-method-badge";
import type {
  CancelVoucherAction,
  CollectorRef,
  UserRef,
  VoucherDetail,
} from "../types";
import { useVoucherPdf } from "../use-voucher-pdf";
import { viewColumns } from "../voucher-columns";

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
function MetaStrip({ voucher }: { voucher: VoucherDetail }) {
  const parts: ReactNode[] = [
    <Stamp
      key="created"
      label="Created by"
      user={voucher.createdBy}
      at={voucher.createdAt}
    />,
  ];
  if (voucher.updatedBy || voucher.updatedAt) {
    parts.push(
      <Stamp
        key="updated"
        label="Last updated by"
        user={voucher.updatedBy}
        at={voucher.updatedAt}
      />,
    );
  }
  if (voucher.status === "cancelled") {
    parts.push(
      <span key="cancelled" className="text-destructive">
        <Stamp
          label="Cancelled by"
          user={voucher.cancelledBy}
          at={voucher.cancelledAt}
        />
        {voucher.cancelReason ? ` · ${voucher.cancelReason}` : null}
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

function CollectorName({ collector }: { collector: CollectorRef }) {
  if (!collector.name) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {collector.name}
      {collector.id ? null : (
        <span className="text-muted-foreground text-xs">
          (legacy, no login)
        </span>
      )}
    </span>
  );
}

interface VoucherViewProps {
  config: VoucherConfig;
  cancelAction: CancelVoucherAction;
  voucher: VoucherDetail;
  access: VoucherAccess;
  /** Arrived straight from saving: show the "saved" banner. */
  justSaved: boolean;
  /** Replaces the lines and totals (handovers show their receipts). */
  body?: ReactNode;
  /** Shown after the status badge (purchase invoices: Unpaid). */
  extraBadge?: ReactNode;
}

export function VoucherView({
  config,
  cancelAction,
  voucher,
  access,
  justSaved,
  body,
  extraBadge,
}: VoucherViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [cancelOpen, setCancelOpen] = useState(false);
  // Bumped after each print/download: the backend logs a "printed" event.
  const [printCount, setPrintCount] = useState(0);
  const pdf = useVoucherPdf(config, {
    onPrinted: () => setPrintCount((n) => n + 1),
  });
  const isPosted = !isVoidStatus(voucher.status);

  const printButton = (
    <Button
      variant="outline"
      onClick={() => void pdf.print(voucher.id, voucher.voucherNo)}
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
      onClick={() => void pdf.download(voucher.id, voucher.voucherNo)}
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

  const lines = voucher.lines.map((line, index) => ({
    ...line,
    id: `line-${index}`,
  }));

  return (
    <div className="space-y-6">
      <VoucherToolbar
        title={`${config.singular} ${voucher.voucherNo}`}
        badge={
          <>
            <VoucherStatusBadge status={voucher.status} />
            {extraBadge}
          </>
        }
        description={<MetaStrip voucher={voucher} />}
        back={{ href: config.basePath, label: config.title }}
        actions={
          <>
            {config.printable === false ? null : (
              <>
                {printButton}
                {downloadButton}
              </>
            )}
            {isPosted && access.canCancel ? (
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => setCancelOpen(true)}
              >
                <Ban /> Cancel {config.noun}
              </Button>
            ) : null}
            {isPosted && access.canEdit ? (
              <Link
                href={editVoucherPath(config, voucher.id)}
                className={buttonVariants()}
              >
                <Pencil /> Edit
              </Link>
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
            {config.Noun} {voucher.voucherNo} saved
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {config.printable === false ? null : (
              <>
                {printButton}
                {downloadButton}
              </>
            )}
            {access.canCreate ? (
              <Link
                href={newVoucherPath(config)}
                className={buttonVariants({ variant: "outline" })}
              >
                <Plus /> New {config.Noun}
              </Link>
            ) : null}
            <Link
              href={config.basePath}
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

      {voucher.status === "cancelled" ? (
        <div
          role="status"
          className="border-destructive/30 bg-destructive/5 flex flex-col gap-1 rounded-lg border p-4 text-sm"
        >
          <p className="text-destructive flex items-center gap-1.5 font-medium">
            <Ban className="size-4" /> This {config.noun} is cancelled
          </p>
          {voucher.cancelReason ? (
            <p className="text-foreground">
              <span className="text-muted-foreground">Reason: </span>
              {voucher.cancelReason}
            </p>
          ) : null}
          <p className="text-muted-foreground">
            The posting was reversed. This {config.noun} no longer counts
            towards any balance and can&apos;t be edited.
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
                  <span className="font-mono">{voucher.voucherNo}</span>
                </Field>
                <Field label="Voucher Date">
                  {formatCalendarDate(voucher.voucherDate)}
                </Field>
                <Field label={config.copy.headerLabel}>
                  {voucher.headerAccount.name ?? (
                    <span className="text-muted-foreground italic">
                      Unknown account
                    </span>
                  )}
                </Field>
                <Field label={config.copy.collectorLabel}>
                  <CollectorName collector={voucher.collectedBy} />
                </Field>
                {voucher.extraFields.map((field) => (
                  <Field key={field.key} label={field.label}>
                    {field.value ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </Field>
                ))}
                {config.showPaymentDetails ||
                config.methodSelector ||
                voucher.paymentMethod === "cheque" ? (
                  <>
                    <Field label="Method">
                      <PaymentMethodBadge method={voucher.paymentMethod} />
                    </Field>
                    {voucher.paymentMethod === "cheque" ? (
                      <>
                        <Field label="Cheque No">
                          {(voucher.chequeNumber ??
                          voucher.paymentReference) ? (
                            <span className="font-mono">
                              {voucher.chequeNumber ?? voucher.paymentReference}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </Field>
                        <Field label="Cheque Date">
                          {voucher.chequeDate ? (
                            <span className="flex items-center gap-2">
                              {formatCalendarDate(voucher.chequeDate)}
                              {toDateInputValue(voucher.chequeDate) >
                              toDateInputValue(voucher.voucherDate) ? (
                                <Badge variant="secondary">Post-dated</Badge>
                              ) : null}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </Field>
                        <Field label="Drawn On Bank">
                          {voucher.chequeBankName ?? (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </Field>
                        <Field label="Cheque Status">
                          {voucher.chequeStatus ? (
                            <ChequeStatusBadge status={voucher.chequeStatus} />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </Field>
                      </>
                    ) : config.showPaymentDetails ? (
                      <Field label="Reference">
                        {voucher.paymentReference ? (
                          <span className="font-mono">
                            {voucher.paymentReference}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </Field>
                    ) : null}
                  </>
                ) : null}
                <div className="sm:col-span-2">
                  <Field label="Comments">
                    {voucher.comments ? (
                      <span className="whitespace-pre-wrap">
                        {voucher.comments}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </Field>
                </div>
              </dl>
            </CardContent>
          </Card>

          {config.methodSelector &&
          (voucher.paymentMethod !== "cash" ||
            voucher.attachments.length > 0) ? (
            <ReceiptAttachments
              receiptId={voucher.id}
              attachments={voucher.attachments}
              canAdd={isPosted && access.canCreate}
              canRemove={isPosted && access.canEdit}
            />
          ) : null}

          {body ?? (
            <VoucherLineGrid
              columns={viewColumns({
                // Left out by the backend without balances:view.
                showOldBalance: lines.every((line) => line.oldBalance !== null),
                simpleLines: config.simpleLines ?? false,
                showAllocations: Boolean(config.allocatesBills),
              })}
              lines={lines}
            />
          )}

          {body ? null : (
            <VoucherTotalsFooter
              totals={[
                ...(config.simpleLines
                  ? []
                  : [
                      {
                        label: "Gross",
                        value: formatAmount(voucher.grossTotal),
                      },
                      {
                        label: "Total Tax",
                        value: formatAmount(voucher.totalTax),
                      },
                    ]),
                {
                  label: config.simpleLines ? "Amount" : "Grand Total",
                  value: formatAmount(voucher.grandTotal),
                  emphasize: true,
                },
                ...(config.allocatesBills && isPosted
                  ? (() => {
                      const allocated =
                        Math.round(
                          voucher.lines.reduce(
                            (sum, line) =>
                              sum +
                              (line.allocations ?? []).reduce(
                                (s, a) => s + a.amount * 100,
                                0,
                              ),
                            0,
                          ),
                        ) / 100;
                      return [
                        {
                          label: "Allocated to bills",
                          value: formatAmount(allocated),
                        },
                        {
                          label: "On account",
                          value: formatAmount(voucher.grandTotal - allocated),
                        },
                      ];
                    })()
                  : []),
              ]}
            />
          )}
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
              key={`${voucher.status}-${voucher.updatedAt ?? ""}-${printCount}`}
              entityType={config.entityType}
              entityId={voucher.id}
              subjectLabel={config.noun}
              className="max-h-[70vh]"
            />
          </CardContent>
        </Card>
      </div>

      {pdf.fallback}

      <CancelVoucherDialog
        config={config}
        cancelAction={cancelAction}
        target={
          cancelOpen
            ? {
                id: voucher.id,
                voucherNo: voucher.voucherNo,
                grandTotal: voucher.grandTotal,
              }
            : null
        }
        onClose={() => setCancelOpen(false)}
      />
    </div>
  );
}
