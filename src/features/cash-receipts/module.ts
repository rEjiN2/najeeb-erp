import "server-only";

import { createElement } from "react";

import { UnsettledBanner } from "@/features/cash-handovers/unsettled-banner";
import type {
  VoucherModule,
  VoucherReadModule,
} from "@/features/vouchers/routes";

import {
  cancelCashReceipt,
  cancelReferenceReceipt,
  createCashReceipt,
  createReferenceReceipt,
  updateCashReceipt,
  updateReferenceReceipt,
} from "./actions";
import { cashReceiptsApi, referenceReceiptsApi } from "./api";
import { CASH_RECEIPT_CONFIG, REFERENCE_RECEIPT_CONFIG } from "./constants";

export const CASH_RECEIPTS_MODULE: VoucherModule &
  Pick<VoucherReadModule, "listBanner"> = {
  config: CASH_RECEIPT_CONFIG,
  api: cashReceiptsApi,
  createAction: createCashReceipt,
  updateAction: updateCashReceipt,
  cancelAction: cancelCashReceipt,
  // A salesman's pending cash and cheques, and the way to hand them over.
  listBanner: async () => createElement(UnsettledBanner),
};

export const REFERENCE_RECEIPTS_MODULE: VoucherModule = {
  config: REFERENCE_RECEIPT_CONFIG,
  api: referenceReceiptsApi,
  createAction: createReferenceReceipt,
  updateAction: updateReferenceReceipt,
  cancelAction: cancelReferenceReceipt,
};
