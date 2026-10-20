import { Badge } from "@/components/ui/badge";

import { STAFF_TYPE_LABELS, type StaffType } from "./types";

export function StaffTypeBadge({ type }: { type: StaffType | null | undefined }) {
  if (!type) return null;
  return <Badge variant="outline">{STAFF_TYPE_LABELS[type]}</Badge>;
}
