import { ListTree } from "lucide-react";

import { Button } from "@/components/ui/button";

interface AllocationButtonProps {
  label?: string;
}

/**
 * Placeholder for bill-wise allocation — present on every voucher type that
 * will eventually need it (Receipt, Payment, ...), deliberately inert for
 * now. Keeping it in place means wiring the real behavior later is a
 * one-file change to this component, not a layout change on every voucher
 * screen that uses it.
 */
export function AllocationButton({
  label = "Allocation (F3)",
}: AllocationButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      disabled
      title="Bill-wise allocation isn't wired up yet"
    >
      <ListTree /> {label}
    </Button>
  );
}
