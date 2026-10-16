import "server-only";

import type { VoucherModule } from "@/features/vouchers/routes";

import {
  cancelCashReceipt,
  createCashReceipt,
  updateCashReceipt,
} from "./actions";
import { cashReceiptsApi } from "./api";
import { CASH_RECEIPT_CONFIG } from "./constants";

export const CASH_RECEIPTS_MODULE: VoucherModule = {
  config: CASH_RECEIPT_CONFIG,
  api: cashReceiptsApi,
  createAction: createCashReceipt,
  updateAction: updateCashReceipt,
  cancelAction: cancelCashReceipt,
};
