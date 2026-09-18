import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

interface MasterPageHeaderProps {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}

export function MasterPageHeader({
  title,
  description,
  actionLabel,
  onAction,
}: MasterPageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="font-heading text-2xl font-semibold">{title}</h1>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      <Button onClick={onAction}>
        <Plus /> {actionLabel}
      </Button>
    </div>
  );
}
