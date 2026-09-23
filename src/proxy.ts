import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  BYPASS_COOKIE,
  BYPASS_PARAM,
  bypassToken,
  isMaintenanceEnabled,
  maintenancePage,
} from "@/lib/maintenance";

const SESSION_COOKIE = "nextera_session";
const APP_BASE = "/crm";
const LOGIN_PATH = "/login";
const BYPASS_MAX_AGE = 60 * 60 * 12;

function maintenanceResponse(pathname: string) {
  const headers = {
    "Cache-Control": "no-store, must-revalidate",
    "Retry-After": "120",
  };

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Ведутся технические работы. Попробуйте через несколько минут." },
      { status: 503, headers },
    );
  }

  return new NextResponse(maintenancePage(), {
    status: 503,
    headers: { ...headers, "Content-Type": "text/html; charset=utf-8" },
  });
}

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (isMaintenanceEnabled()) {
    const token = bypassToken();

    // Переход по ?maintenance_bypass=<токен> запоминает доступ в cookie.
    if (token && searchParams.get(BYPASS_PARAM) === token) {
      const url = request.nextUrl.clone();
      url.searchParams.delete(BYPASS_PARAM);
      const response = NextResponse.redirect(url);
      response.cookies.set(BYPASS_COOKIE, token, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: BYPASS_MAX_AGE,
      });
      return response;
    }

    const hasBypass = Boolean(token) && request.cookies.get(BYPASS_COOKIE)?.value === token;
    if (!hasBypass) {
      return maintenanceResponse(pathname);
    }
  }

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
    // Заглушка техработ должна закрывать и /api, поэтому исключаем только статику.
    "/((?!_next/static|_next/image|favicon.ico|uploads).*)",
  ],
};
