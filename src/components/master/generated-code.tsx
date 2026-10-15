import { Hash } from "lucide-react";

/**
 * Backend-generated record code. Read-only text on edit (never an input, and
 * never sent back); on create there's no code yet, so it says one will come.
 */
export function GeneratedCode({ code }: { code: string | null }) {
  if (!code) {
    return (
      <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
        <Hash className="size-3.5 shrink-0" />A code is generated automatically
        when you save.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <p className="text-sm font-medium">Code</p>
      <p className="bg-muted/50 text-muted-foreground rounded-md border px-2.5 py-2 font-mono text-sm">
        {code}
      </p>
    </div>
  );
}
