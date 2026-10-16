export const COMPANY_PROFILE_PATH = "/administration/company-profile";
export const COMPANY_PROFILE_TITLE = "Company Profile";
export const COMPANY_PROFILE_DESCRIPTION =
  "Your company's details, printed on every voucher.";

export const COMPANY_MANAGE_PERMISSION = "company:manage";

/** Entity type of the profile in audit logs and the activity timeline. */
export const COMPANY_ENTITY_TYPE = "company-settings";

/** Image types the backend can embed in a PDF. */
export const LOGO_MIME_TYPES = ["image/png", "image/jpeg"] as const;
/** Backend default upload limit (STORAGE_MAX_FILE_SIZE_MB). It rejects
 * anything bigger itself; this only saves a pointless upload. */
export const LOGO_MAX_BYTES = 10 * 1024 * 1024;
