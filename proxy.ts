import { NextRequest, NextResponse } from "next/server";

function log(req: NextRequest, status: string, ms: number) {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.nextUrl.pathname} → ${status} (${ms}ms)`);
}

function addSecurityHeaders(response: NextResponse) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  
  // CSP header — adjust as needed for your resources
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
  );

  return response;
}

export async function proxy(req: NextRequest) {
  const start = Date.now();
  const isLoginPage = req.nextUrl.pathname === "/login";
  const isAuthApi = req.nextUrl.pathname.startsWith("/api/auth");

  if (isAuthApi) {
    log(req, "PASS (auth api)", Date.now() - start);
    const res = NextResponse.next();
    return addSecurityHeaders(res);
  }

  const hasCookie = req.cookies.has("lamees_session");

  if (!hasCookie && !isLoginPage) {
    log(req, "REDIRECT /login", Date.now() - start);
    const res = NextResponse.redirect(new URL("/login", req.url));
    return addSecurityHeaders(res);
  }

  if (hasCookie && isLoginPage) {
    log(req, "REDIRECT /", Date.now() - start);
    const res = NextResponse.redirect(new URL("/", req.url));
    return addSecurityHeaders(res);
  }

  log(req, "PASS", Date.now() - start);
  const res = NextResponse.next();
  return addSecurityHeaders(res);
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico|sitemap.xml|robots.txt).*)"],
};