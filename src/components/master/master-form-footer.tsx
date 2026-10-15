import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SheetClose, SheetFooter } from "@/components/ui/sheet";

interface MasterFormFooterProps {
  submitLabel?: string;
  /** Save in flight — disables both buttons and shows a spinner. */
  pending?: boolean;
}

export function MasterFormFooter({
  submitLabel = "Save",
  pending = false,
}: MasterFormFooterProps) {
  return (
    <SheetFooter className="flex-row justify-end gap-2 border-t p-4">
      <SheetClose
        disabled={pending}
        render={
          <Button type="button" variant="outline">
            Cancel
          </Button>
        }
      />
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        {pending ? "Saving..." : submitLabel}
      </Button>
    </SheetFooter>
  );
}
