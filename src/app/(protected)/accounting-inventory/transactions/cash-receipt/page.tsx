import { permanentRedirect } from "next/navigation";

import { CASH_RECEIPTS_PATH } from "@/features/cash-receipts/constants";

/** Old single-screen route; kept so bookmarks land on the new list. */
export default function Page() {
  permanentRedirect(CASH_RECEIPTS_PATH);
}
