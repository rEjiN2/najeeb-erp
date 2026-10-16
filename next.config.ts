import type { NextConfig } from "next";

import { BACKEND_PROXY_PATH } from "./src/features/auth/constants";

const nextConfig: NextConfig = {
  /**
   * Browser calls to the backend go through this same-origin proxy, never to
   * the backend's own domain. The backend's Set-Cookie then lands on *this*
   * site's domain, where `proxy.ts` and the server-side session check (which
   * forwards the cookie to API_BASE_URL) can see it. Calling the backend
   * directly only works locally, where both run on "localhost" and cookies
   * ignore the port; deployed on two domains, login would succeed but the
   * cookie would be invisible here and every page would bounce to /login.
   */
  async rewrites() {
    const apiBaseUrl = process.env.API_BASE_URL?.replace(/\/+$/, "");
    if (!apiBaseUrl) {
      throw new Error(
        "API_BASE_URL is not set. Add it to .env.local (see .env.example).",
      );
    }
    return [
      {
        source: `${BACKEND_PROXY_PATH}/:path*`,
        destination: `${apiBaseUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
