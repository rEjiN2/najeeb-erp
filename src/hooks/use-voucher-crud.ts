"use client";

import { useState } from "react";

interface UseVoucherCrudOptions<
  TVoucher extends { id: string; lines: TLine[] },
  TLine extends { id: string },
> {
  /** Previously saved vouchers (mock, in-memory — no backend yet). */
  initialVouchers: TVoucher[];
  /** Builds a blank draft voucher, given the next voucher number to use. */
  createBlank: (voucherNo: string) => TVoucher;
  /** Computes the next voucher number from what's already saved. */
  nextVoucherNo: (vouchers: TVoucher[]) => string;
}

/**
 * Generic CRUD + editing state for a Voucher/Transaction screen: a single
 * "current draft" (new or loaded from the saved list) plus New/Save/Delete/
 * Search lifecycle around it. In-memory only, but the shape (vouchers/save/
 * delete/load) is what a real API-backed version would keep.
 */
export function useVoucherCrud<
  TVoucher extends { id: string; lines: TLine[] },
  TLine extends { id: string },
>({
  initialVouchers,
  createBlank,
  nextVoucherNo,
}: UseVoucherCrudOptions<TVoucher, TLine>) {
  const [vouchers, setVouchers] = useState<TVoucher[]>(initialVouchers);
  const [voucher, setVoucher] = useState<TVoucher>(() =>
    createBlank(nextVoucherNo(initialVouchers)),
  );
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const isSaved = vouchers.some((saved) => saved.id === voucher.id);

  function updateVoucher(patch: Partial<TVoucher>) {
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

  function newVoucher() {
    setVoucher(createBlank(nextVoucherNo(vouchers)));
  }

  function save() {
    setVouchers((prev) => {
      const exists = prev.some((saved) => saved.id === voucher.id);
      return exists
        ? prev.map((saved) => (saved.id === voucher.id ? voucher : saved))
        : [...prev, voucher];
    });
  }

  function loadVoucher(id: string) {
    const found = vouchers.find((saved) => saved.id === id);
    if (found) setVoucher(found);
    setIsSearchOpen(false);
  }

  function requestDelete() {
    setIsDeleteOpen(true);
  }

  function cancelDelete() {
    setIsDeleteOpen(false);
  }

  function confirmDelete() {
    setVouchers((prev) => prev.filter((saved) => saved.id !== voucher.id));
    setIsDeleteOpen(false);
    newVoucher();
  }

  return {
    vouchers,
    voucher,
    isSaved,
    updateVoucher,
    addLine,
    updateLine,
    removeLine,
    newVoucher,
    save,
    loadVoucher,
    isSearchOpen,
    setIsSearchOpen,
    isDeleteOpen,
    requestDelete,
    cancelDelete,
    confirmDelete,
  };
}
