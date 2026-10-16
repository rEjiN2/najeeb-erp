"use client";

import { useState } from "react";

/**
 * Editing state for a Voucher/Transaction form: header fields plus a list of
 * lines, and whether anything differs from what the form opened with (for
 * the unsaved-changes warning). Saving is the caller's job — a Server Action.
 */
export function useVoucherDraft<
  TVoucher extends { lines: TLine[] },
  TLine extends { id: string },
>(initial: TVoucher) {
  const [baseline] = useState(() => JSON.stringify(initial));
  const [voucher, setVoucher] = useState<TVoucher>(initial);

  function updateVoucher(patch: Partial<Omit<TVoucher, "lines">>) {
    setVoucher((prev) => ({ ...prev, ...patch }));
  }

  function addLine(line: TLine) {
    setVoucher((prev) => ({ ...prev, lines: [...prev.lines, line] }));
  }

  function updateLine(lineId: string, patch: Partial<TLine>) {
    setVoucher((prev) => ({
      ...prev,
      lines: prev.lines.map((line) =>
        line.id === lineId ? { ...line, ...patch } : line,
      ),
    }));
  }

  function removeLine(lineId: string) {
    setVoucher((prev) => ({
      ...prev,
      lines: prev.lines.filter((line) => line.id !== lineId),
    }));
  }

  return {
    voucher,
    isDirty: JSON.stringify(voucher) !== baseline,
    updateVoucher,
    addLine,
    updateLine,
    removeLine,
  };
}
