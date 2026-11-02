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
  if (!session) return redirectToLogin(request);

  if (pathname === "/admin") {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/admin/:path*"],
};
