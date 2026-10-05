import { FlaskConical } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Marks a dashboard widget whose numbers still come from mock-data.ts, so
 * anyone viewing the build (client included) can tell real figures from
 * placeholders. Remove from a widget once it's wired to the backend.
 */
export function DemoDataBadge({ className }: { className?: string }) {
  return (
    <Badge
      variant="outline"
      title="Sample figures — not connected to live data yet"
      className={cn(
        "border-amber-500/40 bg-amber-500/10 align-middle text-amber-700 dark:text-amber-400",
        className,
      )}
    >
      <FlaskConical data-icon="inline-start" />
      Demo data
    </Badge>
  );
}
