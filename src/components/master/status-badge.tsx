import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type MasterStatus = "Active" | "Inactive";

export function StatusBadge({ status }: { status: MasterStatus }) {
  const isActive = status === "Active";

  return (
    <Badge
      variant="outline"
      className={cn(
        isActive ? "border-success/30 text-success" : "text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          isActive ? "bg-success" : "bg-muted-foreground",
        )}
      />
      {status}
    </Badge>
  );
}
