// Mirrors the backend's company module (company.service.ts CompanySettingsView,
// dto/update-company-settings.dto.ts). Dates arrive as ISO strings.

export const COMPANY_TEXT_FIELDS = [
  "legalName",
  "tradeName",
  "addressLine1",
  "addressLine2",
  "city",
  "country",
  "phone",
  "email",
  "website",
  "trn",
  "currencyCode",
  "receiptFooterText",
] as const;
export type CompanyTextField = (typeof COMPANY_TEXT_FIELDS)[number];

/** GET /company and PUT /company response. */
export interface CompanyProfile extends Record<
  CompanyTextField,
  string | null
> {
  id: string;
  legalName: string;
  currencyCode: string;
  /** Fetch the image through GET /files/:id. */
  logo: { id: string; url: string } | null;
  allowSelfApproval: boolean;
  /** Handover defaults: where cash (cash/wallet) and cheques are received. */
  defaultCashInHandAccountId: string | null;
  defaultChequesInHandAccountId: string | null;
  updatedBy: { id: string; name: string } | null;
  updatedAt: string | null;
}

/** PUT body: the whole profile. Blank optional fields are cleared. */
export type CompanyProfileInput = Record<CompanyTextField, string> & {
  logoFileRef: string | null;
  /** Sent back unchanged: the PUT turns an omitted one off. */
  allowSelfApproval: boolean;
  defaultCashInHandAccountId: string | null;
  defaultChequesInHandAccountId: string | null;
};

/** POST /files/upload response. */
export interface StoredFile {
  id: string;
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
}
