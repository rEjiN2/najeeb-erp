import "server-only";

import type { VoucherModule } from "@/features/vouchers/routes";

import {
  cancelCashPayment,
  createCashPayment,
  updateCashPayment,
} from "./actions";
import { cashPaymentsApi } from "./api";
import { CASH_PAYMENT_CONFIG } from "./constants";
import { canManageCashPayments } from "./permissions";

export const CASH_PAYMENTS_MODULE: VoucherModule = {
  config: CASH_PAYMENT_CONFIG,
  api: cashPaymentsApi,
  canManage: canManageCashPayments,
  createAction: createCashPayment,
  updateAction: updateCashPayment,
  cancelAction: cancelCashPayment,
};
