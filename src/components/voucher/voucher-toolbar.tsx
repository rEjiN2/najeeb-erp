import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

interface VoucherToolbarProps {
  title: string;
  description?: ReactNode;
  /** Beside the title — e.g. a status badge. */
  badge?: ReactNode;
  /** Way back to the voucher list. */
  back: { href: string; label: string };
  /** Right-aligned buttons — Save/Print on a form, Edit/Print/Cancel on a view.
   * There is deliberately no Delete: posted vouchers are cancelled, not removed. */
  actions?: ReactNode;
}

/** Title row shared by every voucher's create, view and edit pages. */
export function VoucherToolbar({
  title,
  description,
  badge,
  back,
  actions,
}: VoucherToolbarProps) {
  return (
    <div className="space-y-2">
      <Link
        href={back.href}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm print:hidden"
      >
        <ChevronLeft className="size-4" /> {back.label}
      </Link>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-2xl font-semibold">{title}</h1>
            {badge}
          </div>
          {description ? (
            <div className="text-muted-foreground text-sm">{description}</div>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}
