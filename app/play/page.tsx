"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import AuthGuard from "@/components/AuthGuard";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import ReversiBoard from "@/components/game/ReversiBoard";
import ChessBoard from "@/components/game/ChessBoard";
import type { PlayBalance } from "@/lib/types";
import type { Socket } from "socket.io-client";
import { useAlphaPrice } from "@/lib/useAlphaPrice";
import { formatUsdEquivalent } from "@/lib/utils";

type Phase = "lobby" | "queue" | "entering" | "playing" | "result";

const TURN_TIMEOUT_S = 20;

/* ── Parse agent thinking raw text ── */
function parseAgentThinking(raw: string): { thinking: string; move: string | null } {
  // Try to extract JSON block from the text
  const jsonMatch = raw.match(/\{[\s\S]*"thinking"[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      // Use the parsed thinking text; fall back to text before the JSON
      const before = raw.slice(0, raw.indexOf(jsonMatch[0])).trim();
      const thinkingText = parsed.thinking || before || raw;
      return { thinking: thinkingText, move: parsed.move || null };
    } catch {
      /* not valid JSON, fall through */
    }
  }

  // Try the whole string as JSON
  try {
    const parsed = JSON.parse(raw);
    if (parsed.thinking) {
      return { thinking: parsed.thinking, move: parsed.move || null };
    }
  } catch {
    /* not JSON */
  }

  // Plain text — strip stray JSON-like artifacts
  const cleaned = raw
    .replace(/\{"thinking":[^}]*\}/g, "")
    .replace(/\{"move":[^}]*\}/g, "")
    .trim();

  return { thinking: cleaned || raw, move: null };
}

/* ── Pulsing ring ── */
function PulseRing() {
  return (
    <div className="relative w-20 h-20 mx-auto">
      <div className="absolute inset-0 rounded-full bg-arena-primary/10 animate-ping" />
      <div className="absolute inset-2 rounded-full bg-arena-primary/20 animate-pulse" />
      <div className="absolute inset-4 rounded-full bg-arena-primary/30" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-5 h-5 rounded-full bg-arena-primary animate-pulse" />
      </div>
    </div>
  );
}

function PlayContent() {
  const { t } = useLanguage();
  const router = useRouter();
  const { priceUsd } = useAlphaPrice();

  const [phase, setPhase] = useState<Phase>("lobby");
  const [error, setError] = useState("");

  // Lobby
  const [balance, setBalance] = useState<PlayBalance | null>(null);
  const [gameType, setGameType] = useState("chess");
  const [joining, setJoining] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Match state
  const [agentId, setAgentId] = useState<string | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [boardState, setBoardState] = useState<unknown>(null);
  const [gameLegalMoves, setGameLegalMoves] = useState<unknown>([]);
  const [mySide, setMySide] = useState<"a" | "b" | null>(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [turnTimer, setTurnTimer] = useState<number | null>(null);
  const [turnExpired, setTurnExpired] = useState(false);
  const [matchClock, setMatchClock] = useState<number | null>(null);
  const [playerA, setPlayerA] = useState<string>("");
  const [playerB, setPlayerB] = useState<string>("");
  const [isCheck, setIsCheck] = useState(false);
  const [agentThinking, setAgentThinking] = useState<string | null>(null);

  // Result
  const [resultMessage, setResultMessage] = useState("");
  const [resultType, setResultType] = useState<"win" | "lose" | "draw">("draw");

  const socketRef = useRef<Socket | null>(null);
  const matchIdRef = useRef<string | null>(null);
  const agentIdRef = useRef<string | null>(null);
  const mySideRef = useRef<"a" | "b" | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const balancePollRef = useRef<NodeJS.Timeout | null>(null);
  const queuePollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { matchIdRef.current = matchId; }, [matchId]);
  useEffect(() => { agentIdRef.current = agentId; }, [agentId]);
  useEffect(() => { mySideRef.current = mySide; }, [mySide]);

  const fetchBalance = useCallback(async () => {
    try {
      const data = await api.playBalance();
      setBalance(data);
    } catch {
      /* no play wallet yet */
    }
  }, []);

  // Fetch match state via HTTP — used on restore and after socket switch
  const fetchMatchState = useCallback(async (mid: string, myAgentId?: string | null) => {
    try {
      const { match } = await api.getMatch(mid);
      const m = match as unknown as Record<string, unknown>;

      if (m.status === "completed" || m.status === "cancelled" || m.status === "error") {
        setPhase("lobby");
        return;
      }

      const board = (m.currentBoard ?? m.board) as unknown;
      if (board) {
        setBoardState(board);
        setPhase("playing");
      }

      const agents = m.agents as Record<string, Record<string, unknown>> | undefined;
      const agent = myAgentId ?? agentIdRef.current;
      if (agents && agent) {
        if (agents.a?.agentId === agent) setMySide("a");
        else if (agents.b?.agentId === agent) setMySide("b");
      }

      if (agents?.a?.name) setPlayerA(agents.a.name as string);
      if (agents?.b?.name) setPlayerB(agents.b.name as string);

      const currentTurn = m.currentTurn as string | undefined;
      if (currentTurn && agent) {
        const myTurn =
          (currentTurn === "a" && agents?.a?.agentId === agent) ||
          (currentTurn === "b" && agents?.b?.agentId === agent);
        setIsMyTurn(myTurn);
      }
    } catch {
      /* fetch failed — WS will handle it */
    }
  }, []);

  // ── On mount: restore state from API ──
  useEffect(() => {
    async function restore() {
      try {
        const status = await api.playStatus();
        if (status.inMatch && status.matchId) {
          setMatchId(status.matchId);
          setAgentId(status.agentId || null);
          if (status.gameType) setGameType(status.gameType);
          await fetchMatchState(status.matchId, status.agentId);
          // fetchMatchState sets phase to "playing" if board is available
          // Otherwise stay in "entering" while on-chain tx completes
          setPhase((prev) => prev === "playing" ? "playing" : "entering");
        } else if (status.inQueue) {
          setAgentId(status.agentId || null);
          if (status.gameType) setGameType(status.gameType);
          setPhase("queue");
        }
      } catch {
        /* stay in lobby */
      }
    }
    restore();
    fetchBalance();
  }, [fetchBalance, fetchMatchState]);

  // ── Fallback: if playing with no board data, re-check status ──
  useEffect(() => {
    if (phase !== "playing" || boardState !== null) return;
    const timeout = setTimeout(async () => {
      try {
        const status = await api.playStatus();
        if (!status.inMatch) {
          setPhase("lobby");
          setMatchId(null);
          setAgentId(null);
        }
      } catch {
        /* ignore */
      }
    }, 5000);
    return () => clearTimeout(timeout);
  }, [phase, boardState]);

  // ── Balance polling (30s) ──
  useEffect(() => {
    if (phase === "lobby") {
      balancePollRef.current = setInterval(fetchBalance, 30000);
      return () => {
        if (balancePollRef.current) clearInterval(balancePollRef.current);
      };
    }
  }, [phase, fetchBalance]);

  // ── Queue polling fallback (3s) ──
  useEffect(() => {
    if (phase !== "queue") {
      if (queuePollRef.current) clearInterval(queuePollRef.current);
      return;
    }
    queuePollRef.current = setInterval(async () => {
      try {
        const status = await api.playStatus();
        if (status.inMatch && status.matchId) {
          setMatchId(status.matchId);
          setAgentId(status.agentId || null);
          if (status.gameType) setGameType(status.gameType);
          setPhase("entering");
        } else if (!status.inQueue) {
          setPhase("lobby");
        }
      } catch {
        /* ignore */
      }
    }, 3000);
    return () => {
      if (queuePollRef.current) clearInterval(queuePollRef.current);
    };
  }, [phase]);

  // ── WebSocket: match event listeners ──
  const attachMatchListeners = useCallback((socket: Socket) => {
    socket.onAny((eventName: string, raw: unknown) => {
      if (eventName !== "message") return;
      const msg = typeof raw === "string" ? JSON.parse(raw) : (raw as Record<string, unknown>);
      const type = msg?.type as string | undefined;
      const data = msg?.data as Record<string, unknown> | undefined;
      if (!type || !data) return;

      if (type === "match:start" || type === "match:started") {
        const boardData = (data.currentBoard ?? data.board) as unknown;
        const side = data.side as "a" | "b" | undefined;
        const pA = data.playerA as string | undefined;
        const pB = data.playerB as string | undefined;
        const gt = data.gameType as string | undefined;
        if (boardData) {
          setBoardState(boardData);
          setPhase("playing");
        }
        if (side) setMySide(side);
        if (pA) setPlayerA(pA);
        if (pB) setPlayerB(pB);
        if (gt) setGameType(gt);
      }

      if (type === "match:your_turn") {
        const moves = data.legalMoves as unknown;
        const boardData = (data.currentBoard ?? data.board) as unknown;
        const timeMs = (data.timeRemainingMs ?? data.timeLimit) as number | undefined;
        const side = data.side as "a" | "b" | undefined;
        const check = !!(data.isCheck ?? data.check ?? data.inCheck);
        if (moves) setGameLegalMoves(moves);
        if (boardData) {
          setBoardState(boardData);
          setPhase("playing");
        }
        if (side) setMySide(side);
        setIsMyTurn(true);
        setTurnExpired(false);
        setIsCheck(check);
        setPhase("playing");
        setTurnTimer(TURN_TIMEOUT_S);
        if (timeMs) setMatchClock(Math.ceil(timeMs / 1000));
      }

      if (type === "match:move") {
        const boardData = (data.currentBoard ?? data.boardState ?? data.board) as unknown;
        if (boardData) setBoardState(boardData);

        const timeMs = (data.timeRemainingMs ?? data.timeLimit) as number | undefined;
        if (timeMs) setMatchClock(Math.ceil(timeMs / 1000));

        // Only clear turn state if this was MY move.
        // For opponent moves, don't touch isMyTurn/legalMoves —
        // match:your_turn is the authoritative source for that.
        const moveAgentId = (data.agentId ?? data.agent) as string | undefined;
        if (moveAgentId && moveAgentId === agentIdRef.current) {
          setIsMyTurn(false);
          setIsCheck(false);
          setGameLegalMoves([]);
          setTurnTimer(null);
        }
      }

      if (type === "match:state") {
        // Sent on reconnect — restore full board + turn state
        const boardData = (data.currentBoard ?? data.board) as unknown;
        if (boardData) setBoardState(boardData);
        const currentTurn = data.currentTurn as string | undefined;
        const agents = data.agents as Record<string, Record<string, unknown>> | undefined;
        const agent = agentIdRef.current;
        if (agents && agent) {
          if (agents.a?.agentId === agent) setMySide("a");
          else if (agents.b?.agentId === agent) setMySide("b");
        }
        if (currentTurn && agent && agents) {
          const myTurn =
            (currentTurn === "a" && agents.a?.agentId === agent) ||
            (currentTurn === "b" && agents.b?.agentId === agent);
          setIsMyTurn(myTurn);
        }
      }

      if (type === "agent:thinking") {
        const rawText = (data.raw ?? data.text ?? data.thinking ?? data.content ?? data.message) as string | undefined;
        if (rawText) {
          setAgentThinking(rawText);
        } else {
          // Try stringifying the whole data object as fallback
          const fallback = JSON.stringify(data);
          if (fallback && fallback !== "{}") setAgentThinking(fallback);
        }
      }

      if (type === "match:end" || type === "match:ended") {
        const boardData = (data.currentBoard ?? data.boardState ?? data.board) as unknown;
        if (boardData) setBoardState(boardData);
        setIsMyTurn(false);
        setIsCheck(false);
        setGameLegalMoves([]);
        setTurnTimer(null);
        setMatchClock(null);

        const result = data.result as Record<string, unknown> | undefined;
        const reason = (result?.reason ?? data.reason) as string | undefined;
        const outcome = data.outcome as string | undefined;
        const myAgent = agentIdRef.current;
        const side = mySideRef.current;

        // Extract winnerId — could be a string agentId, a side letter, or nested in an object
        let winnerId: string | undefined;
        for (const src of [result, data]) {
          if (!src) continue;
          const r = src as Record<string, unknown>;
          const w = r.winnerId ?? r.winner;
          if (typeof w === "string") { winnerId = w; break; }
          if (typeof w === "object" && w && (w as Record<string, unknown>).agentId) {
            winnerId = (w as Record<string, unknown>).agentId as string;
            break;
          }
        }

        const isDraw = !winnerId || winnerId === "draw" || reason === "draw" || outcome === "draw";
        const iWon = !isDraw && (
          winnerId === myAgent ||    // winnerId is my agentId
          winnerId === side ||       // winnerId is my side letter ("a"/"b")
          winnerId === "you" ||      // explicit "you"
          outcome === "win"          // outcome field says I won
        );

        if (isDraw) {
          setResultType("draw");
          setResultMessage(t.play.draw);
        } else if (iWon) {
          setResultType("win");
          setResultMessage(reason === "checkmate" ? t.play.checkmate : t.play.youWin);
        } else {
          setResultType("lose");
          setResultMessage(reason === "checkmate" ? t.play.checkmate : t.play.youLose);
        }
        setPhase("result");
      }
    });
  }, [t.play.draw, t.play.youWin, t.play.youLose, t.play.checkmate]);

  // Switch from queue socket to match socket
  const switchToMatchSocket = useCallback((mid: string) => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    const matchSocket = api.connectMatchSocket(mid);
    if (!matchSocket) return;
    socketRef.current = matchSocket;
    attachMatchListeners(matchSocket);

    // Fetch initial state via HTTP since we likely missed match:start / match:your_turn
    matchSocket.on("connect", () => {
      fetchMatchState(mid);
    });
  }, [attachMatchListeners, fetchMatchState]);

  // ── WebSocket effect ──
  useEffect(() => {
    if (phase !== "queue" && phase !== "entering" && phase !== "playing") {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    if (socketRef.current) return;

    // Restoring mid-match
    if (matchIdRef.current) {
      const socket = api.connectMatchSocket(matchIdRef.current);
      if (!socket) return;
      socketRef.current = socket;
      attachMatchListeners(socket);
      return;
    }

    // Queue → listen for matchmaking:matched
    const socket = api.connectSocket();
    if (!socket) return;
    socketRef.current = socket;

    socket.onAny((eventName: string, raw: unknown) => {
      if (eventName !== "message") return;
      const msg = typeof raw === "string" ? JSON.parse(raw) : (raw as Record<string, unknown>);
      const type = msg?.type as string | undefined;
      const data = msg?.data as Record<string, unknown> | undefined;
      if (!type || !data) return;

      if (type === "matchmaking:matched") {
        const mid = data.matchId as string;
        if (mid) {
          matchIdRef.current = mid;
          setMatchId(mid);
          if (data.gameType) setGameType(data.gameType as string);
          setPhase("entering");
          switchToMatchSocket(mid);
        }
      }
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, attachMatchListeners, switchToMatchSocket]);

  // Disconnect socket on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  // ── Turn timer countdown ──
  useEffect(() => {
    if (!isMyTurn || turnTimer === null || turnTimer <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      if (isMyTurn && turnTimer === 0) setTurnExpired(true);
      return;
    }
    timerRef.current = setInterval(() => {
      setTurnTimer((prev) => {
        if (prev === null || prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setTurnExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isMyTurn, turnTimer !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ──
  const handleJoinQueue = async () => {
    setError("");
    setJoining(true);
    try {
      await api.playCancel().catch(() => {});
      const result = await api.playJoin({ gameType, stakeAmount: 1_000_000 });
      setAgentId(result.agentId);
      setPhase("queue");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.play.joinFailed);
    } finally {
      setJoining(false);
    }
  };

  const handleCancelQueue = async () => {
    setCancelling(true);
    try {
      await api.playCancel();
      setPhase("lobby");
      setAgentId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.play.cancelFailed);
    } finally {
      setCancelling(false);
    }
  };

  const handleGameMove = async (move: unknown) => {
    const mid = matchId || matchIdRef.current;
    if (!mid) return;
    setIsMyTurn(false);
    setGameLegalMoves([]);
    if (socketRef.current?.connected) {
      socketRef.current.emit("game:move", { matchId: mid, move });
    } else {
      try {
        await api.playMove(mid, move);
      } catch (err) {
        setError(err instanceof Error ? err.message : t.play.moveFailed);
        setIsMyTurn(true);
      }
    }
  };

  const handleReversiCellClick = (row: number, col: number) => handleGameMove([row, col]);
  const handleChessMove = (move: string) => handleGameMove(move);

  const resetState = () => {
    setPhase("lobby");
    setMatchId(null);
    setAgentId(null);
    setBoardState(null);
    setGameLegalMoves([]);
    setMySide(null);
    setIsMyTurn(false);
    setIsCheck(false);
    setTurnTimer(null);
    setTurnExpired(false);
    setMatchClock(null);
    setResultMessage("");
    setPlayerA("");
    setPlayerB("");
    setAgentThinking(null);
    fetchBalance();
  };

  const handlePlayAgain = async () => {
    await api.playCancel().catch(() => {});
    resetState();
  };

  const handleAbandonMatch = async () => {
    await api.playCancel().catch(() => {});
    resetState();
  };

  // ── Board renderer ──
  const renderBoard = (interactive: boolean) => {
    const canInteract = interactive && !turnExpired;
    if (gameType === "chess") {
      return (
        <ChessBoard
          board={boardState as number[][] | null}
          legalMoves={canInteract ? (gameLegalMoves as string[] || []) : []}
          mySide={mySide}
          isMyTurn={canInteract ? isMyTurn : false}
          isCheck={canInteract ? isCheck : false}
          onMove={canInteract ? handleChessMove : undefined}
        />
      );
    }
    return (
      <ReversiBoard
        board={boardState as number[][] | null}
        legalMoves={canInteract ? (gameLegalMoves as [number, number][] || []) : []}
        mySide={mySide}
        isMyTurn={canInteract ? isMyTurn : false}
        onCellClick={canInteract ? handleReversiCellClick : undefined}
      />
    );
  };

  // Player labels
  const isChess = gameType === "chess";
  const sideALabel = isChess ? t.play.white : t.play.black;
  const sideBLabel = isChess ? t.play.black : t.play.white;
  const sideAColor = isChess ? "#fff" : "#222";
  const sideBColor = isChess ? "#222" : "#fff";

  // ── Render ──
  return (
    <div className="page-container">
      <div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="bg-gradient-to-r from-arena-primary/[0.06] via-transparent to-arena-accent/[0.04] rounded-2xl border border-arena-border-light p-6 sm:p-8 mb-8 opacity-0 animate-fade-up">
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-arena-text mb-2">
            {t.play.title}
          </h1>
          <p className="text-arena-muted leading-relaxed">{t.play.subtitle}</p>
        </div>

        {error && (
          <div className="bg-arena-danger/10 border border-arena-danger/30 text-arena-danger rounded-xl px-4 py-3 text-sm mb-6 animate-fade-down">
            {error}
          </div>
        )}

        {/* ════════ LOBBY ════════ */}
        {phase === "lobby" && (
          <div className="space-y-6 opacity-0 animate-fade-up" style={{ animationDelay: "0.1s" }}>
            <Card>
              <div className="px-6 py-4 border-b border-arena-border-light/60 bg-arena-bg/30">
                <h2 className="text-lg font-display font-semibold text-arena-text">{t.play.balance}</h2>
              </div>
              <div className="p-6">
                {balance ? (
                  <div className="space-y-3">
                    <div className="flex items-end gap-4">
                      <div>
                        <span className="text-2xl font-bold font-mono tabular-nums text-arena-primary">{balance.alpha}</span>
                        <span className="text-xs text-arena-muted ml-1">ALPHA</span>
                        {(() => { const usd = formatUsdEquivalent(parseFloat(balance.alpha) || 0, priceUsd); return usd ? <span className="text-xs text-arena-muted ml-2">({usd})</span> : null; })()}
                      </div>
                      <div>
                        <span className="text-sm font-mono tabular-nums text-arena-muted">{balance.eth}</span>
                        <span className="text-xs text-arena-muted ml-1">ETH</span>
                      </div>
                    </div>
                    {balance.walletAddress && (
                      <div className="bg-arena-bg/50 border border-arena-border-light rounded-lg px-3 py-2">
                        <div className="text-[10px] text-arena-muted uppercase tracking-widest font-mono mb-1">{t.play.depositAddress}</div>
                        <div className="text-xs font-mono text-arena-text break-all">{balance.walletAddress}</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-arena-muted font-mono">{t.common.loading}</div>
                )}
              </div>
            </Card>

            <Card>
              <div className="px-6 py-4 border-b border-arena-border-light/60 bg-arena-bg/30">
                <h2 className="text-lg font-display font-semibold text-arena-text">{t.play.joinQueue}</h2>
              </div>
              <div className="p-6 space-y-5">
                <Select label={t.play.gameType} value="chess" disabled>
                  <option value="chess">Chess</option>
                </Select>
                <Button onClick={handleJoinQueue} isLoading={joining} className="w-full" size="lg">
                  {t.play.joinQueue}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* ════════ QUEUE ════════ */}
        {phase === "queue" && (
          <div
            className="bg-white border border-arena-primary/30 rounded-2xl p-8 shadow-arena relative overflow-hidden opacity-0 animate-fade-up"
            style={{ animationDelay: "0.1s" }}
          >
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-arena-primary via-arena-primary-light to-arena-primary rounded-l-2xl" />
            <div className="text-center space-y-5">
              <PulseRing />
              <h2 className="text-xl font-display font-bold text-arena-text">{t.play.waiting}</h2>
              <p className="text-sm text-arena-muted max-w-sm mx-auto">{t.play.waitingDesc}</p>
              <Button variant="danger" onClick={handleCancelQueue} isLoading={cancelling}>
                {t.play.cancelQueue}
              </Button>
            </div>
          </div>
        )}

        {/* ════════ ENTERING MATCH ════════ */}
        {phase === "entering" && (
          <div
            className="bg-white border border-arena-accent/30 rounded-2xl p-10 shadow-arena relative overflow-hidden opacity-0 animate-fade-up"
            style={{ animationDelay: "0.1s" }}
          >
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-arena-accent via-arena-primary to-arena-accent rounded-l-2xl" />
            <div className="absolute inset-0 bg-gradient-to-br from-arena-primary/[0.02] via-transparent to-arena-accent/[0.03]" />
            <div className="relative text-center space-y-6">
              {/* Animated chess/game icon */}
              <div className="relative w-24 h-24 mx-auto">
                <div className="absolute inset-0 rounded-2xl bg-arena-primary/10 animate-pulse" />
                <div className="absolute inset-2 rounded-xl bg-arena-primary/20 animate-ping" style={{ animationDuration: "2s" }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-4xl">
                    {gameType === "chess" ? "\u265A" : gameType === "reversi" ? "\u25CF" : "\u{1FA79}"}
                  </span>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-display font-bold text-arena-text mb-2">
                  {t.play.enteringMatch}
                </h2>
                <p className="text-sm text-arena-muted max-w-sm mx-auto">
                  {t.play.enteringMatchDesc}
                </p>
              </div>

              {/* Progress steps */}
              <div className="flex items-center justify-center gap-3 text-xs text-arena-muted">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-arena-success" />
                  <span>Matched</span>
                </span>
                <div className="w-6 border-t border-arena-border-light" />
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-arena-primary animate-pulse" />
                  <span>On-chain setup</span>
                </span>
                <div className="w-6 border-t border-dashed border-arena-border-light" />
                <span className="flex items-center gap-1.5 opacity-40">
                  <span className="w-2 h-2 rounded-full bg-arena-muted/40" />
                  <span>Game start</span>
                </span>
              </div>

              {matchId && (
                <div className="text-[10px] text-arena-muted/50 font-mono">
                  Match: {matchId}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════ PLAYING ════════ */}
        {phase === "playing" && (
          <div className="space-y-4 opacity-0 animate-fade-up" style={{ animationDelay: "0.1s" }}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Board */}
              <div className="lg:col-span-2 relative">
                <Card>
                  <div className="p-4 sm:p-6">{renderBoard(true)}</div>
                </Card>
                {turnExpired && phase === "playing" && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10">
                    <div className="text-center space-y-3 px-6">
                      <div className="w-14 h-14 rounded-full bg-arena-danger/20 border-2 border-arena-danger/40 flex items-center justify-center mx-auto">
                        <svg className="w-7 h-7 text-arena-danger" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-white font-display font-bold text-lg">{t.play.turnExpired}</p>
                      <p className="text-white/60 text-sm">{t.play.turnExpiredDesc}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-3">
                {/* Check warning */}
                {isCheck && isMyTurn && gameType === "chess" && (
                  <div className="bg-red-50 border border-red-300 rounded-xl px-4 py-3 flex items-center gap-2.5 animate-pulse">
                    <span className="text-red-500 text-lg">&#9888;</span>
                    <span className="text-sm font-display font-bold text-red-600">{t.play.check}!</span>
                  </div>
                )}

                {/* Turn indicator + Timer */}
                <Card>
                  <div className="p-5 space-y-3">
                    <div className={`flex items-center justify-between ${isMyTurn ? "text-arena-primary" : "text-arena-muted"}`}>
                      <div className="flex items-center gap-2.5">
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isMyTurn ? "bg-arena-primary animate-pulse" : "bg-arena-muted/40"}`} />
                        <span className="text-base font-display font-bold">
                          {isMyTurn ? t.play.yourTurn : t.play.opponentTurn}
                        </span>
                      </div>
                      {turnTimer !== null && isMyTurn && (
                        <div className="flex items-baseline gap-0.5">
                          <span className={`text-2xl font-bold font-mono tabular-nums ${turnTimer <= 5 ? "text-arena-danger animate-pulse" : turnTimer <= 10 ? "text-arena-accent" : "text-arena-primary"}`}>{turnTimer}</span>
                          <span className="text-[10px] text-arena-muted">s</span>
                        </div>
                      )}
                    </div>
                    {matchClock !== null && (
                      <div className="flex items-center justify-between pt-2 border-t border-arena-border-light/60">
                        <span className="text-[10px] text-arena-muted uppercase tracking-widest font-mono">{t.play.matchClock}</span>
                        <span className="text-sm font-mono tabular-nums text-arena-muted">
                          {Math.floor(matchClock / 60)}:{(matchClock % 60).toString().padStart(2, "0")}
                        </span>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Players */}
                <Card>
                  <div className="p-4">
                    <div className="space-y-2.5">
                      <div className={`flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors ${
                        !isMyTurn && mySide !== "a" ? "bg-arena-primary/[0.04] ring-1 ring-arena-primary/20" : ""
                      }`}>
                        <div
                          className="w-5 h-5 rounded-full shadow-sm border border-black/10 shrink-0"
                          style={{ backgroundColor: sideAColor }}
                        />
                        <span className="text-sm text-arena-text font-medium truncate">{playerA || sideALabel}</span>
                        {mySide === "a" && (
                          <span className="text-[9px] bg-arena-primary/10 text-arena-primary px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold ml-auto">
                            {t.play.you}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 px-3">
                        <div className="flex-1 border-t border-arena-border-light/60" />
                        <span className="text-[10px] text-arena-muted font-mono">VS</span>
                        <div className="flex-1 border-t border-arena-border-light/60" />
                      </div>
                      <div className={`flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors ${
                        !isMyTurn && mySide !== "b" ? "bg-arena-primary/[0.04] ring-1 ring-arena-primary/20" : ""
                      }`}>
                        <div
                          className="w-5 h-5 rounded-full shadow-sm border border-black/10 shrink-0"
                          style={{ backgroundColor: sideBColor }}
                        />
                        <span className="text-sm text-arena-text font-medium truncate">{playerB || sideBLabel}</span>
                        {mySide === "b" && (
                          <span className="text-[9px] bg-arena-primary/10 text-arena-primary px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold ml-auto">
                            {t.play.you}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Match info + Abandon */}
                <div className="pt-1 space-y-2">
                  {matchId && (
                    <div className="flex items-center gap-2 px-1">
                      <span className="text-[10px] text-arena-muted/60 font-mono uppercase tracking-wider">Match</span>
                      <span className="text-[10px] font-mono text-arena-muted/60 truncate">{matchId}</span>
                    </div>
                  )}
                  <button
                    onClick={handleAbandonMatch}
                    className="w-full text-xs text-arena-danger/70 hover:text-arena-danger hover:bg-arena-danger/5 rounded-lg py-2 transition-colors font-medium"
                  >
                    {t.play.abandonMatch}
                  </button>
                </div>
              </div>
            </div>

            {/* Agent Reasoning — full width below the board */}
            {agentThinking && (() => {
              const parsed = parseAgentThinking(agentThinking);
              return (
                <Card>
                  <div className="p-5">
                    <div className="flex items-center gap-2.5 mb-4">
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-arena-primary/15 to-arena-accent/15 flex items-center justify-center">
                        <svg className="w-3.5 h-3.5 text-arena-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                        </svg>
                      </div>
                      <span className="text-sm font-display font-semibold text-arena-text">Agent Reasoning</span>
                      {parsed.move && (
                        <span className="ml-auto text-[10px] font-mono font-bold bg-arena-primary/10 text-arena-primary px-2 py-1 rounded-md">
                          {parsed.move}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-arena-primary/30 via-arena-accent/20 to-transparent rounded-full" />
                      <div className="pl-4">
                        <p className="text-sm text-arena-text/80 leading-relaxed">
                          {parsed.thinking}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })()}
          </div>
        )}

        {/* ════════ RESULT ════════ */}
        {phase === "result" && (
          <div className="space-y-6 opacity-0 animate-fade-up" style={{ animationDelay: "0.1s" }}>
            <div className={`rounded-2xl border-2 p-8 text-center ${
              resultType === "win"
                ? "border-arena-success/40 bg-arena-success/5"
                : resultType === "lose"
                ? "border-arena-danger/40 bg-arena-danger/5"
                : "border-arena-border-light bg-arena-bg/30"
            }`}>
              <div className={`text-4xl font-display font-bold mb-2 ${
                resultType === "win"
                  ? "text-arena-success"
                  : resultType === "lose"
                  ? "text-arena-danger"
                  : "text-arena-text"
              }`}>
                {resultMessage}
              </div>
            </div>

            <Card>
              <div className="p-4 sm:p-6">{renderBoard(false)}</div>
            </Card>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={handlePlayAgain} size="lg">{t.play.playAgain}</Button>
              <Button variant="secondary" size="lg" onClick={() => router.push("/dashboard")}>
                {t.play.backToDashboard}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PlayPage() {
  return (
    <AuthGuard>
      <PlayContent />
    </AuthGuard>
  );
}
