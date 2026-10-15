import { CircleAlert } from "lucide-react";

interface FormErrorSummaryProps {
  messages: string[];
  title?: string;
}

/** Form-level errors from the backend that don't belong to a single field. */
export function FormErrorSummary({
  messages,
  title = "Couldn't save",
}: FormErrorSummaryProps) {
  if (messages.length === 0) return null;

  return (
    <div
      role="alert"
      className="border-destructive/30 bg-destructive/5 text-destructive flex gap-2.5 rounded-lg border p-3 text-sm"
    >
      <CircleAlert className="mt-0.5 size-4 shrink-0" />
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        {messages.length === 1 ? (
          <p className="text-destructive/90">{messages[0]}</p>
        ) : (
          <ul className="text-destructive/90 list-disc space-y-0.5 pl-4">
            {messages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** Inline message under a single field. */
export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-destructive text-sm">
      {message}
    </p>
  );
}
