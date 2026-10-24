"use server";

import { apiSend } from "@/lib/api";
import type { MutationResult } from "@/lib/mutation";
import { runMutation } from "@/lib/run-mutation";

import { COMPANY_PROFILE_PATH } from "./constants";
import {
  COMPANY_TEXT_FIELDS,
  type CompanyProfile,
  type CompanyProfileInput,
} from "./types";

/**
 * PUT /company replaces the whole profile; the backend trims, clears blank
 * optional fields and validates (TRN, email, phone, logo type). Rebuilt
 * field by field because it rejects unknown properties.
 */
export async function saveCompanyProfile(
  input: CompanyProfileInput,
): Promise<MutationResult> {
  const body: Record<string, string | boolean | null> = {};
  for (const field of COMPANY_TEXT_FIELDS) body[field] = input[field];
  body.logoFileRef = input.logoFileRef;
  body.allowSelfApproval = input.allowSelfApproval;
  body.allowNegativeStock = input.allowNegativeStock;
  body.defaultCashInHandAccountId = input.defaultCashInHandAccountId;
  body.defaultChequesInHandAccountId = input.defaultChequesInHandAccountId;
  body.defaultPettyCashAccountId = input.defaultPettyCashAccountId;

  return runMutation(apiSend<CompanyProfile>("PUT", "/company", body), {
    returnTo: COMPANY_PROFILE_PATH,
    forbiddenMessage: "You don't have permission to edit the company profile.",
    successMessage: () => "Company profile saved",
  });
}
