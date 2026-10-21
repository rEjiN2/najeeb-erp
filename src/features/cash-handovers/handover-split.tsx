import { Banknote, Landmark, ReceiptText, ScrollText } from "lucide-react";

import { formatAmount } from "@/lib/format";

/**
 * What a handover holds, by how it was collected: one strip on the Hand Over
 * form and on the handover the office approves.
 */
export function HandoverSplit({
  cash,
  cheque,
  bank,
  expenses,
  label = "Handing over",
}: {
  cash: number;
  cheque: number;
  bank: number;
  expenses: number;
  label?: string;
}) {
  const parts = [
    { title: "Cash in hand", value: cash, icon: Banknote },
    { title: "Cheques", value: cheque, icon: ScrollText },
    { title: "Bank transfers", value: bank, icon: Landmark },
    { title: "Expenses (bills)", value: expenses, icon: ReceiptText },
  ];
  return (
    <div className="bg-card grid grid-cols-2 gap-4 rounded-lg border p-4 sm:grid-cols-5">
      {parts.map(({ title, value, icon: Icon }) => (
        <div key={title}>
          <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
            <Icon className="size-3.5" /> {title}
          </p>
          <p className="font-mono text-lg font-semibold tabular-nums">
            {formatAmount(value)}
          </p>
        </div>
      ))}
      <div className="col-span-2 sm:col-span-1 sm:text-right">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {label}
        </p>
        <p className="font-mono text-lg font-semibold tabular-nums">
          {formatAmount(cash + cheque + bank)}
        </p>
      </div>
    </div>
  );
}
