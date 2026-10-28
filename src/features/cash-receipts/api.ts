import "server-only";

import { createVoucherApi } from "@/features/vouchers/api";

/** GET /cash-receipts, /cash-receipts/:id and the "Received Into" accounts. */
export const cashReceiptsApi = createVoucherApi({
  path: "/cash-receipts",
  listQuery: { kind: "standard" },
  listHeaderKey: "cashAccount",
  detailHeaderKey: "cashAccountId",
  queryHeaderKey: "cashAccountId",
  methodFilter: true,
  // Explicit money types already keep parties out.
  scopedLookup: false,
  headerAccountTypes: ["cash", "wallet", "cheque", "bank"],
});

/** Same endpoint, reference receipts only. */
export const referenceReceiptsApi = createVoucherApi({
  path: "/cash-receipts",
  listQuery: { kind: "reference" },
  listHeaderKey: "cashAccount",
  detailHeaderKey: "cashAccountId",
  queryHeaderKey: "cashAccountId",
  methodFilter: true,
  scopedLookup: false,
  headerAccountTypes: ["cash", "wallet", "cheque", "bank"],
});
