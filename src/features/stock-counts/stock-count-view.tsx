"use client";

import {
  Ban,
  CircleAlert,
  CircleCheck,
  Loader2,
  Pencil,
  Printer,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";

import { ActivityPanel } from "@/components/activity/activity-panel";
import { FormErrorSummary } from "@/components/master/form-error-summary";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { VoucherToolbar } from "@/components/voucher/voucher-toolbar";
import { formatQty, historyHref } from "@/features/stock/constants";
import { CancelVoucherDialog } from "@/features/vouchers/cancel-voucher-dialog";
import {
  CANCEL_REASON_MIN_LENGTH,
  REASON_MAX_LENGTH,
} from "@/features/vouchers/constants";
import type { UserRef } from "@/features/vouchers/types";
import { useVoucherPdf } from "@/features/vouchers/use-voucher-pdf";
import { formatCalendarDate } from "@/lib/datetime";
import { formatAmount } from "@/lib/format";
import { cn } from "@/lib/utils";

import {
  approveStockCount,
  cancelStockCount,
  rejectStockCount,
} from "./actions";
import {
  STOCK_COUNT_CONFIG as config,
  STOCK_COUNTS_PATH,
  stockCountPath,
} from "./constants";
import { StockCountStatusBadge } from "./stock-count-status-badge";
import type { StockCountDetail } from "./types";

export interface StockCountViewAccess {
  canCreate: boolean;
  canApprove: boolean;
  canCancel: boolean;
  /** stock:view-system-qty */
  canSystem: boolean;
  userId: string;
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
      {label}{" "}
      <span className="text-foreground font-medium">
        {user?.name ?? "an unknown user"}
      </span>
      {at ? (
        <>
          {" "}
          <RelativeTime value={at} />
        </>
      ) : null}
    </span>
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

const signed = (value: number) => `${value > 0 ? "+" : ""}${formatQty(value)}`;

export function StockCountView({
  detail,
  access,
  justSaved,
}: {
  detail: StockCountDetail;
  access: StockCountViewAccess;
  justSaved: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const [printCount, setPrintCount] = useState(0);
  const pdf = useVoucherPdf(config, {
    onPrinted: () => setPrintCount((n) => n + 1),
  });

  const { status, lines } = detail;
  const open = status === "draft" || status === "submitted";
  const system = access.canSystem;
  const hasCost = detail.totals?.excessValue !== undefined;
  const moved = lines.filter((line) => line.movedSinceCount);
  const changing = lines.filter((line) => (line.difference ?? 0) !== 0);
  const submitterIsMe = detail.submittedBy?.id === access.userId;
  const canReview =
    status === "submitted" && access.canApprove && system && !submitterIsMe;
  const canContinue =
    status === "draft" &&
    access.canCreate &&
    detail.createdBy?.id === access.userId;

  function approve() {
    startTransition(async () => {
      try {
        const result = await approveStockCount(detail.id, acknowledged);
        if (!result) return; // Redirected to sign in.
        if (!result.ok) {
          setApproveOpen(false);
          setErrors(result.messages);
          return;
        }
        if (result.message) toast.success(result.message);
        setApproveOpen(false);
        setErrors([]);
      } catch {
        setApproveOpen(false);
        setErrors([
          "Couldn't reach the app. Check your connection and try again.",
        ]);
      }
    });
  }

  function reject() {
    startTransition(async () => {
      try {
        const result = await rejectStockCount(detail.id, rejectReason);
        if (!result) return;
        if (!result.ok) {
          setRejectOpen(false);
          setErrors(result.messages);
          return;
        }
        if (result.message) toast.success(result.message);
        setRejectOpen(false);
        setErrors([]);
      } catch {
        setRejectOpen(false);
        setErrors([
          "Couldn't reach the app. Check your connection and try again.",
        ]);
      }
    });
  }

  const meta: ReactNode[] = [
    <Stamp
      key="c"
      label="Created by"
      user={detail.createdBy}
      at={detail.createdAt}
    />,
  ];
  if (detail.submittedAt) {
    meta.push(
      <Stamp
        key="s"
        label="Submitted by"
        user={detail.submittedBy}
        at={detail.submittedAt}
      />,
    );
  }
  if (detail.approvedAt) {
    meta.push(
      <Stamp
        key="a"
        label="Approved by"
        user={detail.approvedBy}
        at={detail.approvedAt}
      />,
    );
  }

  return (
    <div className="space-y-6">
      <VoucherToolbar
        title={`Stock Count ${detail.voucherNo}`}
        badge={<StockCountStatusBadge status={status} />}
        description={
          <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            {meta.map((part, index) => (
              <span key={index} className="contents">
                {index > 0 ? <span aria-hidden>·</span> : null}
                {part}
              </span>
            ))}
          </p>
        }
        back={{ href: STOCK_COUNTS_PATH, label: config.title }}
        actions={
          <>
            {open ? (
              <Button
                variant="outline"
                onClick={() => void pdf.print(detail.id, detail.voucherNo)}
                disabled={pdf.busy !== null}
              >
                {pdf.busy ? <Loader2 className="animate-spin" /> : <Printer />}
                Print count sheet
              </Button>
            ) : null}
            {open || status === "approved" ? (
              access.canCancel ? (
                <Button
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setCancelOpen(true)}
                >
                  <Ban /> Cancel count
                </Button>
              ) : null
            ) : null}
            {canContinue ? (
              <Link
                href={`${stockCountPath(detail.id)}/edit`}
                className={buttonVariants()}
              >
                <Pencil /> Continue counting
              </Link>
            ) : null}
          </>
        }
      />

      {justSaved ? (
        <div
          role="status"
          className="border-success/30 bg-success/5 flex items-center gap-2 rounded-lg border p-4"
        >
          <p className="text-success flex flex-1 items-center gap-2 font-medium">
            <CircleCheck className="size-5 shrink-0" />
            Stock count {detail.voucherNo}{" "}
            {status === "draft" ? "saved as a draft" : "submitted for approval"}
          </p>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Dismiss"
            onClick={() => router.replace(pathname, { scroll: false })}
          >
            <X />
          </Button>
        </div>
      ) : null}

      {status === "rejected" || status === "cancelled" ? (
        <div
          role="status"
          className="border-destructive/30 bg-destructive/5 flex flex-col gap-1 rounded-lg border p-4 text-sm"
        >
          <p className="text-destructive flex items-center gap-1.5 font-medium">
            <Ban className="size-4" /> This count is {status}
          </p>
          <p className="text-foreground">
            <span className="text-muted-foreground">Reason: </span>
            {(status === "rejected"
              ? detail.rejectReason
              : detail.cancelReason) ?? "—"}
          </p>
        </div>
      ) : null}

      <FormErrorSummary messages={errors} title="Couldn't complete that" />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Count Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Count No">
                  <span className="font-mono">{detail.voucherNo}</span>
                </Field>
                <Field label="Date">{formatCalendarDate(detail.date)}</Field>
                <Field label="Location">
                  {detail.location.name ?? (
                    <span className="text-muted-foreground italic">
                      Unknown location
                    </span>
                  )}
                </Field>
                {system ? (
                  <Field label="System quantities as of">
                    <RelativeTime value={detail.snapshotAt} />
                  </Field>
                ) : null}
                <div className="sm:col-span-2">
                  <Field label="Comments">
                    {detail.comments ? (
                      <span className="whitespace-pre-wrap">
                        {detail.comments}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </Field>
                </div>
              </dl>
            </CardContent>
          </Card>

          {canReview ? (
            <Card className="border-primary/40">
              <CardHeader>
                <CardTitle>Review &amp; approve</CardTitle>
                <CardDescription>
                  Approving posts each line&apos;s difference to the
                  location&apos;s stock.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {moved.length > 0 ? (
                  <div className="border-primary/40 bg-primary/5 space-y-2 rounded-lg border p-3 text-sm">
                    <p className="flex items-center gap-1.5 font-medium">
                      <CircleAlert className="size-4" />
                      Stock moved since the count on {moved.length} line
                      {moved.length === 1 ? "" : "s"}
                    </p>
                    <p className="text-muted-foreground">
                      Sales, purchases or transfers changed these after the
                      system quantity was taken, so the difference may be partly
                      stale. Flagged below.
                    </p>
                    <Label className="flex items-center gap-2 font-normal">
                      <Checkbox
                        checked={acknowledged}
                        onCheckedChange={(checked) =>
                          setAcknowledged(checked === true)
                        }
                      />
                      I&apos;ve reviewed the flagged lines and want to approve
                      anyway
                    </Label>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => {
                      setErrors([]);
                      setApproveOpen(true);
                    }}
                    disabled={pending || (moved.length > 0 && !acknowledged)}
                  >
                    <ThumbsUp /> Approve
                  </Button>
                  <Button
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      setErrors([]);
                      setRejectOpen(true);
                    }}
                    disabled={pending}
                  >
                    <ThumbsDown /> Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : status === "submitted" && access.canApprove && submitterIsMe ? (
            <p className="text-muted-foreground bg-card rounded-lg border p-4 text-sm">
              You submitted this count, so someone else has to approve it.
            </p>
          ) : null}

          <Card className="gap-4">
            <CardHeader>
              <CardTitle>Products ({lines.length})</CardTitle>
              {!system ? (
                <CardDescription>
                  System quantities and differences are hidden for your role.
                </CardDescription>
              ) : null}
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    {system ? (
                      <TableHead className="text-right">System</TableHead>
                    ) : null}
                    <TableHead className="text-right">Counted</TableHead>
                    {system ? (
                      <TableHead className="text-right">Difference</TableHead>
                    ) : null}
                    {system && hasCost ? (
                      <TableHead className="text-right">Value</TableHead>
                    ) : null}
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line) => {
                    const difference = line.difference ?? null;
                    return (
                      <TableRow
                        key={line.productId}
                        className={cn(line.movedSinceCount && "bg-primary/5")}
                      >
                        <TableCell>
                          {line.productName ? (
                            <Link
                              href={historyHref(
                                line.productId,
                                detail.location.id,
                              )}
                              className="hover:underline"
                            >
                              {line.productName}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground italic">
                              Unknown product
                            </span>
                          )}
                          <span className="text-muted-foreground block font-mono text-xs">
                            {line.productCode}
                            {line.unit ? ` · ${line.unit}` : ""}
                          </span>
                          {line.movedSinceCount ? (
                            <Badge
                              variant="outline"
                              className="border-primary/40 text-primary mt-1"
                            >
                              Stock moved since count
                            </Badge>
                          ) : null}
                        </TableCell>
                        {system ? (
                          <TableCell className="text-muted-foreground text-right font-mono tabular-nums">
                            {formatQty(line.snapshotQty)}
                          </TableCell>
                        ) : null}
                        <TableCell className="text-right font-mono tabular-nums">
                          {line.countedQty === null ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            formatQty(line.countedQty)
                          )}
                        </TableCell>
                        {system ? (
                          <TableCell
                            className={cn(
                              "text-right font-mono tabular-nums",
                              difference !== null &&
                                difference > 0 &&
                                "text-success",
                              difference !== null &&
                                difference < 0 &&
                                "text-destructive",
                            )}
                          >
                            {difference === null ? "—" : signed(difference)}
                          </TableCell>
                        ) : null}
                        {system && hasCost ? (
                          <TableCell className="text-right font-mono tabular-nums">
                            {line.value !== undefined
                              ? formatAmount(line.value)
                              : "—"}
                          </TableCell>
                        ) : null}
                        <TableCell className="text-sm">
                          {line.reason ?? (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {detail.totals ? (
                <dl className="mt-4 ml-auto grid max-w-sm grid-cols-[1fr_auto_auto] gap-x-4 gap-y-1 text-sm">
                  <dt className="text-success">Excess</dt>
                  <dd className="text-right font-mono tabular-nums">
                    {formatQty(detail.totals.excessQty)}
                  </dd>
                  <dd className="text-right font-mono tabular-nums">
                    {detail.totals.excessValue !== undefined
                      ? `AED ${formatAmount(detail.totals.excessValue)}`
                      : ""}
                  </dd>
                  <dt className="text-destructive">Shortage</dt>
                  <dd className="text-right font-mono tabular-nums">
                    {formatQty(detail.totals.shortageQty)}
                  </dd>
                  <dd className="text-right font-mono tabular-nums">
                    {detail.totals.shortageValue !== undefined
                      ? `AED ${formatAmount(detail.totals.shortageValue)}`
                      : ""}
                  </dd>
                </dl>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit xl:sticky xl:top-0">
          <CardHeader>
            <CardTitle>Activity</CardTitle>
            <CardDescription>
              Changes and comments, oldest first.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityPanel
              key={`${status}-${detail.updatedAt ?? ""}-${printCount}`}
              entityType={config.entityType}
              entityId={detail.id}
              subjectLabel={config.noun}
              className="max-h-[70vh]"
            />
          </CardContent>
        </Card>
      </div>

      {pdf.fallback}

      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve {detail.voucherNo}?</DialogTitle>
            <DialogDescription>
              {changing.length === 0
                ? "Every line matches the system, so no stock changes."
                : `${changing.length} of ${lines.length} line${lines.length === 1 ? "" : "s"} will change stock at ${detail.location.name ?? "this location"}: ${
                    changing.filter((line) => (line.difference ?? 0) > 0).length
                  } up, ${
                    changing.filter((line) => (line.difference ?? 0) < 0).length
                  } down.`}{" "}
              {lines.length - changing.length > 0 && changing.length > 0
                ? `${lines.length - changing.length} stay as they are. `
                : ""}
              {moved.length > 0
                ? `${moved.length} flagged line${moved.length === 1 ? "" : "s"} included, as acknowledged.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(false)}>
              Back
            </Button>
            <Button onClick={approve} disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : <ThumbsUp />}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={rejectOpen}
        onOpenChange={(next) => {
          setRejectOpen(next);
          if (!next) setRejectReason("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject {detail.voucherNo}?</DialogTitle>
            <DialogDescription>
              No stock changes. The count is kept, marked rejected, and a new
              one has to be taken.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">
              Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              maxLength={REASON_MAX_LENGTH}
              placeholder="e.g. Recount the Ajwa lines"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Back
            </Button>
            <Button
              variant="destructive"
              onClick={reject}
              disabled={
                pending || rejectReason.trim().length < CANCEL_REASON_MIN_LENGTH
              }
            >
              {pending ? <Loader2 className="animate-spin" /> : <ThumbsDown />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CancelVoucherDialog
        config={config}
        cancelAction={cancelStockCount}
        target={
          cancelOpen
            ? { id: detail.id, voucherNo: detail.voucherNo, grandTotal: 0 }
            : null
        }
        onClose={() => setCancelOpen(false)}
      />
    </div>
  );
}
