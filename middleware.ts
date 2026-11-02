import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, verifySessionToken } from "@/lib/auth/token";

/**
 * Edge gate for the private Studio.
 *
 * This is a fast first check (valid signature + unexpired). Authorisation is
 * re-verified server-side inside every admin page and API route, so a stolen
 * or forged cookie can never reach data on its own.
 */

function safeSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

/**
 * Defence in depth for state-changing Studio calls: browsers send Origin (and
 * Sec-Fetch-Site) on cross-site POSTs, so a request that does not belong to us
 * is refused before it reaches a route handler.
 */
function isCrossSite(request: NextRequest) {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return false;

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") return true;

  const origin = request.headers.get("origin");
  if (!origin) return false;

  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host") || request.nextUrl.host;
  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

function withNoIndex(response: NextResponse) {
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return response;
}

function redirectToLogin(request: NextRequest) {
  const url = request.nextUrl.clone();
  // Preserve the full requested Studio URL (path + filters) so the owner lands
  // back on the exact view after signing in.
  const target = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  url.pathname = "/admin/login";
  url.search = `?next=${encodeURIComponent(target)}`;
  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  const secret = safeSecret();
  const session = token && secret ? await verifySessionToken(token, secret) : null;

  const isApi = pathname.startsWith("/api/admin");
  const isLoginRoute = pathname === "/admin/login";

  if (isApi) {
    if (isCrossSite(request)) {
      return NextResponse.json({ ok: false, error: "Request origin rejected." }, { status: 403 });
    }
    // Sign-in and sign-out must work without a (valid) session: the logout
    // route's whole job is clearing a cookie that may already be expired.
    if (pathname === "/api/admin/login" || pathname === "/api/admin/logout") return NextResponse.next();
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Not authorised. Please sign in to the Owner Studio." },
        { status: 401 },
      );
    }
    return NextResponse.next();
  }

  if (isLoginRoute) {
    if (session) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // /admin and every nested Studio route
  if (!session) return withNoIndex(redirectToLogin(request));

  if (pathname === "/admin") {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/dashboard";
    return withNoIndex(NextResponse.redirect(url));
  }

  return withNoIndex(NextResponse.next());
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/admin/:path*"],
};
