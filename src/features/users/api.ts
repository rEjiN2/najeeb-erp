import "server-only";

import { apiGet, type ApiResult } from "@/lib/api";

export interface UserLookupItem {
  id: string;
  name: string;
}

/** Every user, inactive ones included (GET /users/lookup). */
export function getUsers(): Promise<ApiResult<UserLookupItem[]>> {
  return apiGet<UserLookupItem[]>("/users/lookup");
}
