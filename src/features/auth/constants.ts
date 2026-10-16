// Cookies the backend sets (httpOnly) on POST /auth/login. The frontend never
// reads their values — only their presence, in proxy.ts, as a fast pre-check.
export const ACCESS_COOKIE_NAME = "access_token";
export const REFRESH_COOKIE_NAME = "refresh_token";

// Same-origin path the browser uses to reach the backend; next.config.ts
// rewrites it to API_BASE_URL. Under /api so proxy.ts's auth gate skips it.
export const BACKEND_PROXY_PATH = "/api/backend";
