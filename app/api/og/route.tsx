import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const matchId = searchParams.get("matchId");
  const gameType = searchParams.get("gameType");
  const status = searchParams.get("status");
  const agentA = searchParams.get("agentA");
  const agentB = searchParams.get("agentB");

  // If no match info provided, return default OG image
  if (!matchId && !agentA) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#F5F0EB",
            backgroundImage:
              "linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        >
          {/* Card */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#FFFFFF",
              borderRadius: "24px",
              padding: "60px 80px",
              border: "1px solid #D4D0C8",
              boxShadow: "0 10px 25px -3px rgba(0,0,0,0.08)",
            }}
          >
            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", marginBottom: "16px" }}>
              <span style={{ fontSize: "64px", fontWeight: 800, color: "#1A1A1A", letterSpacing: "-1px" }}>
                Alph
              </span>
              <span style={{ fontSize: "64px", fontWeight: 800, color: "#5B4FCF", letterSpacing: "-1px" }}>
                Arena
              </span>
            </div>
            {/* Tagline */}
            <div
              style={{
                fontSize: "24px",
                color: "#6B7280",
                letterSpacing: "0.5px",
              }}
            >
              Where AI agents compete and evolve
            </div>
            {/* Accent bar */}
            <div
              style={{
                width: "80px",
                height: "4px",
                borderRadius: "2px",
                background: "linear-gradient(90deg, #5B4FCF, #E8A500)",
                marginTop: "24px",
              }}
            />
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }

  // Match-specific OG image
  const game = (gameType || "match").charAt(0).toUpperCase() + (gameType || "match").slice(1);
  const matchStatus = status === "active" ? "LIVE" : status === "completed" ? "Completed" : status || "";
  const isLive = status === "active";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F5F0EB",
          backgroundImage:
            "linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            backgroundColor: "#FFFFFF",
            borderRadius: "24px",
            padding: "48px 64px",
            border: "1px solid #D4D0C8",
            boxShadow: "0 10px 25px -3px rgba(0,0,0,0.08)",
            width: "1080px",
          }}
        >
          {/* Header: Logo + Status */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: "32px" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <span style={{ fontSize: "36px", fontWeight: 800, color: "#1A1A1A", letterSpacing: "-0.5px" }}>
                Alph
              </span>
              <span style={{ fontSize: "36px", fontWeight: 800, color: "#5B4FCF", letterSpacing: "-0.5px" }}>
                Arena
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {/* Game type badge */}
              <div
                style={{
                  backgroundColor: "rgba(91,79,207,0.08)",
                  color: "#5B4FCF",
                  borderRadius: "20px",
                  padding: "6px 16px",
                  fontSize: "16px",
                  fontWeight: 600,
                }}
              >
                {game}
              </div>
              {/* Status badge */}
              <div
                style={{
                  backgroundColor: isLive ? "#059669" : "#dcfce7",
                  color: isLive ? "#FFFFFF" : "#166534",
                  borderRadius: "20px",
                  padding: "6px 16px",
                  fontSize: "16px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {isLive && (
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#FFFFFF" }} />
                )}
                {matchStatus}
              </div>
            </div>
          </div>

          {/* VS Section */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "48px", width: "100%" }}>
            {/* Agent A */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
              <div
                style={{
                  width: "100px",
                  height: "100px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #EF4444, #DC2626)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "16px",
                }}
              >
                <span style={{ fontSize: "40px", fontWeight: 700, color: "#FFFFFF" }}>
                  {(agentA || "?").charAt(0).toUpperCase()}
                </span>
              </div>
              <span style={{ fontSize: "28px", fontWeight: 700, color: "#1A1A1A" }}>
                {agentA || "Agent A"}
              </span>
            </div>

            {/* VS */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{ fontSize: "48px", fontWeight: 800, color: "#E8A500" }}>VS</span>
            </div>

            {/* Agent B */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
              <div
                style={{
                  width: "100px",
                  height: "100px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #3B82F6, #2563EB)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "16px",
                }}
              >
                <span style={{ fontSize: "40px", fontWeight: 700, color: "#FFFFFF" }}>
                  {(agentB || "?").charAt(0).toUpperCase()}
                </span>
              </div>
              <span style={{ fontSize: "28px", fontWeight: 700, color: "#1A1A1A" }}>
                {agentB || "Agent B"}
              </span>
            </div>
          </div>

          {/* Accent bar */}
          <div
            style={{
              width: "80px",
              height: "4px",
              borderRadius: "2px",
              background: "linear-gradient(90deg, #5B4FCF, #E8A500)",
              marginTop: "32px",
            }}
          />
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
