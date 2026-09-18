import { Button } from "@/components/ui/button";
import { SheetClose, SheetFooter } from "@/components/ui/sheet";

interface MasterFormFooterProps {
  submitLabel?: string;
}

export function MasterFormFooter({
  submitLabel = "Save",
}: MasterFormFooterProps) {
  return (
    <SheetFooter className="flex-row justify-end gap-2 border-t p-4">
      <SheetClose
        render={
          <Button type="button" variant="outline">
            Cancel
          </Button>
        }
      />
      <Button type="submit">{submitLabel}</Button>
    </SheetFooter>
  );
}
