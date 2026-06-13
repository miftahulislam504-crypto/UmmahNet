import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Pages that don't need auth
const PUBLIC_PATHS = ["/login", "/register", "/forgot-password"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths through
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Firebase auth state lives in browser — we use a session cookie for SSR guard.
  // NOTE: this cookie's JWT validity is not verified here (the Firebase
  // Admin SDK does not run in the Edge runtime). This is only a client-side redirect guard —
  // real security is enforced by Firestore Rules.
  // Token expiry is handled by onIdTokenChanged in authService.ts, which
  // refreshes the cookie with a new token every hour.
  const session = request.cookies.get("un_session");

  if (!session?.value) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Basic JWT structure check (3 parts separated by dots)
  // Full cryptographic verification isn't possible in the Edge runtime — Firestore Rules guard it.
  const parts = session.value.split(".");
  if (parts.length !== 3) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api).*)",
  ],
};
