import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("arena_token")?.value;
  if (!token) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    if (!res.ok) {
      // Token invalid — clear the cookie
      const response = NextResponse.json(data, { status: res.status });
      if (res.status === 401) {
        response.cookies.set("arena_token", "", { httpOnly: true, path: "/", maxAge: 0 });
      }
      return response;
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Auth check failed" }, { status: 500 });
  }
}
