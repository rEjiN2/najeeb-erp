import { NextResponse, type NextRequest } from "next/server";

import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
} from "@/features/auth/constants";

const PUBLIC_ROUTES = new Set(["/login"]);

/**
 * Optimistic auth gate: checks backend cookie presence only (no session
 * lookup) so visitors with no session at all never render a protected page.
 * The `(protected)` layout re-checks the real session via GET /auth/me —
 * this is the fast path, not the source of truth.
 *
 * Deliberately no "has cookie on /login → /dashboard" redirect here: a cookie
 * can outlive its session (expired JWT), and the protected layout would send
 * that user straight back to /login — a redirect loop. The login page does
 * that redirect itself after a real session check.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSessionCookie =
    request.cookies.has(ACCESS_COOKIE_NAME) ||
    request.cookies.has(REFRESH_COOKIE_NAME);

  if (!hasSessionCookie && !PUBLIC_ROUTES.has(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Also skips public/ static assets (images, fonts, etc.) by extension —
  // without this, unauthenticated pages like /login couldn't load their own
  // background image, since the gate would redirect the asset request too.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|css|js|woff|woff2|ttf)$).*)",
  ],
};
