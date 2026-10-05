// Cookies the backend sets (httpOnly) on POST /auth/login. The frontend never
// reads their values — only their presence, in proxy.ts, as a fast pre-check.
export const ACCESS_COOKIE_NAME = "access_token";
export const REFRESH_COOKIE_NAME = "refresh_token";
