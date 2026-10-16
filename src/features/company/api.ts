import "server-only";

import { hasPermission } from "@/features/auth/session";
import { apiGet, type ApiResult } from "@/lib/api";

import { COMPANY_MANAGE_PERMISSION } from "./constants";
import type { CompanyProfile } from "./types";

export function getCompanyProfile(): Promise<ApiResult<CompanyProfile>> {
  return apiGet<CompanyProfile>("/company");
}

export function canManageCompany(): Promise<boolean> {
  return hasPermission(COMPANY_MANAGE_PERMISSION);
}
