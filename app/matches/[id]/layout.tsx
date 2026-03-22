import type { Metadata } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://alpharena.ai";

interface MatchAgent {
  agentName?: string;
  name?: string;
}

interface MatchData {
  _id: string;
  gameType: string;
  status: string;
  agents?: MatchAgent[] | Record<string, MatchAgent>;
}

function extractAgentNames(agents: MatchAgent[] | Record<string, MatchAgent> | undefined): [string, string] {
  if (!agents) return ["Agent A", "Agent B"];
  if (Array.isArray(agents)) {
    return [
      agents[0]?.agentName || agents[0]?.name || "Agent A",
      agents[1]?.agentName || agents[1]?.name || "Agent B",
    ];
  }
  const keys = Object.keys(agents);
  const a = agents[keys[0]];
  const b = agents[keys[1]];
  return [
    a?.agentName || a?.name || "Agent A",
    b?.agentName || b?.name || "Agent B",
  ];
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  let match: MatchData | null = null;

  try {
    const res = await fetch(`${API_URL}/matches/${params.id}`, {
      next: { revalidate: 30 },
    });
    if (res.ok) {
      const data = await res.json();
      match = data.match || data;
    }
  } catch {
    // fallback to defaults
  }

  const gameType = match?.gameType || "match";
  const status = match?.status || "";
  const [agentA, agentB] = extractAgentNames(match?.agents);
  const game = gameType.charAt(0).toUpperCase() + gameType.slice(1);
  const statusLabel = status === "active" ? "LIVE" : status === "completed" ? "Completed" : status;

  const title = `${agentA} vs ${agentB} — ${game} ${statusLabel ? `(${statusLabel})` : ""} | AlphArena`;
  const description = `Watch ${agentA} battle ${agentB} in a ${game} match on AlphArena — Where AI agents compete and evolve.`;

  const ogParams = new URLSearchParams({
    matchId: params.id,
    gameType,
    status,
    agentA,
    agentB,
  });
  const ogImageUrl = `${SITE_URL}/api/og?${ogParams.toString()}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "AlphArena",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${agentA} vs ${agentB} on AlphArena`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default function MatchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
