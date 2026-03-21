---
name: agents-page
description: Use when the user asks to modify, extend, or debug the agents listing page, agent detail page, or agent-related UI components. Covers agent cards, chain badges, chain filters, sort controls, wallet/balance display, agent creation flow, and Solana/EVM chain-aware rendering.
user-invocable: true
metadata:
  author: AlphArena
  version: 1.0.0
---

# Agents Page Skill

## What this Skill is for

Use this Skill when the user asks about:
- Modifying the agents listing page (`app/agents/page.tsx`)
- Modifying the agent detail page (`app/agents/[id]/page.tsx`)
- Adding/changing chain support (Base, Celo, Solana) in agent UI
- Agent card components, badges, filters, or sorting
- Wallet display, balance sections, gas token labels
- Agent creation flow and chain-aware wallet generation

## Key Files

| File | Purpose |
|------|---------|
| `app/agents/page.tsx` | Agent listing page — dashboard stats, featured agent, agent cards grid, chain filter, sort pills |
| `app/agents/[id]/page.tsx` | Agent detail page — stats, wallet/balance, withdraw, chat, edit, delete, match history |
| `lib/types.ts` | `SUPPORTED_CHAINS`, `Chain` type, `Agent` interface |
| `lib/api.ts` | `getExplorerTxUrl()` — chain-aware block explorer URLs |
| `app/play/page.tsx` | Play page — chain selector, balance display (shares chain patterns) |

## Architecture

### Supported Chains
Defined in `lib/types.ts`:
```typescript
export const SUPPORTED_CHAINS = ['base', 'celo', 'solana'] as const;
export type Chain = (typeof SUPPORTED_CHAINS)[number];
```

### Chain Color Scheme
Consistent across all components:
- **Base** — Blue (`bg-blue-50 text-blue-600 border-blue-200`)
- **Celo** — Yellow (`bg-yellow-50 text-yellow-600 border-yellow-200`)
- **Solana** — Purple (`bg-purple-50 text-purple-600 border-purple-200`)

### ChainBadge Component
Defined locally in both `app/agents/page.tsx` and `app/agents/[id]/page.tsx` (not a shared component). Uses a `styles` record keyed by chain name for colors, and a `labels` record for display names.

### Chain Filter (agents listing)
- State: `chainFilter: Chain | "all"` — defaults to `"all"`
- `filtered` memo filters agents by chain before sorting
- `summary` stats recalculate based on filtered agents
- UI: pill buttons in the sort bar — "All", then each `SUPPORTED_CHAINS` entry

### Gas Token Labels
Chain-aware gas token display:
- Base → "ETH"
- Celo → "CELO"
- Solana → "SOL"

Pattern: `agent?.chain === "solana" ? "SOL" : agent?.chain === "celo" ? "CELO" : "ETH"`

### Explorer URLs
`lib/api.ts` — `getExplorerTxUrl(txHash, chain)`:
- Base: `basescan.org` / `sepolia.basescan.org`
- Celo: `celoscan.io` / `alfajores.celoscan.io`
- Solana: `explorer.solana.com` (with `?cluster=devnet` for testnet)

### Wallet Generation (Backend)
- EVM (Base, Celo): `viem/accounts` — `generatePrivateKey()` + `privateKeyToAccount()`
- Solana: `@solana/web3.js` — `Keypair.generate()` + `bs58.encode(secretKey)`
- Chain is stored on the agent document and passed in `CreateAgentDto.chain`

## Adding a New Chain

1. Add chain name to `SUPPORTED_CHAINS` in `lib/types.ts`
2. Add explorer URL case in `getExplorerTxUrl()` in `lib/api.ts`
3. Add color entry in `ChainBadge` styles in both agent pages
4. Add chain button styles in `app/play/page.tsx` chain selector
5. Add gas token label in agent detail page and play page
6. Add chain filter button (auto from `SUPPORTED_CHAINS` iteration)
7. Backend: add wallet generation branch in `agents.service.ts`
8. Backend: add settlement service + router case

## Common Patterns

### Sort Pills
`SortPill` component — toggle buttons for sort keys (ELO, Win Rate, Matches, Earnings, Recent). Active state uses `bg-arena-primary text-white`.

### Agent Cards
`AgentCard` component renders each agent in the grid with: avatar, name, badges (type, chain, human), ELO, win rate ring, W/L/D bar, earnings.

### Featured Agent
`FeaturedAgent` — highlighted card for the highest-ELO agent in the filtered set. Only shown when `filtered.length > 1`.

### Summary Stats
`DashStat` cards — 4-card grid showing: agent count, win rate, best ELO, total earnings. Recalculates based on chain filter.
