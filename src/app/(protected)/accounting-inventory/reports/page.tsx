import { redirect } from "next/navigation";

import { SALESMAN_COLLECTIONS_PATH } from "@/features/reports/salesman-collections/constants";

/** The only report so far; the menu lists reports under their own group. */
export default function ReportsPage() {
  redirect(SALESMAN_COLLECTIONS_PATH);
}
