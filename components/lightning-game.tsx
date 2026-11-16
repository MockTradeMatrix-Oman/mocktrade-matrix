"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight, Check, Crown, Flame, Loader2, Lock, RotateCcw, Timer, Trophy, X, Zap,
} from "lucide-react";
import { Badge, Card, Progress, SectionHead, cn } from "./ui";
import { useToast } from "./toast";
import { useCelebration } from "./celebrate";

type Question = { id: number; prompt: string; options: string[] };
type Run = { runId: number; startedAt: number; endsAt: number; questions: Question[] };
type Review = {
  id: number;
  prompt: string;
  options: string[];
  correct: number;
  chosen: number | null;
  right: boolean;
  explanation: string;
};
type Result = {
  correct: number;
  total: number;
  bestCombo: number;
  xp: number;
  credits: number;
  rewardable: boolean;
  rewardRunsLeft: number;
  review: Review[];
};

export function LightningGame({ premium, summary }: { premium: boolean; summary: { best: number; runs: number } }) {
  const router = useRouter();
  const { push } = useToast();
  const { celebrate } = useCelebration();
  const [phase, setPhase] = useState<"idle" | "playing" | "result">("idle");
  const [run, setRun] = useState<Run | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<number, number>>(new Map());
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [remaining, setRemaining] = useState(60_000);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submitted = useRef(false);
  const answersRef = useRef<Map<number, number>>(new Map());
  const bestComboRef = useRef(0);
  const runRef = useRef<Run | null>(null);

  const finish = useCallback(
    async (finalAnswers: Map<number, number>, finalCombo: number, currentRun: Run | null) => {
      if (submitted.current || !currentRun) return;
      submitted.current = true;
      setSubmitting(true);
      try {
        const res = await fetch("/api/fun/lightning", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "submit",
            runId: currentRun.runId,
            answers: Array.from(finalAnswers.entries()).map(([id, choice]) => ({ id, choice })),
            bestCombo: finalCombo,
          }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error ?? "Could not submit this round.");
        const value = data as Result;
        setResult(value);
        setPhase("result");
        if (value.xp > 0 || value.credits > 0) {
          push({
            tone: "reward",
            title: `${value.correct}/${value.total} correct`,
            body: `+${value.xp} XP and +${value.credits} credits.`,
          });
          celebrate({
            tone: value.correct >= 10 ? "amber" : "green",
            title: `${value.correct}/${value.total} correct`,
            body: value.correct >= 10 ? "Lightning ace form." : `+${value.xp} XP · +${value.credits} credits`,
          });
        } else {
          push({
            tone: "info",
            title: `${value.correct}/${value.total} correct`,
            body: value.rewardable
              ? "Round complete. Keep the combo alive next time."
              : "Today's reward runs are used. This one was practice.",
          });
        }
        router.refresh();
      } catch (error) {
        push({
          tone: "error",
          title: "Round not submitted",
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
      if (left <= 0) finish(answersRef.current, bestComboRef.current, runRef.current);
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [phase, run, finish]);

  async function start() {
    if (starting) return;
    setStarting(true);
    try {
      const res = await fetch("/api/fun/lightning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not start a round.");
      const next = data as Run;
      submitted.current = false;
      answersRef.current = new Map();
      bestComboRef.current = 0;
      runRef.current = next;
      setRun(next);
      setAnswers(new Map());
      setCombo(0);
      setBestCombo(0);
      setIndex(0);
      setResult(null);
      setRemaining(next.endsAt - Date.now());
      setPhase("playing");
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

  function choose(choice: number) {
    if (!run || phase !== "playing") return;
    const question = run.questions[index];
    if (!question || answersRef.current.has(question.id)) return;

    const nextAnswers = new Map(answersRef.current);
    nextAnswers.set(question.id, choice);
    answersRef.current = nextAnswers;
    setAnswers(nextAnswers);

    // The answer key never reaches the browser, so the client cannot know if
    // this was right. Combo is therefore advanced on answered questions and
    // the server keeps only min(correct, combo) as the real best combo.
    const nextCombo = combo + 1;
    setCombo(nextCombo);
    if (nextCombo > bestComboRef.current) {
      bestComboRef.current = nextCombo;
      setBestCombo(nextCombo);
    }

    if (index + 1 >= run.questions.length) {
      finish(nextAnswers, bestComboRef.current, run);
    } else {
      setIndex(index + 1);
    }
  }

  function reset() {
    setPhase("idle");
    setRun(null);
    setResult(null);
    setIndex(0);
    setAnswers(new Map());
    setCombo(0);
    setBestCombo(0);
    submitted.current = false;
  }

  if (!premium) {
    return (
      <Card className="mx-auto max-w-2xl overflow-hidden">
        <div className="relative p-6 text-center">
          <div
            className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(255,192,97,.16), transparent 65%)" }}
          />
          <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[rgba(255,192,97,.28)] bg-[rgba(255,192,97,.08)] text-[#ffd08d]">
            <Lock size={24} />
          </div>
          <h2 className="relative mt-4 text-[20px] font-semibold tracking-tight">Lightning Round is part of Premium</h2>
          <p className="relative mx-auto mt-2 max-w-md text-[12px] leading-relaxed text-muted">
            Sixty seconds, twelve curriculum questions, server-scored. Daily quests, badges and
            streak freezes stay free.
          </p>
          <div className="relative mt-5 flex flex-wrap justify-center gap-2">
            <Link href="/pricing" className="btn btn-primary"><Crown size={14} /> See Premium</Link>
            <Link href="/quests" className="btn btn-dark">Daily quests <ArrowRight size={13} /></Link>
          </div>
        </div>
      </Card>
    );
  }

  if (phase === "idle") {
    return (
      <Card className="mx-auto max-w-2xl overflow-hidden">
        <div className="relative p-6">
          <div
            className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(139,123,255,.18), transparent 65%)" }}
          />
          <div className="relative flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[rgba(139,123,255,.3)] bg-[rgba(139,123,255,.1)] text-[#b3a8ff]">
              <Zap size={26} />
            </div>
            <div>
              <Badge tone="violet"><Zap size={9} /> Premium drill</Badge>
              <h2 className="mt-2 text-[20px] font-semibold tracking-tight">12 questions. 60 seconds.</h2>
              <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
                One tap advances to the next question. The server scores the run and pays rewards
                for the first three rounds each local day.
              </p>
            </div>
          </div>

          <div className="relative mt-5 grid gap-2 sm:grid-cols-3">
            {[
              { icon: Timer, label: "60 seconds", body: "Timer starts on the server." },
              { icon: Flame, label: "Combo", body: "Keep answering to build it." },
              { icon: Trophy, label: summary.best > 0 ? `Best ${summary.best}/12` : "Personal best", body: `${summary.runs} completed run${summary.runs === 1 ? "" : "s"}.` },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
                <item.icon size={15} className="text-[#b3a8ff]" />
                <div className="mt-1.5 text-[11.5px] font-semibold">{item.label}</div>
                <div className="text-[10px] text-muted">{item.body}</div>
              </div>
            ))}
          </div>

          <button onClick={start} disabled={starting} className="btn btn-primary relative mt-5 w-full">
            {starting ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
            {starting ? "Warming up…" : "Start Lightning Round"}
          </button>
          <p className="relative mt-2 text-center text-[9.5px] text-muted">
            Rewards: first 3 rounds each day. Practice runs still count toward your personal best.
          </p>
        </div>
      </Card>
    );
  }

  if (phase === "playing" && run) {
    const question = run.questions[index];
    const left = Math.max(0, remaining);
    const seconds = Math.ceil(left / 1000);
    const pct = Math.max(0, Math.min(100, (left / 60_000) * 100));
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Card className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[11px] text-muted">
              <Zap size={13} className="text-[#b3a8ff]" />
              Question <span className="num font-semibold text-ink">{index + 1}</span> / {run.questions.length}
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-[11px] text-[#ffd08d]">
                <Flame size={13} /> combo {combo}
              </span>
              <span className={cn("num flex items-center gap-1 text-[12px] font-semibold", seconds <= 10 ? "text-[#ff8fa3]" : "text-[#7fdcff]")}>
                <Timer size={13} /> {seconds}s
              </span>
            </div>
          </div>
          <Progress value={pct} tone={seconds <= 10 ? "amber" : "violet"} className="mt-3" />
        </Card>

        <Card className="overflow-hidden">
          <div className="p-5">
            <div className="text-[16px] font-semibold leading-snug tracking-tight">{question.prompt}</div>
            <div className="mt-4 space-y-2">
              {question.options.map((option, optionIndex) => (
                <button
                  key={optionIndex}
                  onClick={() => choose(optionIndex)}
                  className="flex w-full items-start gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-3 text-left text-[12.5px] transition hover:border-[rgba(139,123,255,.4)] hover:bg-white/[0.05]"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-white/10 text-[9.5px] font-semibold text-muted">
                    {String.fromCharCode(65 + optionIndex)}
                  </span>
                  <span>{option}</span>
                </button>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between text-[9.5px] text-muted">
              <span>The answer key stays on the server.</span>
              <span>{answers.size} answered</span>
            </div>
          </div>
        </Card>

        <button
          onClick={() => finish(answersRef.current, bestComboRef.current, runRef.current)}
          disabled={submitting}
          className="btn btn-dark w-full text-[11px]"
        >
          {submitting ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
          Finish now
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card className="overflow-hidden">
        <div className="relative p-6 text-center">
          <div
            className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-64 w-64 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(47,227,160,.16), transparent 65%)" }}
          />
          <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-black/30 text-[26px] font-bold text-[#5beeb9]">
            {result?.correct ?? 0}
          </div>
          <div className="relative mt-2 text-[12px] text-muted">out of {result?.total ?? 12} correct</div>
          {result && (
            <>
              <div className="relative mt-3 flex flex-wrap justify-center gap-2">
                <Badge tone="violet"><Flame size={9} /> Combo {result.bestCombo}</Badge>
                <Badge tone="amber"><Zap size={9} /> +{result.xp} XP</Badge>
                <Badge tone="cyan"><Trophy size={9} /> +{result.credits} credits</Badge>
              </div>
              <p className="relative mt-3 text-[10.5px] text-muted">
                {result.rewardable
                  ? `${result.rewardRunsLeft} rewarded round${result.rewardRunsLeft === 1 ? "" : "s"} left today.`
                  : "Today's reward runs are used. Practice runs still update your best."}
              </p>
            </>
          )}
          <div className="relative mt-4 flex flex-wrap justify-center gap-2">
            <button onClick={start} disabled={starting} className="btn btn-primary">
              {starting ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
              Run again
            </button>
            <Link href="/quests" className="btn btn-dark">Daily quests <ArrowRight size={12} /></Link>
            <button onClick={reset} className="btn btn-ghost">Back</button>
          </div>
        </div>
      </Card>

      {result && result.review.length > 0 && (
        <Card className="overflow-hidden">
          <div className="border-b border-white/[0.06] p-4">
            <SectionHead title="Answer review" subtitle="Every prompt comes from the published curriculum." />
          </div>
          <div className="divide-y divide-white/[0.05]">
            {result.review.map((item, reviewIndex) => (
              <div key={item.id} className="p-4">
                <div className="flex items-start gap-2.5">
                  <span
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                      item.right ? "bg-[rgba(47,227,160,.14)] text-[#5beeb9]" : "bg-[rgba(255,93,122,.14)] text-[#ff8fa3]"
                    )}
                  >
                    {item.right ? <Check size={11} /> : <X size={11} />}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[12px] font-medium leading-snug">{reviewIndex + 1}. {item.prompt}</div>
                    {!item.right && (
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
    </div>
  );
}
