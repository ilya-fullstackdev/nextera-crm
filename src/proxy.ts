import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "nextera_session";
const APP_BASE = "/crm";
const LOGIN_PATH = "/login";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const isAppPath = pathname === APP_BASE || pathname.startsWith(`${APP_BASE}/`);
  const isLoginPath = pathname === LOGIN_PATH;

  if (!hasSession && isAppPath) {
    const url = new URL(LOGIN_PATH, request.url);
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  if (hasSession && isLoginPath) {
    return NextResponse.redirect(new URL(APP_BASE, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|uploads).*)",
  ],
};
