"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import AuthGuard from "@/components/AuthGuard";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Select } from "@/components/ui/Input";
import ReversiBoard from "@/components/game/ReversiBoard";
import type { PlayBalance, PlayStatus } from "@/lib/types";
import type { Socket } from "socket.io-client";

type Phase = "lobby" | "queue" | "playing" | "result";

/* ── Pulsing ring (reused from matchmaking) ── */
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

  // Phase state machine
  const [phase, setPhase] = useState<Phase>("lobby");
  const [error, setError] = useState("");

  // Lobby
  const [balance, setBalance] = useState<PlayBalance | null>(null);
  const [gameType, setGameType] = useState("reversi");
  const [stakeAmount, setStakeAmount] = useState("0");
  const [joining, setJoining] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Match state
  const [agentId, setAgentId] = useState<string | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [board, setBoard] = useState<number[][] | null>(null);
  const [legalMoves, setLegalMoves] = useState<[number, number][]>([]);
  const [mySide, setMySide] = useState<"a" | "b" | null>(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [turnTimer, setTurnTimer] = useState<number | null>(null);
  const [playerA, setPlayerA] = useState<string>("");
  const [playerB, setPlayerB] = useState<string>("");

  // Result
  const [resultMessage, setResultMessage] = useState("");
  const [resultType, setResultType] = useState<"win" | "lose" | "draw">("draw");

  const socketRef = useRef<Socket | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const balancePollRef = useRef<NodeJS.Timeout | null>(null);
  const queuePollRef = useRef<NodeJS.Timeout | null>(null);

  // ── Fetch balance ──
  const fetchBalance = useCallback(async () => {
    try {
      const data = await api.playBalance();
      setBalance(data);
    } catch {
      // silently handle — user might not have a play wallet yet
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
          setPhase("playing");
        } else if (status.inQueue) {
          setAgentId(status.agentId || null);
          setPhase("queue");
        }
      } catch {
        // not in queue or match — stay in lobby
      }
    }
    restore();
    fetchBalance();
  }, [fetchBalance]);

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
          setPhase("playing");
        } else if (!status.inQueue) {
          // Kicked out of queue
          setPhase("lobby");
        }
      } catch {
        // ignore
      }
    }, 3000);

    return () => {
      if (queuePollRef.current) clearInterval(queuePollRef.current);
    };
  }, [phase]);

  // ── WebSocket ──
  useEffect(() => {
    if (phase !== "queue" && phase !== "playing") {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const socket = matchId
      ? api.connectMatchSocket(matchId)
      : api.connectSocket();
    if (!socket) return;
    socketRef.current = socket;

    socket.onAny((eventName: string, raw: unknown) => {
      if (eventName !== "message") return;
      const msg = typeof raw === "string" ? JSON.parse(raw) : (raw as Record<string, unknown>);
      const type = msg?.type as string | undefined;
      const data = msg?.data as Record<string, unknown> | undefined;
      if (!type || !data) return;

      // Queue → matched
      if (type === "matchmaking:matched") {
        const mid = data.matchId as string;
        if (mid) {
          setMatchId(mid);
          setPhase("playing");
        }
      }

      // Match started
      if (type === "match:start") {
        const boardData = data.board as number[][] | undefined;
        const side = data.side as "a" | "b" | undefined;
        const pA = data.playerA as string | undefined;
        const pB = data.playerB as string | undefined;
        if (boardData) setBoard(boardData);
        if (side) setMySide(side);
        if (pA) setPlayerA(pA);
        if (pB) setPlayerB(pB);
      }

      // Your turn
      if (type === "match:your_turn") {
        const moves = data.legalMoves as [number, number][] | undefined;
        const boardData = data.board as number[][] | undefined;
        const timeLimit = data.timeLimit as number | undefined;
        if (moves) setLegalMoves(moves);
        if (boardData) setBoard(boardData);
        setIsMyTurn(true);
        if (timeLimit) setTurnTimer(Math.ceil(timeLimit / 1000));
      }

      // Move made (opponent or self)
      if (type === "match:move") {
        const boardData = data.board as number[][] | undefined;
        if (boardData) setBoard(boardData);
        setIsMyTurn(false);
        setLegalMoves([]);
        setTurnTimer(null);
      }

      // Match ended
      if (type === "match:end") {
        const boardData = data.board as number[][] | undefined;
        const winner = data.winner as string | undefined;
        const myId = data.yourAgentId as string | undefined;
        if (boardData) setBoard(boardData);
        setIsMyTurn(false);
        setLegalMoves([]);
        setTurnTimer(null);

        if (winner === "draw" || !winner) {
          setResultType("draw");
          setResultMessage(t.play.draw);
        } else if (winner === myId || winner === "you") {
          setResultType("win");
          setResultMessage(t.play.youWin);
        } else {
          setResultType("lose");
          setResultMessage(t.play.youLose);
        }
        setPhase("result");
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [phase, matchId, t.play.draw, t.play.youWin, t.play.youLose]);

  // ── Turn timer countdown ──
  useEffect(() => {
    if (!isMyTurn || turnTimer === null || turnTimer <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTurnTimer((prev) => {
        if (prev === null || prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
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
    const stake = parseFloat(stakeAmount);
    if (isNaN(stake) || stake < 0) {
      setError(t.play.invalidStake);
      return;
    }

    setJoining(true);
    try {
      // Cancel any lingering queue entry before joining
      await api.playCancel().catch(() => {});
      const result = await api.playJoin({ gameType, stakeAmount: stake });
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

  const handleCellClick = async (row: number, col: number) => {
    if (!matchId) return;
    setIsMyTurn(false);
    setLegalMoves([]);

    // Try WebSocket first
    if (socketRef.current?.connected) {
      socketRef.current.emit("game:move", { matchId, move: [row, col] });
    } else {
      // HTTP fallback
      try {
        await api.playMove(matchId, [row, col]);
      } catch (err) {
        setError(err instanceof Error ? err.message : t.play.moveFailed);
        setIsMyTurn(true);
      }
    }
  };

  const handlePlayAgain = async () => {
    // Ensure any leftover queue/match state is cleaned up
    await api.playCancel().catch(() => {});
    setPhase("lobby");
    setMatchId(null);
    setAgentId(null);
    setBoard(null);
    setLegalMoves([]);
    setMySide(null);
    setIsMyTurn(false);
    setTurnTimer(null);
    setResultMessage("");
    setPlayerA("");
    setPlayerB("");
    fetchBalance();
  };

  // ── Render phases ──
  return (
    <div className="page-container">
      <div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="bg-gradient-to-r from-arena-primary/[0.06] via-transparent to-arena-accent/[0.04] rounded-2xl border border-arena-border-light p-6 sm:p-8 mb-8 opacity-0 animate-fade-up">
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-arena-text mb-2">
            {t.play.title}
          </h1>
          <p className="text-arena-muted leading-relaxed">
            {t.play.subtitle}
          </p>
        </div>

        {error && (
          <div className="bg-arena-danger/10 border border-arena-danger/30 text-arena-danger rounded-xl px-4 py-3 text-sm mb-6 animate-fade-down">
            {error}
          </div>
        )}

        {/* ════════ LOBBY ════════ */}
        {phase === "lobby" && (
          <div className="space-y-6 opacity-0 animate-fade-up" style={{ animationDelay: "0.1s" }}>
            {/* Balance card */}
            <Card>
              <div className="px-6 py-4 border-b border-arena-border-light/60 bg-arena-bg/30">
                <h2 className="text-lg font-display font-semibold text-arena-text">
                  {t.play.balance}
                </h2>
              </div>
              <div className="p-6">
                {balance ? (
                  <div className="space-y-3">
                    <div className="flex items-end gap-4">
                      <div>
                        <span className="text-2xl font-bold font-mono tabular-nums text-arena-primary">
                          {balance.usdc}
                        </span>
                        <span className="text-xs text-arena-muted ml-1">USDC</span>
                      </div>
                      <div>
                        <span className="text-sm font-mono tabular-nums text-arena-muted">
                          {balance.eth}
                        </span>
                        <span className="text-xs text-arena-muted ml-1">ETH</span>
                      </div>
                    </div>
                    {balance.walletAddress && (
                      <div className="bg-arena-bg/50 border border-arena-border-light rounded-lg px-3 py-2">
                        <div className="text-[10px] text-arena-muted uppercase tracking-widest font-mono mb-1">
                          {t.play.depositAddress}
                        </div>
                        <div className="text-xs font-mono text-arena-text break-all">
                          {balance.walletAddress}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-arena-muted font-mono">
                    {t.common.loading}
                  </div>
                )}
              </div>
            </Card>

            {/* Join form */}
            <Card>
              <div className="px-6 py-4 border-b border-arena-border-light/60 bg-arena-bg/30">
                <h2 className="text-lg font-display font-semibold text-arena-text">
                  {t.play.joinQueue}
                </h2>
              </div>
              <div className="p-6 space-y-5">
                <Select
                  label={t.play.gameType}
                  value={gameType}
                  onChange={(e) => setGameType(e.target.value)}
                >
                  <option value="reversi">Reversi</option>
                  <option value="marrakech">Marrakech</option>
                </Select>

                <Input
                  label={t.play.stakeAmount}
                  type="number"
                  min="0"
                  step="0.01"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  helperText={t.play.stakeHelper}
                />

                {balance && parseFloat(stakeAmount) > 0 && parseFloat(balance.usdc) < parseFloat(stakeAmount) && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-3 py-2 text-sm">
                    Insufficient balance: {balance.usdc} USDC available, need {stakeAmount} USDC.
                  </div>
                )}

                <Button
                  onClick={handleJoinQueue}
                  isLoading={joining}
                  className="w-full"
                  size="lg"
                >
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
              <h2 className="text-xl font-display font-bold text-arena-text">
                {t.play.waiting}
              </h2>
              <p className="text-sm text-arena-muted max-w-sm mx-auto">
                {t.play.waitingDesc}
              </p>
              <Button
                variant="danger"
                onClick={handleCancelQueue}
                isLoading={cancelling}
              >
                {t.play.cancelQueue}
              </Button>
            </div>
          </div>
        )}

        {/* ════════ PLAYING ════════ */}
        {phase === "playing" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 opacity-0 animate-fade-up" style={{ animationDelay: "0.1s" }}>
            {/* Board (2 cols) */}
            <div className="lg:col-span-2">
              <Card>
                <div className="p-4 sm:p-6">
                  <ReversiBoard
                    board={board}
                    legalMoves={legalMoves}
                    mySide={mySide}
                    isMyTurn={isMyTurn}
                    onCellClick={handleCellClick}
                  />
                </div>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Turn indicator */}
              <Card>
                <div className="p-4 text-center">
                  <div className={`text-lg font-display font-bold ${isMyTurn ? "text-arena-primary" : "text-arena-muted"}`}>
                    {isMyTurn ? t.play.yourTurn : t.play.opponentTurn}
                  </div>
                  {turnTimer !== null && (
                    <div className="mt-2">
                      <span className="text-3xl font-bold font-mono tabular-nums text-arena-primary">
                        {turnTimer}
                      </span>
                      <span className="text-xs text-arena-muted ml-1">s</span>
                    </div>
                  )}
                </div>
              </Card>

              {/* Players */}
              <Card>
                <div className="p-4 space-y-3">
                  <div className="text-[10px] text-arena-muted uppercase tracking-widest font-mono">
                    Players
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full shadow-sm shrink-0"
                        style={{ background: "radial-gradient(circle at 35% 35%, #555, #111)" }}
                      />
                      <span className="text-sm text-arena-text truncate font-medium">
                        {playerA || (t.play.black)}
                      </span>
                      {mySide === "a" && (
                        <span className="text-[10px] text-arena-primary uppercase tracking-wider font-semibold ml-auto">
                          {t.play.you}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full shadow-sm shrink-0"
                        style={{ background: "radial-gradient(circle at 35% 35%, #fff, #ccc)" }}
                      />
                      <span className="text-sm text-arena-text truncate font-medium">
                        {playerB || (t.play.white)}
                      </span>
                      {mySide === "b" && (
                        <span className="text-[10px] text-arena-primary uppercase tracking-wider font-semibold ml-auto">
                          {t.play.you}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Match ID */}
              {matchId && (
                <div className="bg-arena-bg/50 border border-arena-border-light rounded-lg px-3 py-2">
                  <div className="text-[10px] text-arena-muted uppercase tracking-widest font-mono mb-1">
                    Match
                  </div>
                  <div className="text-xs font-mono text-arena-text truncate">
                    {matchId}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════ RESULT ════════ */}
        {phase === "result" && (
          <div className="space-y-6 opacity-0 animate-fade-up" style={{ animationDelay: "0.1s" }}>
            {/* Result banner */}
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

            {/* Final board */}
            <Card>
              <div className="p-4 sm:p-6">
                <ReversiBoard
                  board={board}
                  legalMoves={[]}
                  mySide={mySide}
                  isMyTurn={false}
                />
              </div>
            </Card>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={handlePlayAgain} size="lg">
                {t.play.playAgain}
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => router.push("/dashboard")}
              >
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
