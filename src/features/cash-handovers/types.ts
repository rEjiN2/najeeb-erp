import type { VoucherSaveResult } from "@/features/vouchers/types";

/** What the handover form submits (dto/cash-handover.dto.ts). */
export interface HandoverInput {
  voucherDate: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  handedByCashierId: string;
  receivedByCashierId: string;
  reference: string;
  notes: string;
}

export type CreateHandoverAction = (
  input: HandoverInput,
  acknowledgeWarnings: boolean,
) => Promise<VoucherSaveResult>;

export type UpdateHandoverAction = (
  id: string,
  input: HandoverInput,
  changeNote: string,
  acknowledgeWarnings: boolean,
) => Promise<VoucherSaveResult>;
