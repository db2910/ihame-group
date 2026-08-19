import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionCookie } from "@/lib/auth/session-cookie";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

// Optimistic, cookie-only check (no DB call — proxy runs on every request,
// including prefetches). This only exists to bounce obviously-signed-out
// visitors before a page renders; it is never the source of truth. The real,
// revocable, DB-backed check lives in src/lib/auth/dal.ts and runs on every
// protected Server Component and Server Action regardless of what happens
// here — see that file's comments and the Next.js proxy docs' own warning
// that Server Functions can silently lose Proxy coverage on a route change.
//
// Deliberately one-directional: a valid *signature* is enough to let a request
// through to the real check, but never enough to redirect someone INTO the app.
// The cookie lives for the 12h absolute timeout while the DB session dies after
// 30 min idle (or on revocation/deactivation), so for most of that window the
// cookie verifies here but resolves to "signed out" in the DAL. Bouncing
// /login -> / on the strength of the cookie alone made those two layers
// disagree in a cycle: proxy sent /login to /, the page's DAL check sent / back
// to /login, and the browser gave up with ERR_TOO_MANY_REDIRECTS — locking the
// user out of the login page entirely. Signed-in users are still redirected off
// /login; that decision just belongs to the login page, which knows whether the
// session is actually alive.
const PUBLIC_ROUTES = new Set(["/login"]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_ROUTES.has(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const payload = token ? await verifySessionCookie(token) : null;

  if (!payload) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    // Drop a cookie that's expired or otherwise unverifiable so it stops
    // riding along on every subsequent request.
    if (token) {
      response.cookies.delete(SESSION_COOKIE_NAME);
    }
    return response;
  }

  return NextResponse.next();
}

export const config = {
  // Excludes all of /_next, not just static/image: /_next/hmr and friends are
  // Next's own dev endpoints and have no business being auth-redirected.
  // sw.js/manifest.webmanifest/icon-*.png (Phase 7 PWA) need the same
  // treatment for a more specific reason than "shouldn't be redirected for
  // UX": browsers hard-refuse to register a service worker whose script
  // response is a redirect (SecurityError), so redirecting sw.js to /login
  // for a logged-out visitor doesn't just look wrong, it silently breaks
  // registration outright — confirmed live (Phase 7 offline-queue testing).
  // opengraph-image needs the same exclusion for the same class of reason:
  // WhatsApp/Slack/X/etc.'s link-preview crawlers fetch it with no session
  // cookie at all, so without this they'd get redirected to the login page's
  // HTML instead of the actual share image — confirmed live the same way.
  matcher: [
    "/((?!_next/|assets/|favicon.ico|sw.js|manifest.webmanifest|icon-192x192.png|icon-512x512.png|opengraph-image).*)",
  ],
};
