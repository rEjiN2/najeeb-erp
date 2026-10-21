import { Landmark, ScrollText, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";

import type { PaymentMethod } from "./types";

const LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  cheque: "Cheque",
  bank: "Bank",
};

/** How the money moved — derived by the backend from the header account. */
export function PaymentMethodBadge({ method }: { method: PaymentMethod }) {
  const Icon =
    method === "bank" ? Landmark : method === "cheque" ? ScrollText : Wallet;
  return (
    <Badge variant="secondary" className="shrink-0 gap-1 font-normal">
      <Icon className="size-3" />
      {LABELS[method]}
    </Badge>
  );
}
