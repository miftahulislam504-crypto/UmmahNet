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
  // NOTE: এই cookie-র JWT validity এখানে verify করা হচ্ছে না (Edge runtime-এ
  // Firebase Admin SDK চলে না)। এটা শুধু client-side redirect guard —
  // real security টা Firestore Rules-এ আছে।
  // Token expiry handle: authService.ts-এ onIdTokenChanged প্রতি ঘণ্টায়
  // নতুন token দিয়ে cookie refresh করে।
  const session = request.cookies.get("un_session");

  if (!session?.value) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Basic JWT structure check (3 parts separated by dots)
  // Full cryptographic verify Edge runtime-এ possible না — Firestore Rules guard করে।
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
