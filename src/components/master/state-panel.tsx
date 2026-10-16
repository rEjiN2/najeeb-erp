import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Centered icon + message panel for empty, error and permission states.
 * Deliberately not a client component: server pages pass it an icon
 * component, which can't cross the server→client boundary as a prop.
 */
export function StatePanel({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-10 text-center">
      <div className="bg-muted text-muted-foreground flex size-11 items-center justify-center rounded-full">
        <Icon className="size-5" />
      </div>
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        <p className="text-muted-foreground max-w-sm text-sm">{children}</p>
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
