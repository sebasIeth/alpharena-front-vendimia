import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  // Only intercept /api/backend/* requests (the backend proxy)
  if (req.nextUrl.pathname.startsWith("/api/backend")) {
    const token = req.cookies.get("arena_token")?.value;
    if (token) {
      // Clone headers and inject Authorization
      const headers = new Headers(req.headers);
      if (!headers.get("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      return NextResponse.rewrite(req.nextUrl, { request: { headers } });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/backend/:path*"],
};
