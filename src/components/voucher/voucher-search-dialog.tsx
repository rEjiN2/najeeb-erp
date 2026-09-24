import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface VoucherSearchDialogProps<TVoucher extends { id: string }> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vouchers: TVoucher[];
  onSelect: (id: string) => void;
  getLabel: (voucher: TVoucher) => string;
  getMeta: (voucher: TVoucher) => string;
  emptyMessage?: string;
}

export function VoucherSearchDialog<TVoucher extends { id: string }>({
  open,
  onOpenChange,
  vouchers,
  onSelect,
  getLabel,
  getMeta,
  emptyMessage = "No saved vouchers yet.",
}: VoucherSearchDialogProps<TVoucher>) {
  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search vouchers"
      description="Pick a saved voucher to open it"
    >
      <CommandInput placeholder="Search by voucher no..." />
      <CommandList>
        <CommandEmpty>{emptyMessage}</CommandEmpty>
        <CommandGroup>
          {vouchers.map((voucher) => (
            <CommandItem
              key={voucher.id}
              value={getLabel(voucher)}
              onSelect={() => onSelect(voucher.id)}
            >
              <span className="flex-1">{getLabel(voucher)}</span>
              <span className="text-muted-foreground text-xs">
                {getMeta(voucher)}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
