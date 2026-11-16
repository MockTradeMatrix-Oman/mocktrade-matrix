"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowRight, Check, Crown, Flame, Loader2, Lock, RotateCcw, ShieldQuestion,
  Skull, Sparkles, Swords, Timer, Trophy, X, Zap,
} from "lucide-react";
import { Badge, Card, Progress, SectionHead, cn } from "./ui";
import { useToast } from "./toast";
import { useCelebration } from "./celebrate";

type Boss = {
  key: string;
  name: string;
  tagline: string;
  brief: string;
  focus: string;
  accent: "amber" | "violet" | "cyan" | "green";
};

type Status = {
  premium: boolean;
  monthKey: string;
  boss: Boss;
  daysLeft: number;
  attempts: number;
  bestPercent: number | null;
  passed: boolean;
  rewarded: boolean;
  activeAttemptId: number | null;
  reward: { credits: number; xp: number };
  passMark: number;
  questions: number;
  durationMs: number;
};

type Question = { id: number; prompt: string; options: string[]; module: string };
type StartResult = {
  attemptId: number;
  boss: Boss;
  monthKey: string;
  questions: Question[];
  startedAt: number;
  endsAt: number;
  passMark: number;
  resumed: boolean;
};
type Review = {
  id: number;
  prompt: string;
  options: string[];
  choice: number | null;
  correct: number;
  ok: boolean;
  explanation: string;
  module: string;
};
type Result = {
  score: number;
  total: number;
  percent: number;
  passed: boolean;
  passMark: number;
  boss: Boss;
  review: Review[];
  xp: number;
  credits: number;
  firstPass: boolean;
  status: Status;
};
type HistoryRow = {
  id: number;
  monthKey: string;
  boss: Boss;
  score: number;
  total: number;
  percent: number;
  passed: boolean;
  playedAt: number;
};

const ACCENT: Record<Boss["accent"], { color: string; border: string; bg: string }> = {
  amber: { color: "#ffd08d", border: "rgba(255,192,97,.3)", bg: "rgba(255,192,97,.08)" },
  violet: { color: "#b3a8ff", border: "rgba(139,123,255,.3)", bg: "rgba(139,123,255,.08)" },
  cyan: { color: "#7fdcff", border: "rgba(76,201,240,.3)", bg: "rgba(76,201,240,.08)" },
  green: { color: "#5beeb9", border: "rgba(47,227,160,.3)", bg: "rgba(47,227,160,.08)" },
};

function clock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export function BossBattle({
  status: initialStatus,
  history,
}: {
  status: Status;
  history: HistoryRow[];
}) {
  const router = useRouter();
  const { push } = useToast();
  const { celebrate } = useCelebration();
  const [status, setStatus] = useState(initialStatus);
  const [phase, setPhase] = useState<"idle" | "playing" | "result">("idle");
  const [run, setRun] = useState<StartResult | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<number, number>>(new Map());
  const [remaining, setRemaining] = useState(initialStatus.durationMs);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const submitted = useRef(false);
  const answersRef = useRef<Map<number, number>>(new Map());
  const runRef = useRef<StartResult | null>(null);

  const accent = ACCENT[status.boss.accent] ?? ACCENT.amber;

  const finish = useCallback(
    async (finalAnswers: Map<number, number>, currentRun: StartResult | null) => {
      if (submitted.current || !currentRun) return;
      submitted.current = true;
      setSubmitting(true);
      try {
        const res = await fetch("/api/fun/boss", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "submit",
            attemptId: currentRun.attemptId,
            answers: Array.from(finalAnswers.entries()).map(([id, choice]) => ({ id, choice })),
          }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error ?? "Could not submit this battle.");
        const value = data as Result;
        setResult(value);
        setStatus(value.status);
        setPhase("result");
        if (value.passed) {
          push({
            tone: "reward",
            title: `${value.boss.name} defeated`,
            body: value.firstPass
              ? `+${value.xp} XP and +${value.credits} credits. First clear this month.`
              : "Already rewarded this month. The clear still counts.",
          });
          celebrate({
            tone: "amber",
            title: `Boss defeated · ${value.percent}%`,
            body: value.firstPass ? `+${value.xp} XP · +${value.credits} credits` : "Retake clear",
          });
        } else {
          push({
            tone: "error",
            title: `${value.percent}% — below the ${value.passMark}% mark`,
            body: "Read the review, then take the boss again. Retakes are free.",
          });
        }
        router.refresh();
      } catch (error) {
        push({
          tone: "error",
          title: "Battle not submitted",
          body: error instanceof Error ? error.message : "Try again in a moment.",
        });
        submitted.current = false;
      } finally {
        setSubmitting(false);
      }
    },
    [celebrate, push, router]
  );

  useEffect(() => {
    if (phase !== "playing" || !run) return;
    const tick = () => {
      const left = run.endsAt - Date.now();
      setRemaining(left);
      if (left <= 0) finish(answersRef.current, runRef.current);
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [phase, run, finish]);

  async function start() {
    if (starting) return;
    setStarting(true);
    try {
      const res = await fetch("/api/fun/boss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not start the boss battle.");
      const value = data as StartResult;
      submitted.current = false;
      answersRef.current = new Map();
      runRef.current = value;
      setRun(value);
      setAnswers(new Map());
      setIndex(0);
      setResult(null);
      setRemaining(value.endsAt - Date.now());
      setPhase("playing");
      if (value.resumed) push({ tone: "info", title: "Battle resumed", body: "Your timer kept running." });
    } catch (error) {
      push({
        tone: "error",
        title: "Could not start",
        body: error instanceof Error ? error.message : "Try again in a moment.",
      });
    } finally {
      setStarting(false);
    }
  }

  function choose(option: number) {
    if (!run) return;
    const question = run.questions[index];
    if (!question) return;
    const next = new Map(answersRef.current);
    next.set(question.id, option);
    answersRef.current = next;
    setAnswers(next);
  }

  if (phase === "idle") {
    return (
      <div className="space-y-4">
        <Card className="overflow-hidden">
          <div className="relative p-5 sm:p-6">
            <div
              className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full"
              style={{ background: `radial-gradient(circle, ${accent.bg}, transparent 65%)` }}
            />
            <div className="relative flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border"
                  style={{ borderColor: accent.border, background: accent.bg, color: accent.color }}
                >
                  <Skull size={30} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={status.boss.accent}><Swords size={9} /> Monthly boss</Badge>
                    <Badge tone="neutral"><Timer size={9} /> {Math.round(status.durationMs / 60_000)} min</Badge>
                    <Badge tone="red"><Lock size={9} /> {status.passMark}% to pass</Badge>
                  </div>
                  <h1 className="mt-2 text-[24px] font-semibold leading-tight tracking-tight sm:text-[28px]">
                    {status.boss.name}
                  </h1>
                  <p className="mt-1 max-w-xl text-[12px] leading-relaxed text-muted">{status.boss.tagline}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="eyebrow">Window closes</div>
                <div className="num mt-1 text-[20px] font-semibold" style={{ color: accent.color }}>
                  {status.daysLeft === 0 ? "Today" : `${status.daysLeft} day${status.daysLeft === 1 ? "" : "s"}`}
                </div>
              </div>
            </div>

            <p className="relative mt-4 max-w-2xl text-[12px] leading-relaxed text-[#c9d2e2]">
              {status.boss.brief}
            </p>

            <div className="relative mt-5 grid gap-2 sm:grid-cols-4">
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
                <div className="eyebrow">Questions</div>
                <div className="num mt-1 text-[19px] font-semibold">{status.questions}</div>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
                <div className="eyebrow">Focus</div>
                <div className="mt-1 text-[11.5px] font-semibold">{status.boss.focus}</div>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
                <div className="eyebrow">First clear</div>
                <div className="mt-1 flex items-center gap-2 text-[11.5px] font-semibold">
                  <span className="text-[#ffd08d]">+{status.reward.xp} XP</span>
                  <span className="text-[#7fdcff]">+{status.reward.credits}</span>
                </div>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
                <div className="eyebrow">Your best</div>
                <div className="num mt-1 text-[19px] font-semibold" style={{ color: accent.color }}>
                  {status.bestPercent === null ? "—" : `${status.bestPercent}%`}
                </div>
              </div>
            </div>

            <div className="relative mt-5 flex flex-wrap items-center gap-2">
              <button onClick={start} disabled={starting} className="btn btn-primary">
                {starting ? <Loader2 size={14} className="animate-spin" /> : <Swords size={14} />}
                {status.activeAttemptId ? "Resume battle" : status.passed ? "Fight again" : "Face the boss"}
              </button>
              <Link href="/quests" className="btn btn-dark"><Sparkles size={13} /> Daily quests</Link>
              {status.passed ? (
                <Badge tone="green"><Check size={9} /> Cleared this month</Badge>
              ) : (
                <Badge tone="amber"><Flame size={9} /> {status.attempts} attempt{status.attempts === 1 ? "" : "s"}</Badge>
              )}
            </div>
            <p className="relative mt-2 text-[9.5px] text-muted">
              Rewards pay once per calendar month on the first pass. Retakes stay free and never
              reduce a clear.
            </p>
          </div>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <SectionHead title="How a boss works" subtitle="Harder by design, still fair." />
            <div className="mt-3 space-y-2.5">
              {[
                "Questions are drawn from the authored final-assessment bank, hard first.",
                "The paper is fixed when the battle starts, so edits cannot change it mid-run.",
                "Scoring happens on the server. The answer key never reaches the browser.",
                "The timer runs even if you close the tab. Resume from this page.",
              ].map((line) => (
                <div key={line} className="flex items-start gap-2 text-[11px] leading-relaxed text-[#c9d2e2]">
                  <Check size={11} className="mt-0.5 shrink-0 text-[#5beeb9]" /> {line}
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <SectionHead title="Battle history" subtitle="Every recorded attempt." />
            {history.length === 0 ? (
              <div className="mt-4 rounded-xl border border-white/[0.06] bg-black/20 p-4 text-[11.5px] text-muted">
                No boss attempts yet. This month is your first clean slate.
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {history.map((row) => (
                  <div key={row.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2.5">
                    <div className="min-w-0">
                      <div className="truncate text-[11.5px] font-semibold">{row.boss.name}</div>
                      <div className="text-[9.5px] text-muted">
                        {new Date(row.playedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        {" · "}{row.monthKey}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={cn("num text-[13px] font-semibold", row.passed ? "text-[#5beeb9]" : "text-[#ff8fa3]")}>
                        {row.percent}%
                      </div>
                      <div className="text-[9px] text-muted">{row.passed ? "Cleared" : "Failed"}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  }

  if (phase === "playing" && run) {
    const question = run.questions[index];
    const answered = answers.size;
    const left = Math.max(0, remaining);
    const pct = Math.max(0, Math.min(100, (left / status.durationMs) * 100));
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[11px] text-muted">
              <Skull size={14} style={{ color: accent.color }} />
              <span className="font-semibold text-ink">{run.boss.name}</span>
              <span className="text-muted/40">·</span>
              <span className="num">{index + 1}/{run.questions.length}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10.5px] text-muted">{answered} answered</span>
              <span className={cn("num flex items-center gap-1 text-[13px] font-semibold", left <= 60_000 ? "text-[#ff8fa3]" : "text-[#7fdcff]")}>
                <Timer size={13} /> {clock(left)}
              </span>
            </div>
          </div>
          <Progress value={pct} tone={left <= 60_000 ? "amber" : "violet"} className="mt-3" />
        </Card>

        <Card className="overflow-hidden">
          <div className="p-5">
            <div className="flex items-center gap-2 text-[9.5px] uppercase tracking-[0.12em] text-muted">
              <ShieldQuestion size={11} /> {question.module}
            </div>
            <div className="mt-2 text-[16px] font-semibold leading-snug tracking-tight">{question.prompt}</div>
            <div className="mt-4 space-y-2">
              {question.options.map((option, optionIndex) => {
                const selected = answers.get(question.id) === optionIndex;
                return (
                  <button
                    key={optionIndex}
                    onClick={() => choose(optionIndex)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left text-[12.5px] transition",
                      selected
                        ? "border-[rgba(139,123,255,.55)] bg-[rgba(139,123,255,.1)] text-ink"
                        : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.16] hover:bg-white/[0.04]"
                    )}
                  >
                    <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[9.5px] font-semibold", selected ? "border-[rgba(139,123,255,.5)] text-[#b3a8ff]" : "border-white/10 text-muted")}>
                      {selected ? <Check size={10} /> : String.fromCharCode(65 + optionIndex)}
                    </span>
                    <span>{option}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="btn btn-dark btn-sm disabled:opacity-40"
          >
            <ArrowLeft size={12} /> Back
          </button>
          <div className="flex flex-wrap items-center gap-1.5">
            {run.questions.map((q, qIndex) => (
              <button
                key={q.id}
                onClick={() => setIndex(qIndex)}
                aria-label={`Question ${qIndex + 1}`}
                className={cn(
                  "h-6 w-6 rounded-md border text-[9px] font-semibold transition",
                  qIndex === index
                    ? "border-[rgba(139,123,255,.6)] bg-[rgba(139,123,255,.16)] text-[#c9c1ff]"
                    : answers.has(q.id)
                      ? "border-[rgba(47,227,160,.35)] bg-[rgba(47,227,160,.1)] text-[#5beeb9]"
                      : "border-white/10 text-muted hover:border-white/25"
                )}
              >
                {qIndex + 1}
              </button>
            ))}
          </div>
          {index + 1 < run.questions.length ? (
            <button onClick={() => setIndex((i) => Math.min(run.questions.length - 1, i + 1))} className="btn btn-dark btn-sm">
              Next <ArrowRight size={12} />
            </button>
          ) : (
            <button
              onClick={() => finish(answersRef.current, runRef.current)}
              disabled={submitting}
              className="btn btn-primary btn-sm"
            >
              {submitting ? <Loader2 size={12} className="animate-spin" /> : <Swords size={12} />}
              Submit battle
            </button>
          )}
        </div>
        <div className="text-center text-[9.5px] text-muted">
          Unanswered questions score zero. The paper locks when the timer hits zero.
        </div>
      </div>
    );
  }

  const value = result;
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Card className="overflow-hidden">
        <div className="relative p-6 text-center">
          <div
            className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-64 w-64 rounded-full"
            style={{ background: `radial-gradient(circle, ${value?.passed ? "rgba(47,227,160,.18)" : "rgba(255,93,122,.14)"}, transparent 65%)` }}
          />
          <div
            className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full border text-[24px] font-bold"
            style={{
              borderColor: value?.passed ? "rgba(47,227,160,.35)" : "rgba(255,93,122,.3)",
              color: value?.passed ? "#5beeb9" : "#ff8fa3",
            }}
          >
            {value?.percent ?? 0}%
          </div>
          <h2 className="relative mt-3 text-[20px] font-semibold tracking-tight">
            {value?.passed ? `${value.boss.name} defeated` : "The boss held the line"}
          </h2>
          <p className="relative mt-1 text-[11.5px] text-muted">
            {value?.score ?? 0} of {value?.total ?? 0} correct · pass mark {value?.passMark ?? status.passMark}%
          </p>
          {value && (
            <div className="relative mt-3 flex flex-wrap justify-center gap-2">
              {value.passed && value.firstPass && (
                <>
                  <Badge tone="amber"><Zap size={9} /> +{value.xp} XP</Badge>
                  <Badge tone="cyan"><Trophy size={9} /> +{value.credits} credits</Badge>
                </>
              )}
              {value.passed && !value.firstPass && <Badge tone="green"><Check size={9} /> Retake clear</Badge>}
              {!value.passed && <Badge tone="red"><X size={9} /> Retake is free</Badge>}
            </div>
          )}
          <div className="relative mt-4 flex flex-wrap justify-center gap-2">
            <button onClick={start} disabled={starting} className="btn btn-primary">
              {starting ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
              {value?.passed ? "Fight again" : "Retake the boss"}
            </button>
            <Link href="/badges" className="btn btn-dark"><Trophy size={13} /> Badges</Link>
            <button onClick={() => setPhase("idle")} className="btn btn-ghost">Overview</button>
          </div>
        </div>
      </Card>

      {value && value.review.length > 0 && (
        <Card className="overflow-hidden">
          <div className="border-b border-white/[0.06] p-4">
            <SectionHead title="Boss review" subtitle="Hard questions with the reasoning spelled out." />
          </div>
          <div className="divide-y divide-white/[0.05]">
            {value.review.map((item, reviewIndex) => (
              <div key={item.id} className="p-4">
                <div className="flex items-start gap-2.5">
                  <span
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                      item.ok ? "bg-[rgba(47,227,160,.14)] text-[#5beeb9]" : "bg-[rgba(255,93,122,.14)] text-[#ff8fa3]"
                    )}
                  >
                    {item.ok ? <Check size={11} /> : <X size={11} />}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[9.5px] uppercase tracking-[0.1em] text-muted">{item.module}</div>
                    <div className="mt-0.5 text-[12px] font-medium leading-snug">{reviewIndex + 1}. {item.prompt}</div>
                    {!item.ok && (
                      <div className="mt-1 text-[11px] text-[#5beeb9]">
                        Correct: {item.options[item.correct] ?? "—"}
                      </div>
                    )}
                    <div className="mt-1 text-[10.5px] leading-relaxed text-muted">{item.explanation}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {!value?.passed && (
        <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-2 text-[11px] text-muted">
            <Lock size={12} /> Study the review, then retake. There is no penalty.
          </div>
          <Link href="/learn" className="btn btn-dark btn-sm"><Crown size={12} /> Revise the curriculum</Link>
        </Card>
      )}
    </div>
  );
}
