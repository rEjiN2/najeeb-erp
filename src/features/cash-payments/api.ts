import "server-only";

import { createVoucherApi } from "@/features/vouchers/api";

/** GET /cash-payments, /cash-payments/:id and the "Paid From" accounts. */
export const cashPaymentsApi = createVoucherApi({
  path: "/cash-payments",
  listHeaderKey: "paidFromAccount",
  detailHeaderKey: "paidFromAccountId",
  queryHeaderKey: "paidFromAccountId",
  methodFilter: true,
  scopedLookup: true,
});
