import "server-only";

import { createVoucherApi } from "@/features/vouchers/api";

/** GET /cash-receipts, /cash-receipts/:id and the "Received Into" accounts. */
export const cashReceiptsApi = createVoucherApi({
  path: "/cash-receipts",
  listHeaderKey: "cashAccount",
  detailHeaderKey: "cashAccountId",
  queryHeaderKey: "cashAccountId",
  methodFilter: false,
  // Explicit money types already keep parties out.
  scopedLookup: false,
  headerAccountTypes: ["cash", "wallet", "cheque", "bank"],
});
