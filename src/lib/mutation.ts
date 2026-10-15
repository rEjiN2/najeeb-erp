/**
 * What a master-screen Server Action hands back to the client. Messages are
 * already user-facing (the backend's own validation text, or a specific
 * permission/connectivity message) — the client never invents its own.
 */
export type MutationResult =
  | {
      ok: true;
      /** Shown as a success toast, e.g. "Warehouse WH-0003 created". */ message?: string;
    }
  | {
      ok: false;
      messages: string[];
      /** Backend HTTP status, when there was one — lets a screen offer a
       * specific way out (e.g. "Deactivate instead" on a 409). */
      status?: number;
    };

export interface GroupedErrors<F extends string> {
  fields: Partial<Record<F, string>>;
  /** Messages that don't belong to any one field — shown above the form. */
  general: string[];
}

/**
 * Routes backend messages to the form field they're about. The backend only
 * sends plain strings (class-validator text starts with the property name;
 * service errors mention "code", "parent", ...), so each field supplies a
 * pattern; first match wins, unmatched messages stay form-level.
 */
export function groupErrors<F extends string>(
  messages: string[],
  matchers: ReadonlyArray<readonly [F, RegExp]>,
): GroupedErrors<F> {
  const fields: Partial<Record<F, string>> = {};
  const general: string[] = [];

  for (const message of messages) {
    const match = matchers.find(([, pattern]) => pattern.test(message));
    if (match && !fields[match[0]]) {
      fields[match[0]] = message;
    } else {
      general.push(message);
    }
  }

  return { fields, general };
}
