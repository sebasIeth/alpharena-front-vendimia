import { NextRequest, NextResponse } from "next/server";

const SOLANA_RPC_URL = process.env.SOLANA_RPC_INTERNAL || process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const res = await fetch(SOLANA_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "RPC proxy error" },
      { status: 502 }
    );
  }
}
