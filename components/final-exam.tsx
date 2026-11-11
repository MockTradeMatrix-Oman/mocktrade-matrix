"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, ArrowRight, Award, Check, CheckCircle2, ChevronDown, Clock,
  Crown, RotateCcw, ShieldCheck, Sparkles, X,
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

type Result = {
  score: number;
  total: number;
  percent: number;
  passed: boolean;
  passMark: number;
  review: ReviewItem[];
  certificate: { serial: string } | null;
};

type Attempt = {
  attemptId: number;
  questions: ExamQuestion[];
  startedAt: number;
  durationMs: number;
};

function clock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
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
  const [phase, setPhase] = useState<"intro" | "loading" | "active" | "result">("intro");
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [remaining, setRemaining] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [showReview, setShowReview] = useState(false);
  const submitting = useRef(false);

  const answeredCount = Object.keys(answers).length;
  const unanswered = Math.max(0, (attempt?.questions.length ?? 0) - answeredCount);
  const progress = attempt && attempt.questions.length > 0
    ? (answeredCount / attempt.questions.length) * 100
    : 0;

  const lowTime = remaining > 0 && remaining < 5 * 60_000;

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
    void submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, phase, attempt]);

  async function start() {
    setError("");
    setPhase("loading");
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
      });
      setAnswers({});
      setRemaining(Math.max(0, data.durationMs - (Date.now() - data.startedAt)));
      setResult(null);
      setShowReview(false);
      setPhase("active");
    } catch (err) {
      setError(err instanceof Error ? err.message : "The assessment could not be started.");
      setPhase("intro");
    }
  }

  async function submit() {
    if (!attempt || submitting.current) return;
    submitting.current = true;
    setError("");
    try {
      const res = await fetch("/api/exam", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "submit",
          attemptId: attempt.attemptId,
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "The assessment could not be submitted.");
      setPhase("active");
    } finally {
      submitting.current = false;
    }
  }

  function choose(questionId: number, choice: number) {
    setAnswers((current) => ({ ...current, [questionId]: choice }));
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
                {questionCount} questions drawn from the module quizzes, covering every topic in the
                curriculum. You need {passMark}% to pass. Your answers are scored on the server.
              </p>
            </div>
            <Badge tone="amber"><Crown size={9} /> Premium</Badge>
          </div>

          <div className="relative mt-5 grid gap-2 sm:grid-cols-3">
            {[
              { icon: <Clock size={13} />, label: "Time", value: "45 minutes" },
              { icon: <CheckCircle2 size={13} />, label: "Pass mark", value: `${passMark}%` },
              { icon: <RotateCcw size={13} />, label: "Retakes", value: "Allowed" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-3">
                <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-muted">
                  {item.icon} {item.label}
                </div>
                <div className="mt-1.5 text-[13px] font-semibold">{item.value}</div>
              </div>
            ))}
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
              <ShieldCheck size={10} className="text-[#5beeb9]" /> One sitting per attempt · answers locked at submission
            </span>
          </div>
        </div>
      </Card>
    ),
    [bestPercent, certificateSerial, error, passMark, phase, questionCount]
  );

  if (phase === "intro" || phase === "loading") return intro;

  if (phase === "result" && result) {
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
                    : `You need ${result.passMark}% to pass. Review the explanations below, revisit the weak modules, then retake the assessment.`}
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

  if (!attempt) return intro;

  return (
    <div className="mt-6">
      <div className="sticky top-[64px] z-20 rounded-xl border border-white/[0.07] bg-[#0b101a]/95 p-3 backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Badge tone={lowTime ? "red" : "neutral"}>
              <Clock size={9} /> {clock(remaining)}
            </Badge>
            <span className="text-[10.5px] text-muted">
              {answeredCount} of {attempt.questions.length} answered
            </span>
          </div>
          <div className="flex items-center gap-2">
            {unanswered > 0 && (
              <span className="text-[10px] text-[#ffd08d]">{unanswered} unanswered</span>
            )}
            <button
              type="button"
              onClick={() => {
                if (unanswered > 0 && !window.confirm(`Submit with ${unanswered} unanswered question${unanswered === 1 ? "" : "s"}?`)) return;
                void submit();
              }}
              className="btn btn-primary btn-sm"
            >
              Submit assessment <ArrowRight size={12} />
            </button>
          </div>
        </div>
        <Progress className="mt-2.5" value={progress} tone="violet" />
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-[rgba(255,143,163,.25)] bg-[rgba(255,143,163,.06)] px-3 py-2 text-[10.5px] text-[#ffb3c0]">
          <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      <div className="mt-4 space-y-4">
        {attempt.questions.map((question, index) => (
          <Card key={question.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-muted">
                Question {index + 1} · {question.module}
              </div>
              {answers[question.id] !== undefined && (
                <span className="flex items-center gap-1 text-[9px] font-semibold text-[#5beeb9]">
                  <Check size={10} /> Answered
                </span>
              )}
            </div>
            <div className="mt-2 text-[13.5px] font-semibold leading-relaxed">{question.prompt}</div>
            <div className="mt-3 space-y-2">
              {question.options.map((option, choice) => {
                const selected = answers[question.id] === choice;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => choose(question.id, choice)}
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
                      {String.fromCharCode(65 + choice)}
                    </span>
                    {option}
                  </button>
                );
              })}
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.015] p-4">
        <div className="text-[10px] text-muted">
          {unanswered > 0
            ? `${unanswered} question${unanswered === 1 ? "" : "s"} still unanswered. You can submit anyway and retake later.`
            : "All questions answered. Submit when you are ready."}
        </div>
        <button
          type="button"
          onClick={() => {
            if (unanswered > 0 && !window.confirm(`Submit with ${unanswered} unanswered question${unanswered === 1 ? "" : "s"}?`)) return;
            void submit();
          }}
          className="btn btn-primary btn-sm"
        >
          Submit assessment <ArrowRight size={12} />
        </button>
      </div>
    </div>
  );
}
