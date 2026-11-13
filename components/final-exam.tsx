"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, ArrowLeft, ArrowRight, Award, Check, CheckCircle2, ChevronDown,
  Clock, Crown, Flag, Info, LayoutGrid, Maximize2, RotateCcw, Send, ShieldCheck,
  Sparkles, X,
} from "lucide-react";
import { Badge, Card, Progress, cn } from "./ui";

type ExamQuestion = {
  id: number;
  prompt: string;
  options: string[];
  module: string;
};

type ReviewItem = {
  id: number;
  prompt: string;
  options: string[];
  choice: number | null;
  correct: number;
  ok: boolean;
  explanation: string;
  module: string;
};

type ModuleScore = {
  module: string;
  correct: number;
  total: number;
};

type Result = {
  score: number;
  total: number;
  percent: number;
  passed: boolean;
  passMark: number;
  review: ReviewItem[];
  breakdown: ModuleScore[];
  certificate: { serial: string } | null;
  violations: number;
};

type Attempt = {
  attemptId: number;
  questions: ExamQuestion[];
  startedAt: number;
  durationMs: number;
  violations: number;
};

type Phase = "intro" | "loading" | "active" | "result";

function clock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours > 0) return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function optionLetter(index: number) {
  return String.fromCharCode(65 + index);
}

function enterFullscreen() {
  try {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen?.().catch(() => {});
    }
  } catch {
    /* Fullscreen is a convenience, never a requirement. */
  }
}

function leaveFullscreen() {
  try {
    if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => {});
  } catch {
    /* ignore */
  }
}

export function FinalExam({
  passMark,
  questionCount,
  certificateSerial,
  bestPercent,
}: {
  passMark: number;
  questionCount: number;
  certificateSerial?: string | null;
  bestPercent?: number | null;
}) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [marked, setMarked] = useState<Record<number, boolean>>({});
  const [visited, setVisited] = useState<Record<number, boolean>>({});
  const [current, setCurrent] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [violations, setViolations] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [showReview, setShowReview] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [showLeave, setShowLeave] = useState(false);
  const submitting = useRef(false);
  const lastViolation = useRef(0);
  const graceUntil = useRef(0);

  const questions = attempt?.questions ?? [];
  const total = questions.length;
  const question = questions[current];
  const answeredCount = Object.keys(answers).length;
  const markedCount = Object.values(marked).filter(Boolean).length;
  const unansweredCount = Math.max(0, total - answeredCount);
  const progress = total > 0 ? (answeredCount / total) * 100 : 0;
  const lowTime = remaining > 0 && remaining < 10 * 60_000;
  const criticalTime = remaining > 0 && remaining < 5 * 60_000;

  useEffect(() => {
    if (phase !== "active" || !attempt) return;
    const tick = () => {
      const left = attempt.durationMs - (Date.now() - attempt.startedAt);
      setRemaining(Math.max(0, left));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [phase, attempt]);

  useEffect(() => {
    if (phase !== "active" || !attempt || remaining > 0) return;
    void submit(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, phase, attempt]);

  // Mark the current question as visited so the palette can distinguish
  // "seen but unanswered" from "never opened".
  useEffect(() => {
    if (phase !== "active" || !question) return;
    setVisited((value) => (value[question.id] ? value : { ...value, [question.id]: true }));
  }, [phase, question]);

  // Anti-leave: any tab switch or window blur is counted and covered by an
  // overlay. The timer never pauses; the count is stored with the attempt.
  useEffect(() => {
    if (phase !== "active") return;
    const flag = () => {
      const stamp = Date.now();
      if (stamp < graceUntil.current) return;
      if (stamp - lastViolation.current < 1200) return;
      lastViolation.current = stamp;
      setViolations((value) => value + 1);
      setShowLeave(true);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flag();
    };
    const onBlur = () => flag();
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [phase]);

  async function start() {
    setError("");
    setPhase("loading");
    graceUntil.current = Date.now() + 3000;
    enterFullscreen();
    try {
      const res = await fetch("/api/exam", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "The assessment could not be started.");
      setAttempt({
        attemptId: data.attemptId,
        questions: data.questions,
        startedAt: data.startedAt,
        durationMs: data.durationMs,
        violations: Number(data.violations) || 0,
      });
      setAnswers({});
      setMarked({});
      setVisited({});
      setCurrent(0);
      setViolations(Number(data.violations) || 0);
      setRemaining(Math.max(0, data.durationMs - (Date.now() - data.startedAt)));
      setResult(null);
      setShowReview(false);
      setShowSubmit(false);
      setShowLeave(false);
      setPhase("active");
      graceUntil.current = Date.now() + 2000;
    } catch (err) {
      setError(err instanceof Error ? err.message : "The assessment could not be started.");
      setPhase("intro");
    }
  }

  async function submit(auto = false) {
    if (!attempt || submitting.current) return;
    submitting.current = true;
    setError("");
    setShowSubmit(false);
    try {
      const res = await fetch("/api/exam", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "submit",
          attemptId: attempt.attemptId,
          violations,
          answers: Object.entries(answers).map(([id, choice]) => ({
            id: Number(id),
            choice,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "The assessment could not be submitted.");
      setResult(data);
      setPhase("result");
      setShowReview(false);
      setShowLeave(false);
      leaveFullscreen();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The assessment could not be submitted.");
      setPhase("active");
      if (!auto) setShowSubmit(false);
    } finally {
      submitting.current = false;
    }
  }

  function choose(choice: number) {
    if (!question) return;
    setAnswers((value) => ({ ...value, [question.id]: choice }));
  }

  function clearResponse() {
    if (!question) return;
    setAnswers((value) => {
      const next = { ...value };
      delete next[question.id];
      return next;
    });
  }

  function goTo(index: number) {
    setCurrent(Math.min(Math.max(0, index), Math.max(0, total - 1)));
  }

  function goNext() {
    goTo(current + 1);
  }

  function markAndNext() {
    if (!question) return;
    setMarked((value) => ({ ...value, [question.id]: !value[question.id] }));
    goNext();
  }

  const intro = useMemo(
    () => (
      <Card className="mt-6 overflow-hidden">
        <div className="relative p-6 sm:p-7">
          <div
            className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(255,208,141,.13), transparent 65%)" }}
          />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Award size={16} className="text-[#ffd08d]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#ffd08d]">
                  Final assessment
                </span>
              </div>
              <h2 className="mt-2 text-[21px] font-semibold tracking-[-0.02em]">
                Complete the curriculum, then prove it
              </h2>
              <p className="mt-2 max-w-xl text-[11.5px] leading-relaxed text-muted">
                {questionCount} questions covering every module, in a computer-based test with a
                question palette, Mark for Review and a fixed timer. You need {passMark}% to pass.
                Your answers are scored on the server.
              </p>
            </div>
            <Badge tone="amber"><Crown size={9} /> Premium</Badge>
          </div>

          <div className="relative mt-5 grid gap-2 sm:grid-cols-3">
            {[
              { icon: <Clock size={13} />, label: "Time", value: "90 minutes" },
              { icon: <CheckCircle2 size={13} />, label: "Pass mark", value: `${passMark}%` },
              { icon: <LayoutGrid size={13} />, label: "Format", value: `${questionCount} MCQs` },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-3">
                <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-muted">
                  {item.icon} {item.label}
                </div>
                <div className="mt-1.5 text-[13px] font-semibold">{item.value}</div>
              </div>
            ))}
          </div>

          <div className="relative mt-4 rounded-xl border border-white/[0.06] bg-white/[0.015] p-4">
            <div className="flex items-center gap-2 text-[11px] font-semibold">
              <Info size={12} className="text-[#8b7bff]" /> Exam instructions
            </div>
            <div className="mt-2 space-y-1.5 text-[10.5px] leading-relaxed text-muted">
              <p>Use the question palette to jump between questions. Answered, unanswered and marked questions are colour-coded.</p>
              <p>Mark for Review only flags a question for yourself. It does not submit or skip the answer.</p>
              <p>This assessment must be taken in a single tab. Leaving the tab is recorded and the timer keeps running.</p>
              <p>Unanswered questions are scored as incorrect. Submit before the timer reaches zero.</p>
            </div>
          </div>

          {typeof bestPercent === "number" && (
            <div className="relative mt-4 flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.015] px-3 py-2 text-[10.5px] text-muted">
              <Sparkles size={12} className="text-[#ffd08d]" />
              Your best final assessment score so far: <strong className="text-ink">{bestPercent}%</strong>
            </div>
          )}

          {certificateSerial && (
            <div className="relative mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[rgba(47,227,160,.22)] bg-[rgba(47,227,160,.05)] px-3 py-2.5">
              <span className="flex items-center gap-1.5 text-[10.5px] text-[#8df5d0]">
                <ShieldCheck size={12} /> Certificate already issued · {certificateSerial}
              </span>
              <Link href="/certificate" className="btn btn-dark btn-sm">
                Open certificate <ArrowRight size={11} />
              </Link>
            </div>
          )}

          {error && (
            <div className="relative mt-4 flex items-start gap-2 rounded-lg border border-[rgba(255,143,163,.25)] bg-[rgba(255,143,163,.06)] px-3 py-2 text-[10.5px] text-[#ffb3c0]">
              <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {error}
            </div>
          )}

          <div className="relative mt-5 flex flex-wrap items-center gap-3">
            <button type="button" onClick={start} className="btn btn-primary" disabled={phase === "loading"}>
              {phase === "loading" ? "Preparing assessment…" : certificateSerial ? "Retake assessment" : "Start assessment"}
              <ArrowRight size={13} />
            </button>
            <span className="flex items-center gap-1.5 text-[9.5px] text-muted">
              <Maximize2 size={10} className="text-[#5beeb9]" /> One sitting per attempt · answers locked at submission
            </span>
          </div>
        </div>
      </Card>
    ),
    [bestPercent, certificateSerial, error, passMark, phase, questionCount]
  );

  if (phase === "intro" || phase === "loading") return intro;

  if (phase === "result" && result) {
    const weak = result.breakdown.filter((row) => row.total > 0 && row.correct / row.total < 0.8);
    return (
      <div className="mt-6 space-y-4">
        <Card className="overflow-hidden">
          <div className="relative p-6 sm:p-7">
            <div
              className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full"
              style={{
                background: result.passed
                  ? "radial-gradient(circle, rgba(47,227,160,.16), transparent 65%)"
                  : "radial-gradient(circle, rgba(255,143,163,.12), transparent 65%)",
              }}
            />
            <div className="relative flex flex-wrap items-start justify-between gap-4">
              <div>
                <Badge tone={result.passed ? "green" : "red"}>
                  {result.passed ? <CheckCircle2 size={9} /> : <X size={9} />}
                  {result.passed ? "Passed" : "Not passed yet"}
                </Badge>
                <h2 className="mt-3 text-[26px] font-semibold tracking-[-0.03em]">
                  {result.passed ? "Certificate earned" : "Close the gap and try again"}
                </h2>
                <p className="mt-1.5 max-w-xl text-[11.5px] leading-relaxed text-muted">
                  {result.passed
                    ? "All modules are complete and the final assessment is passed. Your Completion Merit Certificate is ready to print or download."
                    : `You need ${result.passMark}% to pass. Review the module-wise breakdown and explanations below, revisit the weak modules, then retake the assessment.`}
                </p>
              </div>
              <div className="text-right">
                <div className={cn("num text-[40px] font-semibold leading-none", result.passed ? "text-[#5beeb9]" : "text-[#ff8fa3]")}>
                  {result.percent}%
                </div>
                <div className="mt-1 text-[10px] text-muted">
                  {result.score} of {result.total} correct
                </div>
              </div>
            </div>

            <div className="relative mt-5">
              <Progress value={result.percent} tone={result.passed ? "green" : "amber"} />
            </div>

            {result.violations > 0 && (
              <div className="relative mt-4 flex items-center gap-2 rounded-lg border border-[rgba(255,208,141,.22)] bg-[rgba(255,208,141,.05)] px-3 py-2 text-[10px] text-[#ffd08d]">
                <AlertTriangle size={11} /> Tab switches recorded during this attempt: {result.violations}
              </div>
            )}

            <div className="relative mt-5 flex flex-wrap gap-2">
              {result.passed && (
                <Link href="/certificate" className="btn btn-primary">
                  <Award size={14} /> Open certificate <ArrowRight size={13} />
                </Link>
              )}
              <button type="button" onClick={start} className="btn btn-dark">
                <RotateCcw size={13} /> Retake
              </button>
              <Link href="/learn" className="btn btn-dark">
                Review modules
              </Link>
            </div>
            {error && (
              <div className="relative mt-4 flex items-start gap-2 rounded-lg border border-[rgba(255,143,163,.25)] bg-[rgba(255,143,163,.06)] px-3 py-2 text-[10.5px] text-[#ffb3c0]">
                <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {error}
              </div>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="text-[14px] font-semibold">Module-wise performance</div>
          <p className="mt-1 text-[10.5px] leading-relaxed text-muted">
            {weak.length > 0
              ? "Focus your revision on the modules below 80% before retaking."
              : "Every module is at or above 80%. Strong, balanced coverage."}
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {result.breakdown.map((row) => {
              const pct = row.total > 0 ? Math.round((row.correct / row.total) * 100) : 0;
              return (
                <div key={row.module} className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold">{row.module}</span>
                    <span className={cn("num text-[11px] font-semibold", pct >= 80 ? "text-[#5beeb9]" : "text-[#ffd08d]")}>
                      {row.correct}/{row.total}
                    </span>
                  </div>
                  <Progress className="mt-2" value={pct} tone={pct >= 80 ? "green" : "amber"} />
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-5">
          <button
            type="button"
            onClick={() => setShowReview((value) => !value)}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <span className="text-[14px] font-semibold">Answer review &amp; explanations</span>
            <ChevronDown
              size={16}
              className={cn("text-muted transition-transform", showReview && "rotate-180")}
            />
          </button>
          {showReview && (
            <div className="mt-4 space-y-3">
              {result.review.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "rounded-xl border p-4",
                    item.ok
                      ? "border-[rgba(47,227,160,.18)] bg-[rgba(47,227,160,.035)]"
                      : "border-[rgba(255,143,163,.18)] bg-[rgba(255,143,163,.035)]"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-[11.5px] font-semibold leading-relaxed">{item.prompt}</div>
                    <span className={cn("shrink-0", item.ok ? "text-[#5beeb9]" : "text-[#ff8fa3]")}>
                      {item.ok ? <Check size={15} /> : <X size={15} />}
                    </span>
                  </div>
                  <div className="mt-2 space-y-1.5">
                    {item.options.map((option, index) => (
                      <div
                        key={option}
                        className={cn(
                          "rounded-lg border px-2.5 py-1.5 text-[10.5px]",
                          index === item.correct
                            ? "border-[rgba(47,227,160,.3)] bg-[rgba(47,227,160,.08)] text-[#b9f7dd]"
                            : index === item.choice
                              ? "border-[rgba(255,143,163,.3)] bg-[rgba(255,143,163,.07)] text-[#ffc2cc]"
                              : "border-white/[0.05] text-muted"
                        )}
                      >
                        {option}
                        {index === item.correct && " · correct"}
                        {index === item.choice && index !== item.correct && " · your answer"}
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-[10px] leading-relaxed text-muted">
                    <strong className="text-[#c9d2e2]">{item.module}:</strong> {item.explanation}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    );
  }

  if (phase !== "active" || !attempt || !question) return intro;

  const currentMarked = Boolean(marked[question.id]);
  const currentAnswered = answers[question.id] !== undefined;

  return (
    <div className="mt-6">
      <div className="sticky top-[64px] z-20 rounded-xl border border-white/[0.07] bg-[#0b101a]/95 p-3 backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <Badge tone={criticalTime ? "red" : lowTime ? "amber" : "neutral"}>
              <Clock size={9} /> <span className="num">{clock(remaining)}</span>
            </Badge>
            <span className="text-[10px] text-muted">Time left</span>
            <span className="hidden h-3 w-px bg-white/10 sm:block" />
            <span className="text-[10.5px] text-muted">
              <span className="num font-semibold text-ink">{answeredCount}</span> / {total} answered
            </span>
            {violations > 0 && (
              <span className="flex items-center gap-1 rounded-full border border-[rgba(255,208,141,.25)] bg-[rgba(255,208,141,.06)] px-2 py-0.5 text-[9px] font-semibold text-[#ffd08d]">
                <AlertTriangle size={9} /> {violations} tab switch{violations === 1 ? "" : "es"}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowSubmit(true)}
            className="btn btn-primary btn-sm"
          >
            Submit assessment <ArrowRight size={12} />
          </button>
        </div>
        <Progress className="mt-2.5" value={progress} tone="violet" />
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-[rgba(255,143,163,.25)] bg-[rgba(255,143,163,.06)] px-3 py-2 text-[10.5px] text-[#ffb3c0]">
          <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_286px]">
        <div>
          <Card className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-muted">
                Question <span className="num text-ink">{current + 1}</span> of{" "}
                <span className="num">{total}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-white/[0.08] px-2 py-0.5 text-[9px] text-[#c9d2e2]">
                  {question.module}
                </span>
                {currentAnswered && (
                  <span className="flex items-center gap-1 text-[9px] font-semibold text-[#5beeb9]">
                    <Check size={10} /> Answered
                  </span>
                )}
                {currentMarked && (
                  <span className="flex items-center gap-1 text-[9px] font-semibold text-[#b3a8ff]">
                    <Flag size={10} /> Marked
                  </span>
                )}
              </div>
            </div>

            <div className="mt-3 text-[14px] font-semibold leading-relaxed">{question.prompt}</div>
            <div className="mt-4 space-y-2">
              {question.options.map((option, choice) => {
                const selected = answers[question.id] === choice;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => choose(choice)}
                    className={cn(
                      "flex w-full items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left text-[11.5px] leading-relaxed transition",
                      selected
                        ? "border-[rgba(139,123,255,.45)] bg-[rgba(139,123,255,.12)] text-ink"
                        : "border-white/[0.06] bg-white/[0.015] text-[#c9d2e2] hover:border-white/[0.14]"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[8px] font-semibold",
                        selected
                          ? "border-[#b3a8ff] bg-[#8b7bff] text-[#0a0e15]"
                          : "border-white/20 text-muted"
                      )}
                    >
                      {optionLetter(choice)}
                    </span>
                    {option}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-4">
              <button
                type="button"
                onClick={() => goTo(current - 1)}
                disabled={current === 0}
                className="btn btn-dark btn-sm disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowLeft size={12} /> Previous
              </button>
              <button
                type="button"
                onClick={clearResponse}
                disabled={!currentAnswered}
                className="btn btn-dark btn-sm disabled:cursor-not-allowed disabled:opacity-40"
              >
                Clear Response
              </button>
              <button type="button" onClick={markAndNext} className="btn btn-dark btn-sm">
                <Flag size={12} /> Mark for Review &amp; Next
              </button>
              <button type="button" onClick={goNext} className="btn btn-primary btn-sm">
                Save &amp; Next <ArrowRight size={12} />
              </button>
            </div>
          </Card>

          <div className="mt-3 flex items-center gap-1.5 text-[9.5px] text-muted">
            <ShieldCheck size={10} className="text-[#5beeb9]" />
            Answers are sent only when you submit. The timer runs on the server-seeded start time.
          </div>
        </div>

        <aside className="lg:sticky lg:top-[132px] lg:self-start">
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <LayoutGrid size={13} className="text-[#8b7bff]" />
              <span className="text-[11px] font-semibold">Question palette</span>
            </div>
            <div className="mt-3 grid grid-cols-6 gap-1.5 sm:grid-cols-8 lg:grid-cols-5">
              {questions.map((item, index) => {
                const isAnswered = answers[item.id] !== undefined;
                const isMarked = Boolean(marked[item.id]);
                const isVisited = Boolean(visited[item.id]);
                const isCurrent = index === current;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => goTo(index)}
                    aria-label={`Question ${index + 1}`}
                    className={cn(
                      "relative flex h-8 items-center justify-center rounded-md border text-[10px] font-semibold transition",
                      isAnswered && isMarked
                        ? "border-[#b3a8ff] bg-[rgba(139,123,255,.3)] text-white"
                        : isAnswered
                          ? "border-[rgba(47,227,160,.4)] bg-[rgba(47,227,160,.22)] text-[#b9f7dd]"
                          : isMarked
                            ? "border-[#b3a8ff] bg-[rgba(139,123,255,.2)] text-[#d9d3ff]"
                            : isVisited
                              ? "border-[rgba(255,143,163,.35)] bg-[rgba(255,143,163,.12)] text-[#ffc2cc]"
                              : "border-white/[0.07] bg-white/[0.02] text-muted",
                      isCurrent && "ring-2 ring-[#ffd08d] ring-offset-2 ring-offset-[#0b101a]"
                    )}
                  >
                    {index + 1}
                    {isAnswered && isMarked && (
                      <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-[#5beeb9]" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 space-y-1.5 border-t border-white/[0.06] pt-3 text-[9.5px] text-muted">
              {[
                { className: "border-[rgba(47,227,160,.4)] bg-[rgba(47,227,160,.22)]", label: "Answered" },
                { className: "border-[rgba(255,143,163,.35)] bg-[rgba(255,143,163,.12)]", label: "Not answered" },
                { className: "border-[#b3a8ff] bg-[rgba(139,123,255,.2)]", label: "Marked for review" },
                { className: "border-white/[0.07] bg-white/[0.02]", label: "Not visited" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <span className={cn("h-4 w-4 rounded border", item.className)} />
                  {item.label}
                </div>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/[0.06] pt-3 text-[9.5px]">
              <div className="rounded-lg bg-white/[0.02] px-2 py-1.5">
                <div className="text-muted">Answered</div>
                <div className="num text-[13px] font-semibold text-[#5beeb9]">{answeredCount}</div>
              </div>
              <div className="rounded-lg bg-white/[0.02] px-2 py-1.5">
                <div className="text-muted">Not answered</div>
                <div className="num text-[13px] font-semibold text-[#ff8fa3]">{unansweredCount}</div>
              </div>
              <div className="rounded-lg bg-white/[0.02] px-2 py-1.5">
                <div className="text-muted">Marked for review</div>
                <div className="num text-[13px] font-semibold text-[#b3a8ff]">{markedCount}</div>
              </div>
              <div className="rounded-lg bg-white/[0.02] px-2 py-1.5">
                <div className="text-muted">Tab switches</div>
                <div className="num text-[13px] font-semibold text-[#ffd08d]">{violations}</div>
              </div>
            </div>
          </Card>
        </aside>
      </div>

      {showSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-[480px] p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[rgba(255,208,141,.3)] bg-[rgba(255,208,141,.1)]">
                <Send size={15} className="text-[#ffd08d]" />
              </span>
              <div>
                <h3 className="text-[16px] font-semibold">Submit final assessment?</h3>
                <p className="mt-1 text-[10.5px] leading-relaxed text-muted">
                  Once submitted, this attempt is closed and answers cannot be changed.
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5 text-center">
                <div className="num text-[18px] font-semibold text-[#5beeb9]">{answeredCount}</div>
                <div className="text-[9px] text-muted">Answered</div>
              </div>
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5 text-center">
                <div className="num text-[18px] font-semibold text-[#ff8fa3]">{unansweredCount}</div>
                <div className="text-[9px] text-muted">Not answered</div>
              </div>
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5 text-center">
                <div className="num text-[18px] font-semibold text-[#b3a8ff]">{markedCount}</div>
                <div className="text-[9px] text-muted">Marked for review</div>
              </div>
            </div>

            <p className="mt-3 text-[10px] leading-relaxed text-muted">
              Unanswered questions are scored as incorrect. You need {passMark}% to earn the
              certificate.
            </p>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setShowSubmit(false)} className="btn btn-dark btn-sm">
                Cancel
              </button>
              <button type="button" onClick={() => void submit(false)} className="btn btn-primary btn-sm">
                Confirm submit <ArrowRight size={12} />
              </button>
            </div>
          </Card>
        </div>
      )}

      {showLeave && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <Card className="w-full max-w-[480px] p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[rgba(255,143,163,.3)] bg-[rgba(255,143,163,.1)]">
                <AlertTriangle size={18} className="text-[#ff8fa3]" />
              </span>
              <div>
                <h3 className="text-[16px] font-semibold">You have left the assessment tab</h3>
                <p className="mt-1 text-[10.5px] leading-relaxed text-muted">
                  This assessment must be taken in a single tab. Tab switches are recorded with
                  your attempt and the timer keeps running.
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-lg border border-[rgba(255,208,141,.22)] bg-[rgba(255,208,141,.05)] px-3 py-2.5">
              <span className="text-[10.5px] text-[#ffd08d]">Tab switches recorded</span>
              <span className="num text-[16px] font-semibold text-[#ffd08d]">{violations}</span>
            </div>

            <button
              type="button"
              onClick={() => {
                graceUntil.current = Date.now() + 1800;
                setShowLeave(false);
                enterFullscreen();
              }}
              className="btn btn-primary btn-sm mt-5 w-full justify-center"
            >
              Resume assessment <ArrowRight size={12} />
            </button>
            <p className="mt-2 text-center text-[9px] text-muted">
              Time used while away still counts against your 90 minutes.
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}
