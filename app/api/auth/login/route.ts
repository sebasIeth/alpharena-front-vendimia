import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Only mark cookie as Secure when the request is actually over HTTPS.
// A Secure cookie set on an HTTP origin is accepted by browsers but then
// not sent back on HTTP requests — causing 401s on every subsequent call.
function isHttps(req: NextRequest): boolean {
  return (
    req.headers.get("x-forwarded-proto") === "https" ||
    req.nextUrl.protocol === "https:"
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    // Set httpOnly cookie with the token
    const response = NextResponse.json({ user: data.user });
    response.cookies.set("arena_token", data.token, {
      httpOnly: true,
      secure: isHttps(req),
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days (matches JWT expiry)
    });
    return response;
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Login failed" }, { status: 500 });
  }
}
