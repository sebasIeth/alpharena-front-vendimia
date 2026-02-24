export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return formatDate(dateString);
}

export function truncateAddress(address: string, chars: number = 6): string {
  if (!address) return "";
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

export function formatElo(elo: number): string {
  return Math.round(elo).toString();
}

export function formatWinRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

export function formatStake(amount: number): string {
  return amount.toFixed(2);
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "idle":
      return "bg-emerald-500/15 text-emerald-400";
    case "queued":
      return "bg-amber-500/15 text-amber-400";
    case "in_match":
      return "bg-rose-500/15 text-rose-400";
    case "active":
      return "bg-emerald-500/15 text-emerald-400";
    case "completed":
      return "bg-slate-500/15 text-slate-400";
    case "pending":
      return "bg-amber-500/15 text-amber-400";
    case "cancelled":
      return "bg-slate-500/15 text-slate-400";
    case "error":
      return "bg-red-500/15 text-red-400";
    case "disabled":
      return "bg-slate-500/15 text-slate-500";
    default:
      return "bg-slate-500/15 text-slate-400";
  }
}

export function getPlayerColor(playerId: number): string {
  switch (playerId) {
    case 0:
      return "#EF4444"; // red
    case 1:
      return "#3B82F6"; // blue
    case 2:
      return "#10B981"; // green
    case 3:
      return "#8B5CF6"; // purple
    case -1:
      return "#94A3B8"; // neutralized (gray)
    default:
      return "transparent";
  }
}

export function getPlayerColorName(playerId: number): string {
  switch (playerId) {
    case 0:
      return "Red";
    case 1:
      return "Blue";
    case 2:
      return "Green";
    case 3:
      return "Purple";
    case -1:
      return "Neutralized";
    default:
      return "None";
  }
}

export function getDirectionArrow(direction: string): string {
  switch (direction) {
    case "N":
      return "\u2191";
    case "S":
      return "\u2193";
    case "E":
      return "\u2192";
    case "W":
      return "\u2190";
    default:
      return "\u2022";
  }
}

export function classNames(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Backend sends match.agents as object {a: {...}, b: {...}, _id: "..."} not as array.
 * Also uses "name" instead of "agentName" and may lack "username".
 * This normalizes it to the MatchAgent[] array format the frontend expects.
 */
export function normalizeMatchAgents(agents: any): {
  agentId: string;
  agentName: string;
  userId: string;
  username: string;
  eloAtStart: number;
  eloChange?: number;
  finalScore?: number;
}[] {
  if (Array.isArray(agents)) return agents;
  if (agents && typeof agents === "object") {
    const result: any[] = [];
    for (const key of ["a", "b", "c", "d"]) {
      const val = agents[key];
      if (val && typeof val === "object") {
        result.push({
          agentId: val.agentId || val.id || "",
          agentName: val.agentName || val.name || "Agent",
          userId: val.userId || "",
          username: val.username || val.ownerUsername || "",
          eloAtStart: val.eloAtStart ?? val.elo ?? 0,
          eloChange: val.eloChange,
          finalScore: val.finalScore,
        });
      }
    }
    return result;
  }
  return [];
}
