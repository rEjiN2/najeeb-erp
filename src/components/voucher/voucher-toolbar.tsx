import { Plus, Printer, Save, Search, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

interface VoucherToolbarProps {
  title: string;
  description: string;
  onNew: () => void;
  onSave: () => void;
  onPrint: () => void;
  onDelete: () => void;
  onSearch: () => void;
  /** Delete is disabled for an unsaved draft — nothing to delete yet. */
  isDeleteDisabled?: boolean;
}

export function VoucherToolbar({
  title,
  description,
  onNew,
  onSave,
  onPrint,
  onDelete,
  onSearch,
  isDeleteDisabled = false,
}: VoucherToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="font-heading text-2xl font-semibold">{title}</h1>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={onNew}>
          <Plus /> New
        </Button>
        <Button variant="outline" onClick={onSearch}>
          <Search /> Search
        </Button>
        <Button variant="outline" onClick={onPrint}>
          <Printer /> Print
        </Button>
        <Button
          variant="outline"
          onClick={onDelete}
          disabled={isDeleteDisabled}
        >
          <Trash2 /> Delete
        </Button>
        <Button onClick={onSave}>
          <Save /> Save
        </Button>
      </div>
    </div>
  );
}
