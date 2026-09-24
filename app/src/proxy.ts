import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const authorized = await verifySessionToken(
    request.cookies.get(SESSION_COOKIE)?.value,
  );

  if (authorized) return NextResponse.next();

  const login = new URL("/login", request.url);
  const response = NextResponse.redirect(login);
  // Drop a stale or tampered cookie so the login page starts clean.
  response.cookies.delete(SESSION_COOKIE);
  return response;
}

export const config = {
  // Everything except the login route, the app icons, and Next's static assets.
  // The icons must stay public: the browser fetches them for the login page too.
  matcher: [
    "/((?!login|icon.png|apple-icon.png|manifest.webmanifest|_next/static|_next/image|favicon.ico).*)",
  ],
};
