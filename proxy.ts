import { NextRequest, NextResponse } from "next/server";

function log(req: NextRequest, status: string, ms: number) {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.nextUrl.pathname} → ${status} (${ms}ms)`);
}

export async function proxy(req: NextRequest) {
  const start = Date.now();
  const isLoginPage = req.nextUrl.pathname === "/login";
  const isAuthApi = req.nextUrl.pathname.startsWith("/api/auth");

  if (isAuthApi) {
    log(req, "PASS (auth api)", Date.now() - start);
    return NextResponse.next();
  }

  const hasCookie = req.cookies.has("lamees_session");

  if (!hasCookie && !isLoginPage) {
    log(req, "REDIRECT /login", Date.now() - start);
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (hasCookie && isLoginPage) {
    log(req, "REDIRECT /", Date.now() - start);
    return NextResponse.redirect(new URL("/", req.url));
  }

  log(req, "PASS", Date.now() - start);
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico|sitemap.xml|robots.txt).*)"],
};