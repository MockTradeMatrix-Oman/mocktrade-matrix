"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight, Clock3, Coins, Crosshair, Crown, Flame, Globe2, Loader2, Medal, RefreshCw,
  ShieldQuestion, SkipForward, Snowflake, Sparkles, Swords, Target, Timer, Trophy,
  UserRound, Wifi, WifiOff, Zap,
} from "lucide-react";
import { Avatar, Badge, Card, Progress, SectionHead, cn } from "./ui";
import { useMarket } from "./socket";
import { useToast } from "./toast";
import { POWERUP_LIST } from "@/lib/arena-catalog";
import { timeAgo } from "@/lib/finance";
import { arenaRegionLabel, defaultArenaRegion } from "@/lib/regions";

type Stage = "idle" | "searching" | "lobby" | "battle" | "result";

type Player = {
  id: number; name: string; avatar: string; score?: number;
  region?: string; rating?: number;
};
type Question = { id: number; cat: string; level: number; prompt: string; options: string[] };

type Result = {
  matchId: string;
  region: string;
  reason: string;
  winnerId: number | null;
  draw: boolean;
  you: {
    score: number; correct: number; answered: number; ms: number;
    credits: number; won: boolean; rating: number; ratingDelta: number;
  };
  opponent: {
    id: number; name: string; avatar: string; score: number; correct: number; answered: number;
    ms: number; region: string; rating: number;
  };
  total: number;
};

type LadderRow = {
  id: number; name: string; avatar: string; credits_won: number; wins: number; matches: number;
  rating: number; arena_region: string; rank?: number;
};

type MatchRow = {
  id: string; region: string; p1: number; p2: number; p1_name: string; p2_name: string;
  p1_region: string; p2_region: string;
  p1_score: number; p2_score: number; winner_id: number | null; credits_awarded: number;
  started_at: number; status: string;
};

export function Arena({
  user,
  stats,
  rank,
  ladder,
  inventory: initialInventory,
  history,
}: {
  user: { id: number; name: string; avatar: string; arenaRegion: string; marketRegion: string; credits: number; rating: number };
  stats: { matches: number; wins: number; losses: number; draws: number; correct: number; answered: number; credits_won: number; best_streak: number; rating: number } | null;
  rank: number | null;
  ladder: LadderRow[];
  inventory: Record<string, number>;
  history: MatchRow[];
}) {
  const { socket, connected, online } = useMarket();
  const { push } = useToast();

  const [stage, setStage] = useState<Stage>("idle");
  const [queue, setQueue] = useState<{ total: number; position: number; since: number; band?: number } | null>(null);
  const [match, setMatch] = useState<{ id: string; region: string; total: number; you: Player; opponent: Player; questions: Question[]; startsAt: number } | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [index, setIndex] = useState(0);
  const [endsAt, setEndsAt] = useState(0);
  const [scores, setScores] = useState<{ you: number; opponent: number }>({ you: 0, opponent: 0 });
  const [answered, setAnswered] = useState<number | null>(null);
  const [reveal, setReveal] = useState<{ correct: number; why: string } | null>(null);
  const [hidden, setHidden] = useState<number[]>([]);
  const [usedThisQuestion, setUsedThisQuestion] = useState<string[]>([]);
  const [inventory, setInventory] = useState<Record<string, number>>(initialInventory);
  const [result, setResult] = useState<Result | null>(null);
  const [credits, setCredits] = useState(user.credits);
  const [record, setRecord] = useState(stats);
  const [offline, setOffline] = useState(false);
  const [busy, setBusy] = useState(false);

  // Client clock is nudged to the server's clock so both players see the same
  // deadline. Any drift beyond a second is corrected on every timed event.
  const offsetRef = useRef(0);
  const [now, setNow] = useState(() => Date.now());

  // Matchmaking is global. The arena region below only decides which regional
  // ladder the learner appears on; it never restricts who they can play.
  const [arenaRegion, setArenaRegion] = useState(() => user.arenaRegion || defaultArenaRegion(user.marketRegion));
  const [rating, setRating] = useState(user.rating);

  const adoptRegion = useCallback((value: unknown) => {
    if (typeof value === "string" && value) setArenaRegion(value);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!socket) return;

    const sync = (serverNow?: number) => {
      if (typeof serverNow === "number" && serverNow > 0) offsetRef.current = serverNow - Date.now();
    };

    const onQueued = (d: any) => {
      sync(d?.serverNow);
      adoptRegion(d?.arenaRegion);
      if (typeof d?.rating === "number") setRating(d.rating);
      setStage("searching");
      setQueue({
        total: d?.total ?? 0,
        position: d?.position ?? 1,
        since: d?.since ?? Date.now(),
        band: d?.band,
      });
    };

    const onQueue = (d: any) => {
      if (typeof d?.total !== "number") return;
      setQueue((prev) => (prev ? { ...prev, total: d.total } : prev));
    };

    const onMatched = (d: any) => {
      sync(d?.serverNow);
      adoptRegion(d?.you?.region);
      if (typeof d?.you?.rating === "number") setRating(d.you.rating);
      setMatch({
        id: d.matchId, region: d.region, total: d.total,
        you: d.you, opponent: d.opponent, questions: d.questions ?? [],
        startsAt: d.startsAt ?? Date.now() + 5000,
      });
      setScores({ you: 0, opponent: 0 });
      setQuestion(null);
      setReveal(null);
      setAnswered(null);
      setHidden([]);
      setUsedThisQuestion([]);
      setResult(null);
      setOffline(false);
      setStage("lobby");
      setBusy(false);
    };

    const applyQuestion = (d: any) => {
      sync(d?.serverNow);
      setMatch((prev) => (prev ? { ...prev, id: d.matchId ?? prev.id } : prev));
      setIndex(d.index);
      setQuestion({
        id: d.index, cat: d.cat, level: d.level ?? 1,
        prompt: d.prompt, options: d.options,
      });
      setEndsAt(d.endsAt);
      setAnswered(null);
      setReveal(null);
      setHidden([]);
      setUsedThisQuestion([]);
      setScores({
        you: typeof d.you?.score === "number" ? d.you.score : 0,
        opponent: typeof d.opponent?.score === "number" ? d.opponent.score : 0,
      });
      setStage("battle");
      setBusy(false);
    };

    const onResume = (d: any) => {
      sync(d?.serverNow);
      adoptRegion(d?.you?.region);
      if (typeof d?.you?.rating === "number") setRating(d.you.rating);
      setMatch({
        id: d.matchId, region: d.region, total: d.total,
        you: d.you, opponent: d.opponent, questions: d.questions ?? [],
        startsAt: d.startedAt ?? Date.now(),
      });
      setScores({ you: d.you?.score ?? 0, opponent: d.opponent?.score ?? 0 });
      if (d.question) {
        setQuestion({
          id: d.question.index, cat: d.question.cat, level: d.question.level ?? 1,
          prompt: d.question.prompt, options: d.question.options,
        });
        setIndex(d.question.index);
        setEndsAt(d.question.endsAt);
        setAnswered(d.question.answered ? -2 : null);
        setStage("battle");
      } else {
        setStage("lobby");
      }
      setOffline(false);
    };

    const onProgress = (d: any) => {
      if (!d?.scores) return;
      const you = d.scores[user.id] ?? 0;
      const opp = Object.entries(d.scores).find(([id]) => Number(id) !== user.id)?.[1] ?? 0;
      setScores({ you, opponent: Number(opp) });
    };

    const onReveal = (d: any) => {
      setReveal({ correct: d.correct, why: d.why });
      if (d.scores) {
        const opp = Object.entries(d.scores).find(([id]) => Number(id) !== user.id)?.[1] ?? 0;
        setScores({ you: d.scores[user.id] ?? 0, opponent: Number(opp) });
      }
    };

    const onResult = (d: any) => {
      setResult(d);
      setStage("result");
      setQuestion(null);
      setOffline(false);
      setBusy(false);
      adoptRegion(d?.region);
      if (typeof d?.you?.rating === "number") setRating(d.you.rating);
      if (d?.you?.credits > 0) {
        setCredits((c) => c + d.you.credits);
        push({
          tone: "reward",
          title: `Arena win — +${d.you.credits} credits`,
          body: `You beat ${d.opponent?.name ?? "your opponent"} ${d.you.score}-${d.opponent?.score ?? 0}.`,
        });
      } else if (d?.draw) {
        push({ tone: "info", title: "Dead heat", body: "Equal scores and equal speed — no credits this round." });
      } else {
        push({ tone: "info", title: "Match lost", body: "No credits this time. Run it back." });
      }
      setRecord((prev) => ({
        matches: (prev?.matches ?? 0) + 1,
        wins: (prev?.wins ?? 0) + (d.winnerId === user.id ? 1 : 0),
        losses: (prev?.losses ?? 0) + (d.winnerId && d.winnerId !== user.id ? 1 : 0),
        draws: (prev?.draws ?? 0) + (d.draw ? 1 : 0),
        correct: (prev?.correct ?? 0) + (d.you?.correct ?? 0),
        answered: (prev?.answered ?? 0) + (d.you?.answered ?? 0),
        credits_won: (prev?.credits_won ?? 0) + (d.you?.credits ?? 0),
        best_streak: prev?.best_streak ?? 0,
        rating: typeof d.you?.rating === "number" ? d.you.rating : prev?.rating ?? 1000,
      }));
    };

    const onApplied = (d: any) => {
      if (d?.powerupId === "fifty" && Array.isArray(d.hide)) {
        setHidden(d.hide);
        push({ tone: "info", title: "50:50 used", body: "Two wrong answers removed." });
      }
      if (d?.powerupId === "freeze") {
        if (d?.by) {
          if (typeof d.endsAt === "number") setEndsAt(d.endsAt);
          push({ tone: "error", title: `${d.by} froze your clock`, body: "Four seconds gone. Answer now." });
        } else {
          push({ tone: "info", title: "Freeze landed", body: "Your opponent just lost four seconds." });
        }
      }
      if (d?.powerupId === "skip") {
        setAnswered(-1);
        push({ tone: "info", title: "Question skipped", body: "No points, no penalty." });
      }
      if (d?.powerupId === "double" && d?.armed) {
        push({ tone: "reward", title: "Double armed", body: "Your next correct answer is worth two." });
      }
    };

    const onUsed = (d: any) => {
      if (Number(d?.userId) === user.id && typeof d?.powerupId === "string") {
        setUsedThisQuestion((prev) => (prev.includes(d.powerupId) ? prev : [...prev, d.powerupId]));
      }
    };

    const onInventory = (d: any) => {
      if (d?.inventory) setInventory(d.inventory);
    };

    const onCredits = (d: any) => {
      if (typeof d?.credits === "number") setCredits(d.credits);
    };

    const onOffline = () => {
      setOffline(true);
      push({ tone: "info", title: "Opponent dropped", body: "They have 12 seconds to reconnect." });
    };
    const onOnline = () => setOffline(false);
    const onError = (d: any) => {
      setBusy(false);
      if (d?.message) push({ tone: "error", title: "Arena", body: d.message });
    };

    const onState = (d: any) => {
      sync(d?.serverNow);
      adoptRegion(d?.arenaRegion);
      if (typeof d?.rating === "number") setRating(d.rating);
      if (d?.inventory) setInventory(d.inventory);
      if (d?.queued === false) {
        setStage((prev) => (prev === "searching" ? "idle" : prev));
        setBusy(false);
      }
    };

    const onHello = (d: any) => {
      sync(d?.serverNow);
      adoptRegion(d?.arenaRegion);
      if (typeof d?.rating === "number") setRating(d.rating);
      if (d?.inventory) setInventory(d.inventory);
    };

    socket.on("arena:queued", onQueued);
    socket.on("arena:queue", onQueue);
    socket.on("arena:matched", onMatched);
    socket.on("arena:question", applyQuestion);
    socket.on("arena:resume", onResume);
    socket.on("arena:progress", onProgress);
    socket.on("arena:reveal", onReveal);
    socket.on("arena:result", onResult);
    socket.on("arena:powerup:applied", onApplied);
    socket.on("arena:powerup:used", onUsed);
    socket.on("arena:inventory", onInventory);
    socket.on("arena:opponent:offline", onOffline);
    socket.on("arena:opponent:online", onOnline);
    socket.on("arena:error", onError);
    socket.on("arena:state", onState);
    socket.on("arena:hello", onHello);
    socket.on("credits:update", onCredits);

    // Restore the current match after a reconnect. The server resumes a live
    // match or returns the queue state, so a dropped socket cannot stall it.
    const onConnect = () => socket.emit("arena:state");
    socket.on("connect", onConnect);
    if (socket.connected) socket.emit("arena:state");

    return () => {
      socket.off("arena:queued", onQueued);
      socket.off("arena:queue", onQueue);
      socket.off("arena:matched", onMatched);
      socket.off("arena:question", applyQuestion);
      socket.off("arena:resume", onResume);
      socket.off("arena:progress", onProgress);
      socket.off("arena:reveal", onReveal);
      socket.off("arena:result", onResult);
      socket.off("arena:powerup:applied", onApplied);
      socket.off("arena:powerup:used", onUsed);
      socket.off("arena:inventory", onInventory);
      socket.off("arena:opponent:offline", onOffline);
      socket.off("arena:opponent:online", onOnline);
      socket.off("arena:error", onError);
      socket.off("arena:state", onState);
      socket.off("arena:hello", onHello);
      socket.off("credits:update", onCredits);
      socket.off("connect", onConnect);
    };
  }, [socket, user.id, push, adoptRegion]);

  const serverNow = useCallback(() => Date.now() + offsetRef.current, []);
  const remainingMs = Math.max(0, endsAt - serverNow());
  const remainingPct = endsAt > 0 ? Math.max(0, Math.min(100, (remainingMs / 12_000) * 100)) : 100;

  const join = useCallback(() => {
    if (!socket || !connected) {
      push({ tone: "error", title: "Not connected", body: "Reconnecting to the arena. Try again in a moment." });
      return;
    }
    setBusy(true);
    setResult(null);
    setStage("searching");
    socket.emit("arena:join");
  }, [socket, connected, push]);

  const cancel = useCallback(() => {
    socket?.emit("arena:leave");
    setStage("idle");
    setBusy(false);
  }, [socket]);

  function answer(choice: number) {
    if (!socket || !match || !question || answered !== null || stage !== "battle" || reveal) return;
    if (remainingMs <= 0) return;
    setAnswered(choice);
    socket.emit("arena:answer", { matchId: match.id, index, choice }, (ack: any) => {
      if (ack?.ok) {
        setReveal({ correct: ack.correctIndex, why: ack.why ?? "" });
      } else if (ack?.error === "too_late") {
        push({ tone: "error", title: "Too late", body: "The clock beat you to it." });
      } else if (ack?.error && ack.error !== "already_answered") {
        setAnswered(null);
      }
    });
  }

  function usePowerup(powerupId: string) {
    if (!socket || !match || !question || stage !== "battle") return;
    if ((inventory[powerupId] ?? 0) <= 0) {
      push({ tone: "error", title: "None left", body: "Buy this powerup in the capital shop." });
      return;
    }
    socket.emit("arena:powerup", { matchId: match.id, powerupId }, (ack: any) => {
      if (!ack?.ok) {
        const text: Record<string, string> = {
          none_left: "You have none of those left.",
          already_used: "Already used on this question.",
          already_answered: "Too late — you have already locked an answer.",
          question_closed: "This question has closed.",
        };
        push({ tone: "error", title: "Powerup not used", body: text[ack?.error] ?? "Try again." });
        return;
      }
      if (typeof ack.qty === "number") setInventory((prev) => ({ ...prev, [powerupId]: ack.qty }));
      if (Array.isArray(ack.hide)) setHidden(ack.hide);
    });
  }

  function playAgain() {
    setStage("idle");
    setResult(null);
    join();
  }

  const accuracy = record && record.answered > 0 ? Math.round((record.correct / record.answered) * 100) : 0;
  const winRate = record && record.matches > 0 ? Math.round((record.wins / record.matches) * 100) : 0;

  const ladderTop = useMemo(() => ladder.slice(0, 6), [ladder]);

  return (
    <div className="space-y-4">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8df5d0]">
            <Swords size={12} /> Live quiz arena
          </div>
          <h1 className="mt-1 text-[24px] font-semibold tracking-tight sm:text-[28px]">Beat a real player. Take the credits.</h1>
          <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-muted">
            Five questions. Twelve seconds each. The higher score wins credits, and credits buy simulated capital
            in the shop. A tie goes to the faster player.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 text-[10px] text-muted">
            <Globe2 size={10} className="text-[#8df5d0]" /> Global skill matching · {rating} rating
          </span>
          <span className="flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 text-[10px] text-muted">
            <Trophy size={10} className="text-[#ffd08d]" /> {arenaRegionLabel(arenaRegion)} ladder
          </span>
          <span className={cn("flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px]",
            connected ? "border-[rgba(47,227,160,.2)] bg-[rgba(47,227,160,.06)] text-[#8df5d0]" : "border-[rgba(255,192,97,.22)] bg-[rgba(255,192,97,.06)] text-[#ffd08d]")}>
            {connected ? <Wifi size={10} /> : <WifiOff size={10} />}
            {connected ? "Arena online" : "Reconnecting"}
          </span>
          <span className="flex items-center gap-1.5 rounded-lg border border-[rgba(255,192,97,.22)] bg-[rgba(255,192,97,.08)] px-2.5 py-1.5 text-[11px] font-semibold text-[#ffd08d]">
            <Zap size={12} /> {credits}
          </span>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.55fr_.45fr]">
        {/* stage */}
        <Card className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(70% 60% at 50% 0%, rgba(47,227,160,.07), transparent 70%)" }} />
          <div className="relative">
            {stage === "idle" && (
              <IdleStage
                arenaRegion={arenaRegion}
                rating={rating}
                queue={queue}
                onJoin={join}
                busy={busy}
                connected={connected}
                credits={credits}
              />
            )}
            {stage === "searching" && (
              <SearchStage
                arenaRegion={arenaRegion}
                rating={rating}
                queue={queue}
                onCancel={cancel}
                online={online}
              />
            )}
            {stage === "lobby" && match && <LobbyStage match={match} now={serverNow} />}
            {stage === "battle" && match && question && (
              <BattleStage
                match={match}
                question={question}
                index={index}
                scores={scores}
                answered={answered}
                reveal={reveal}
                hidden={hidden}
                remainingMs={remainingMs}
                remainingPct={remainingPct}
                usedThisQuestion={usedThisQuestion}
                inventory={inventory}
                onAnswer={answer}
                onPowerup={usePowerup}
              />
            )}
            {stage === "result" && result && <ResultStage result={result} user={user} onAgain={playAgain} />}
          </div>
        </Card>

        {/* rail */}
        <div className="space-y-3">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                <Target size={12} className="text-[#5beeb9]" /> Your record
              </div>
              {rank && <Badge tone="green">#{rank} in {arenaRegionLabel(arenaRegion)}</Badge>}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <MiniStat label="Wins" value={record?.wins ?? 0} tone="text-[#8df5d0]" />
              <MiniStat label="Win rate" value={`${winRate}%`} tone="text-[#eafff7]" />
              <MiniStat label="Credits won" value={record?.credits_won ?? 0} tone="text-[#ffd08d]" />
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-[10px] text-muted"><span>Accuracy</span><span className="num">{accuracy}%</span></div>
              <Progress value={accuracy} tone="green" />
              <div className="flex items-center justify-between text-[10px] text-muted"><span>Matches</span><span className="num">{record?.matches ?? 0}</span></div>
              <div className="flex items-center justify-between text-[10px] text-muted"><span>Best streak</span><span className="num">{record?.best_streak ?? 0}</span></div>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                <Trophy size={12} className="text-[#ffd08d]" /> {arenaRegionLabel(arenaRegion)} ladder
              </div>
              <Link href="/leaderboard" className="text-[9.5px] font-medium text-[#5beeb9] hover:underline">All</Link>
            </div>
            {ladderTop.length === 0 ? (
              <div className="px-4 py-6 text-center text-[11px] text-muted">No matches yet. Be the first name here.</div>
            ) : (
              <ul className="divide-y divide-white/[0.04]">
                {ladderTop.map((row, i) => (
                  <li key={row.id} className={cn("flex items-center gap-2.5 px-4 py-2.5", row.id === user.id && "bg-[rgba(47,227,160,.04)]")}>
                    <span className={cn("num w-4 text-[10px] font-semibold", i === 0 ? "text-[#ffd08d]" : "text-muted/60")}>{row.rank ?? i + 1}</span>
                    <Avatar name={row.name} size={22} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[11px] font-semibold">{row.name}</div>
                      <div className="text-[9px] text-muted">{row.wins}W · {row.matches} played</div>
                    </div>
                    <div className="text-right">
                      <div className="num text-[10px] font-semibold text-[#8df5d0]">{row.rating}</div>
                      <div className="text-[8px] text-muted">rating</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
              <Coins size={12} className="text-[#ffd08d]" /> How the rewards work
            </div>
            <ul className="mt-3 space-y-2 text-[10.5px] leading-relaxed text-muted">
              <li className="flex gap-2"><span className="text-[#5beeb9]">+</span> Winner earns 10 credits per correct answer, up to 60.</li>
              <li className="flex gap-2"><span className="text-[#ff8fa3]">−</span> The loser earns nothing. A draw pays nothing.</li>
              <li className="flex gap-2"><span className="text-[#5beeb9]">+</span> Spend credits in the shop to add simulated capital.</li>
              <li className="flex gap-2"><span className="text-[#b3a8ff]">⚡</span> Powerups can swing a close match — buy them in the shop.</li>
            </ul>
            <Link href="/shop" className="btn btn-ghost btn-sm mt-3 w-full">Open the shop <ArrowRight size={12} /></Link>
          </Card>
        </div>
      </div>

      {/* history */}
      <Card className="overflow-hidden">
        <div className="border-b border-white/[0.06] px-4 py-3 sm:px-5">
          <SectionHead title="Recent battles" subtitle="Your last matches, newest first" />
        </div>
        {history.length === 0 ? (
          <div className="px-5 py-10 text-center text-[11.5px] text-muted">
            No battles yet. Your first result will appear here.
          </div>
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {history.map((m) => {
              const isP1 = m.p1 === user.id;
              const mine = isP1 ? m.p1_score : m.p2_score;
              const theirs = isP1 ? m.p2_score : m.p1_score;
              const opponent = isP1 ? m.p2_name : m.p1_name;
              const opponentRegion = isP1 ? m.p2_region : m.p1_region;
              const won = m.winner_id === user.id;
              return (
                <li key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                  <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                    won ? "border-[rgba(47,227,160,.22)] bg-[rgba(47,227,160,.07)] text-[#5beeb9]" : "border-white/[0.07] bg-white/[0.03] text-muted")}>
                    {won ? <Crown size={14} /> : <Swords size={14} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11.5px] font-semibold">vs {opponent}</div>
                    <div className="text-[9.5px] text-muted">
                      {timeAgo(m.started_at)} · {arenaRegionLabel(opponentRegion)} · {m.region === "IN" ? "INR" : "USD"} questions
                    </div>
                  </div>
                  <div className={cn("num text-[12px] font-semibold", mine > theirs ? "text-[#8df5d0]" : mine < theirs ? "text-[#ff8fa3]" : "text-muted")}>
                    {mine} – {theirs}
                  </div>
                  <div className="num w-14 text-right text-[10px] font-semibold text-[#ffd08d]">
                    {won ? `+${m.credits_awarded}` : "0"} cr
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* stages                                                              */
/* ------------------------------------------------------------------ */

function MiniStat({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-2 py-2.5">
      <div className={cn("num text-[16px] font-semibold leading-none", tone)}>{value}</div>
      <div className="mt-1 text-[8.5px] font-semibold uppercase tracking-[0.12em] text-muted/70">{label}</div>
    </div>
  );
}

function IdleStage({
  arenaRegion, rating, queue, onJoin, busy, connected, credits,
}: {
  arenaRegion: string; rating: number;
  queue: { total: number } | null;
  onJoin: () => void; busy: boolean; connected: boolean; credits: number;
}) {
  return (
    <div className="p-6 sm:p-10">
      <div className="mx-auto max-w-[560px] text-center">
        <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center">
          <span className="absolute inset-0 rounded-full border border-[rgba(47,227,160,.16)]" />
          <span className="absolute inset-3 rounded-full border border-[rgba(47,227,160,.22)]" />
          <span className="absolute inset-6 rounded-full border border-[rgba(47,227,160,.3)]" />
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[rgba(47,227,160,.35)] bg-[rgba(47,227,160,.12)] text-[#5beeb9] shadow-[0_0_40px_rgba(47,227,160,.25)]">
            <Swords size={22} />
          </span>
        </div>

        <h2 className="text-[22px] font-semibold tracking-tight sm:text-[26px]">A real opponent, right now.</h2>
        <p className="mx-auto mt-2 max-w-[430px] text-[12px] leading-relaxed text-muted">
          Matchmaking is global and skill-based, so your opponent can be anywhere in the world. You are paired
          with the closest rating available. Both of you get the same five questions, in the same order, with the
          same clock.
        </p>

        <div className="mx-auto mt-5 flex max-w-[440px] flex-wrap items-center justify-center gap-2 text-[10px]">
          <span className="rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 text-muted">
            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-[#2fe3a0]" />
            {queue?.total ?? 0} searching worldwide
          </span>
          <span className="rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 text-muted">
            <Target size={10} className="mr-1 inline text-[#5beeb9]" /> {rating} rating
          </span>
          <span className="rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 text-muted">5 questions · 12s each</span>
          <span className="rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 text-muted">{credits} credits</span>
        </div>

        <button onClick={onJoin} disabled={busy || !connected} className="btn btn-primary btn-lg mt-6 w-full max-w-[300px]">
          {busy ? <><Loader2 size={15} className="animate-spin" /> Finding an opponent</> : <><Crosshair size={15} /> Find opponent</>}
        </button>
        <div className="mt-3 text-[9.5px] text-muted/70">
          {connected ? "Global skill matching · no bots, no fake players" : "Connecting to the arena…"}
        </div>
        <div className="mt-1.5 text-[9.5px] text-muted/60">
          Your {arenaRegionLabel(arenaRegion)} ladder is set in{" "}
          <Link href="/settings" className="font-semibold text-[#8df5d0] underline-offset-2 hover:underline">
            settings
          </Link>
          . It never limits who you can play.
        </div>
      </div>
    </div>
  );
}

function SearchStage({
  arenaRegion, rating, queue, onCancel, online,
}: {
  arenaRegion: string; rating: number;
  queue: { total: number; position: number; since: number; band?: number } | null;
  onCancel: () => void; online: number;
}) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const waiting = queue?.total ?? 0;
  const bandText = typeof queue?.band === "number"
    ? Number.isFinite(queue.band) ? `±${queue.band}` : "any rating"
    : "widening";

  return (
    <div className="p-6 sm:p-10">
      <div className="mx-auto max-w-[480px] text-center">
        <div className="relative mx-auto mb-7 flex h-28 w-28 items-center justify-center">
          <span className="arena-ring absolute inset-0 rounded-full border border-[rgba(47,227,160,.3)]" />
          <span className="arena-ring arena-ring-2 absolute inset-3 rounded-full border border-[rgba(47,227,160,.22)]" />
          <span className="arena-ring arena-ring-3 absolute inset-6 rounded-full border border-[rgba(47,227,160,.16)]" />
          <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-[rgba(47,227,160,.35)] bg-[rgba(47,227,160,.12)] text-[#5beeb9]">
            <Crosshair size={24} />
          </span>
        </div>
        <h2 className="text-[21px] font-semibold tracking-tight">Searching worldwide for a skill match</h2>
        <p className="mt-2 text-[11.5px] leading-relaxed text-muted">
          Pairing the closest rating first, then widening the band the longer you wait. Keep this tab open — the
          match starts the moment an opponent joins.
        </p>
        <div className="num mt-4 text-[26px] font-semibold text-[#8df5d0]">{elapsed}s</div>
        <div className="mt-1 text-[10px] text-muted">
          {waiting} searching · {rating} rating · band {bandText} · {online} online app-wide
        </div>
        <div className="mt-1.5 text-[9.5px] text-muted/60">
          Your leaderboard region is {arenaRegionLabel(arenaRegion)}. It does not restrict opponents.
        </div>
        <button onClick={onCancel} className="btn btn-ghost btn-sm mt-5">Cancel search</button>
      </div>
    </div>
  );
}

function LobbyStage({ match, now }: { match: { you: Player; opponent: Player; total: number; region: string; startsAt: number }; now: () => number }) {
  const [left, setLeft] = useState(() => Math.max(0, Math.ceil((match.startsAt - now()) / 1000)));
  useEffect(() => {
    setLeft(Math.max(0, Math.ceil((match.startsAt - now()) / 1000)));
    const t = setInterval(() => {
      setLeft(Math.max(0, Math.ceil((match.startsAt - now()) / 1000)));
    }, 200);
    return () => clearInterval(t);
  }, [match.startsAt, now]);

  return (
    <div className="p-6 sm:p-10">
      <div className="mx-auto max-w-[560px] text-center">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8df5d0]">Opponent found</div>
        <div className="mt-6 flex items-center justify-center gap-5 sm:gap-8">
          <PlayerCard
            name={match.you.name}
            avatar={match.you.avatar}
            label={`You${match.you.rating ? ` · ${match.you.rating}` : ""}`}
            tone="green"
          />
          <div className="text-[26px] font-semibold tracking-tighter text-muted/50">VS</div>
          <PlayerCard
            name={match.opponent.name}
            avatar={match.opponent.avatar}
            label={`${arenaRegionLabel(match.opponent.region)}${match.opponent.rating ? ` · ${match.opponent.rating}` : ""}`}
            tone="violet"
          />
        </div>
        <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-[10.5px] text-muted">
          <Clock3 size={12} className="text-[#5beeb9]" /> {match.total} questions · 12 seconds each ·{" "}
          {match.region === "IN" ? "INR" : "USD"} questions for both
        </div>
        <div className="num mt-5 text-[22px] font-semibold text-[#8df5d0]">{left > 0 ? `Starting in ${left}` : "Go"}</div>
      </div>
    </div>
  );
}

function PlayerCard({ name, avatar, label, tone }: { name: string; avatar: string; label: string; tone: "green" | "violet" }) {
  return (
    <div className="flex w-[130px] flex-col items-center gap-2">
      <div className={cn("rounded-2xl border p-1",
        tone === "green" ? "border-[rgba(47,227,160,.3)] bg-[rgba(47,227,160,.08)]" : "border-[rgba(139,123,255,.3)] bg-[rgba(139,123,255,.08)]")}>
        <Avatar name={name || avatar} size={56} />
      </div>
      <div className="max-w-full truncate text-[12px] font-semibold">{name}</div>
      <div className={cn("text-[8.5px] font-semibold uppercase tracking-[0.14em]",
        tone === "green" ? "text-[#8df5d0]" : "text-[#b3a8ff]")}>{label}</div>
    </div>
  );
}

function BattleStage({
  match, question, index, scores, answered, reveal, hidden, remainingMs, remainingPct,
  usedThisQuestion, inventory, onAnswer, onPowerup,
}: {
  match: { you: Player; opponent: Player; total: number; id: string };
  question: Question; index: number;
  scores: { you: number; opponent: number };
  answered: number | null;
  reveal: { correct: number; why: string } | null;
  hidden: number[];
  remainingMs: number; remainingPct: number;
  usedThisQuestion: string[];
  inventory: Record<string, number>;
  onAnswer: (choice: number) => void;
  onPowerup: (id: string) => void;
}) {
  const locked = answered !== null || remainingMs <= 0 || Boolean(reveal);
  const letters = ["A", "B", "C", "D"];

  return (
    <div className="p-4 sm:p-6">
      {/* scorebar */}
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Avatar name={match.you.name} size={26} />
          <div className="min-w-0">
            <div className="truncate text-[11px] font-semibold">You</div>
            <div className="num text-[15px] font-semibold leading-none text-[#8df5d0]">{scores.you}</div>
          </div>
        </div>
        <div className="shrink-0 rounded-full border border-white/[0.08] bg-black/25 px-2.5 py-1 text-[9.5px] font-semibold text-muted">
          Q{index + 1} / {match.total}
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 text-right">
          <div className="min-w-0">
            <div className="truncate text-[11px] font-semibold">{match.opponent.name}</div>
            <div className="num text-[15px] font-semibold leading-none text-[#b3a8ff]">{scores.opponent}</div>
          </div>
          <Avatar name={match.opponent.name} size={26} />
        </div>
      </div>

      {/* clock */}
      <div className="mt-3">
        <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className={cn("h-full rounded-full transition-[width] duration-100",
              remainingMs <= 3000 ? "bg-[#ff5d7a]" : remainingMs <= 6500 ? "bg-[#ffc061]" : "bg-[#2fe3a0]")}
            style={{ width: `${remainingPct}%` }}
          />
        </div>
        <div className="mt-1 flex items-center justify-between text-[9px] text-muted/70">
          <span className="flex items-center gap-1"><Timer size={9} /> {(remainingMs / 1000).toFixed(1)}s</span>
          <span>{question.cat} · level {question.level}</span>
        </div>
      </div>

      {/* question */}
      <div className="mt-4 rounded-2xl border border-white/[0.07] bg-black/20 p-4 sm:p-5">
        <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#8df5d0]">
          <ShieldQuestion size={11} /> Question {index + 1}
        </div>
        <h2 className="mt-2 text-[15px] font-semibold leading-snug sm:text-[17px]">{question.prompt}</h2>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {question.options.map((option, i) => {
            const isHidden = hidden.includes(i);
            const isChosen = answered === i;
            const isCorrect = reveal?.correct === i;
            const isWrong = Boolean(reveal) && isChosen && reveal?.correct !== i;
            if (isHidden && !reveal) {
              return (
                <div key={i} className="flex items-center gap-2 rounded-xl border border-dashed border-white/[0.06] bg-white/[0.01] px-3 py-3 text-[11px] text-muted/40">
                  <span className="flex h-5 w-5 items-center justify-center rounded border border-white/[0.06] text-[9px]">{letters[i]}</span>
                  Removed by 50:50
                </div>
              );
            }
            return (
              <button
                key={i}
                onClick={() => onAnswer(i)}
                disabled={locked}
                className={cn(
                  "flex items-start gap-2.5 rounded-xl border px-3 py-3 text-left text-[11.5px] leading-snug transition",
                  !reveal && !locked && "border-white/[0.08] bg-white/[0.025] hover:border-[rgba(47,227,160,.35)] hover:bg-[rgba(47,227,160,.06)]",
                  !reveal && locked && !isChosen && "border-white/[0.06] bg-white/[0.015] opacity-60",
                  isChosen && !reveal && "border-[rgba(139,123,255,.45)] bg-[rgba(139,123,255,.12)]",
                  isCorrect && "border-[rgba(47,227,160,.5)] bg-[rgba(47,227,160,.14)] text-[#eafff7]",
                  isWrong && "border-[rgba(255,93,122,.45)] bg-[rgba(255,93,122,.1)] text-[#ffc4cf]",
                  reveal && !isCorrect && !isChosen && "border-white/[0.05] bg-white/[0.01] opacity-45"
                )}
              >
                <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[9px] font-semibold",
                  isCorrect ? "border-[#2fe3a0] text-[#04140d] bg-[#2fe3a0]" :
                  isWrong ? "border-[#ff5d7a] text-white bg-[#ff5d7a]" : "border-white/[0.12] text-muted")}>
                  {letters[i]}
                </span>
                <span className="min-w-0 flex-1">{option}</span>
              </button>
            );
          })}
        </div>

        {reveal && (
          <div className="mt-3 rounded-xl border border-[rgba(47,227,160,.18)] bg-[rgba(47,227,160,.05)] px-3 py-2.5 text-[10.5px] leading-relaxed text-[#c9f7e6]">
            <span className="font-semibold text-[#5beeb9]">Why: </span>{reveal.why || "Answer locked in."}
          </div>
        )}
        {!reveal && remainingMs <= 0 && (
          <div className="mt-3 text-center text-[10.5px] text-[#ff8fa3]">Time up — locking this question.</div>
        )}
        {answered !== null && !reveal && (
          <div className="mt-3 flex items-center justify-center gap-2 text-[10.5px] text-muted">
            <Loader2 size={11} className="animate-spin" /> Answer locked. Waiting for the reveal…
          </div>
        )}
      </div>

      {/* powerups */}
      <div className="mt-3">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted/70">Powerups</span>
          <Link href="/shop" className="text-[9px] font-medium text-[#5beeb9] hover:underline">Buy more</Link>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {POWERUP_LIST.map((p) => {
            const qty = inventory[p.id] ?? 0;
            const used = usedThisQuestion.includes(p.id);
            const disabled = qty <= 0 || used || locked;
            return (
              <button
                key={p.id}
                onClick={() => onPowerup(p.id)}
                disabled={disabled}
                title={p.description}
                className={cn("flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition",
                  disabled ? "border-white/[0.05] bg-white/[0.01] opacity-45" : "border-white/[0.08] bg-white/[0.025] hover:border-[#2fe3a0]/35 hover:bg-[rgba(47,227,160,.05)]")}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-white/[0.08] bg-black/25 text-[#8df5d0]">
                  {p.id === "fifty" ? <span className="text-[8px] font-bold">50</span>
                    : p.id === "skip" ? <SkipForward size={11} />
                    : p.id === "freeze" ? <Snowflake size={11} />
                    : <Flame size={11} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[9.5px] font-semibold">{p.short}</span>
                  <span className="block text-[8px] text-muted">×{qty}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ResultStage({ result, user, onAgain }: { result: Result; user: { name: string }; onAgain: () => void }) {
  const won = result.you.won;
  return (
    <div className="p-6 sm:p-9">
      <div className="mx-auto max-w-[520px] text-center">
        <div className={cn("mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border",
          won ? "border-[rgba(255,192,97,.35)] bg-[rgba(255,192,97,.12)] text-[#ffd08d]"
            : result.draw ? "border-white/[0.12] bg-white/[0.04] text-muted"
            : "border-[rgba(139,123,255,.3)] bg-[rgba(139,123,255,.08)] text-[#b3a8ff]")}>
          {won ? <Crown size={24} /> : result.draw ? <Medal size={24} /> : <Swords size={24} />}
        </div>

        <h2 className="mt-4 text-[24px] font-semibold tracking-tight">
          {won ? "You took the credits" : result.draw ? "Dead heat" : "Not this time"}
        </h2>
        <p className="mt-1.5 text-[11.5px] text-muted">
          {won
            ? `+${result.you.credits} credits added. Spend them in the shop to fund your next trade.`
            : result.draw
              ? "Equal scores and equal speed. Neither player earns credits."
              : "Your opponent scored higher. No credits — run it back."}
        </p>

        <div className="mt-6 flex items-center justify-center gap-4 sm:gap-8">
          <div className="flex-1 rounded-xl border border-[rgba(47,227,160,.2)] bg-[rgba(47,227,160,.05)] px-3 py-3">
            <div className="truncate text-[10.5px] font-semibold">{user.name}</div>
            <div className="num mt-1 text-[26px] font-semibold leading-none text-[#8df5d0]">{result.you.score}</div>
            <div className="mt-1 text-[8.5px] uppercase tracking-[0.12em] text-muted">{result.you.correct}/{result.total} correct</div>
          </div>
          <div className="shrink-0 text-[11px] font-semibold text-muted/50">vs</div>
          <div className="flex-1 rounded-xl border border-[rgba(139,123,255,.2)] bg-[rgba(139,123,255,.05)] px-3 py-3">
            <div className="truncate text-[10.5px] font-semibold">{result.opponent.name}</div>
            <div className="num mt-1 text-[26px] font-semibold leading-none text-[#b3a8ff]">{result.opponent.score}</div>
            <div className="mt-1 text-[8.5px] uppercase tracking-[0.12em] text-muted">
              {result.opponent.correct}/{result.total} correct · {arenaRegionLabel(result.opponent.region)}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[9.5px] text-muted">
          <span className="rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1">
            {result.reason === "forfeit" ? "Won by forfeit" : "Match complete"}
          </span>
          <span className="rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1">
            Your speed: {(result.you.ms / 1000).toFixed(1)}s total
          </span>
          <span className={cn("rounded-full border px-2.5 py-1",
            !result.you.ratingDelta ? "border-white/[0.07] bg-white/[0.03]"
              : result.you.ratingDelta > 0 ? "border-[rgba(47,227,160,.25)] bg-[rgba(47,227,160,.07)] text-[#8df5d0]"
              : "border-[rgba(255,93,122,.25)] bg-[rgba(255,93,122,.07)] text-[#ffb3c0]")}>
            {result.you.ratingDelta > 0 ? "+" : ""}{result.you.ratingDelta} rating · {result.you.rating}
          </span>
          <span className={cn("rounded-full border px-2.5 py-1",
            won ? "border-[rgba(255,192,97,.25)] bg-[rgba(255,192,97,.07)] text-[#ffd08d]" : "border-white/[0.07] bg-white/[0.03]")}>
            +{result.you.credits} credits
          </span>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <button onClick={onAgain} className="btn btn-primary"><RefreshCw size={13} /> Play again</button>
          <Link href="/leaderboard" className="btn btn-ghost"><Trophy size={13} /> Leaderboard</Link>
          <Link href="/shop" className="btn btn-ghost"><Coins size={13} /> Use credits</Link>
        </div>
      </div>
    </div>
  );
}
