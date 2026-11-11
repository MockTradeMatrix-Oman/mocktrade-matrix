"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, Clock, GraduationCap, Lightbulb,
  Lock, RotateCcw, Sparkles, Trophy, Unlock, X, Zap,
} from "lucide-react";
import { Badge, Card, Progress, SectionHead, cn } from "./ui";
import { useToast } from "./toast";
import { ModuleVideo } from "./module-video";

export type QuizQuestion = { id: number; prompt: string; options: string[] };

export type ModuleData = {
  id: number;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  level: string;
  order_index: number;
  minutes: number;
  reward_credits: number;
  unlock_cost: number;
  video_url: string | null;
  content: string;
  is_free: number;
  questions: QuizQuestion[];
  status: string;
  score: number;
};

export type ModuleNeighbour = { slug: string; title: string } | null;

type ResultDetail = { correct: boolean; answer: number; explanation: string };
type Result = {
  score: number; total: number; passed: boolean; credits: number; firstPass: boolean;
  details: ResultDetail[]; nextSlug: string | null; totalCredits: number;
};

const LETTERS = ["A", "B", "C", "D", "E"];

function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**")
          ? <strong key={i} className="font-semibold text-ink">{part.slice(2, -2)}</strong>
          : <span key={i}>{part}</span>
      )}
    </>
  );
}

function Lesson({ content }: { content: string }) {
  const blocks = useMemo(() => content.split(/\n\n+/), [content]);
  return (
    <div className="space-y-4">
      {blocks.map((block, i) => {
        const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
        const allBullets = lines.length > 0 && lines.every((l) => l.startsWith("•"));
        if (allBullets) {
          return (
            <ul key={i} className="space-y-2 rounded-xl border border-white/[0.05] bg-white/[0.02] p-4">
              {lines.map((l, j) => (
                <li key={j} className="flex items-start gap-2 text-[12px] leading-relaxed text-[#b9c2d2]">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#2fe3a0]" />
                  <span><Inline text={l.replace(/^•\s*/, "")} /></span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="text-[12.5px] leading-[1.85] text-[#b9c2d2]">
            <Inline text={block} />
          </p>
        );
      })}
    </div>
  );
}

export function ModuleExperience({
  module: mod,
  prev,
  next,
  credits,
  accuracy,
  totalModules,
  premium,
}: {
  module: ModuleData;
  prev: ModuleNeighbour;
  next: ModuleNeighbour;
  credits: number;
  accuracy: number;
  totalModules: number;
  premium: boolean;
}) {
  const router = useRouter();
  const { push } = useToast();
  const [tab, setTab] = useState<"lesson" | "quiz">("lesson");
  const [status, setStatus] = useState(mod.status);
  const [localCredits, setLocalCredits] = useState(credits);
  const [unlocking, setUnlocking] = useState(false);
  const [answers, setAnswers] = useState<Array<number | null>>(() => mod.questions.map(() => null));
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const answered = answers.filter((a) => a !== null).length;
  const locked = status === "locked";
  const completed = status === "completed";
  const canSubmit = answered === mod.questions.length && !submitting;

  async function unlock() {
    setUnlocking(true);
    try {
      const res = await fetch("/api/learn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unlock", moduleId: mod.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not unlock this module.");
      if (typeof data.credits === "number") setLocalCredits(data.credits);
      setStatus("unlocked");
      push({
        tone: "success",
        title: "Module unlocked",
        body: data.premium ? "Included with your Premium plan. Read the lesson, then take the quiz." : "Read the lesson, then take the quiz.",
      });
      router.refresh();
    } catch (err: any) {
      push({ tone: "error", title: "Unlock failed", body: err.message });
    } finally {
      setUnlocking(false);
    }
  }

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/learn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "quiz", moduleId: mod.id, answers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not submit the quiz.");
      setResult(data);
      if (typeof data.totalCredits === "number") setLocalCredits(data.totalCredits);
      if (data.passed) {
        setStatus("completed");
        push({
          tone: data.credits > 0 ? "reward" : "success",
          title: data.passed ? `Module passed · ${data.score}/${data.total}` : "Keep going",
          body: data.credits > 0 ? `+${data.credits} credits added.` : "Review the explanations and try again.",
        });
      } else {
        push({ tone: "error", title: `Scored ${data.score}/${data.total}`, body: "You need 66% to pass. Read the explanations and retake it." });
      }
      router.refresh();
    } catch (err: any) {
      push({ tone: "error", title: "Quiz failed", body: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  function retake() {
    setResult(null);
    setAnswers(mod.questions.map(() => null));
    setTab("quiz");
  }

  const firstBlock = mod.content.split(/\n\n+/)[0] ?? "";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 text-[10px] text-muted">
        <Link href="/learn" className="inline-flex min-h-8 items-center gap-1 pr-2 hover:text-ink"><ArrowLeft size={11} /> Learning ladder</Link>
        <ChevronRight size={10} />
        <span className="text-[#c9d2e2]">{mod.level}</span>
        <ChevronRight size={10} />
        <span className="truncate text-muted">{mod.title}</span>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_290px]">
        <div className="space-y-4">
          {/* header */}
          <Card className="overflow-hidden">
            <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full" style={{ background: "radial-gradient(circle, rgba(139,123,255,.13), transparent 65%)" }} />
            <div className="relative p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border",
                    completed ? "border-[rgba(47,227,160,.3)] bg-[rgba(47,227,160,.1)] text-[#5beeb9]"
                      : locked ? "border-white/[0.08] bg-white/[0.03] text-muted"
                      : "border-[rgba(139,123,255,.28)] bg-[rgba(139,123,255,.1)] text-[#b3a8ff]")}>
                    {completed ? <Check size={22} strokeWidth={3} /> : locked ? <Lock size={20} /> : <BookOpen size={20} />}
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone={mod.level === "Advanced" ? "amber" : mod.level === "Intermediate" ? "violet" : "green"}>{mod.level}</Badge>
                      <span className="text-[9.5px] text-muted">Module {mod.order_index} of {totalModules}</span>
                      {completed && <span className="chip chip-green !py-0 !text-[8.5px]">completed · {mod.score}%</span>}
                    </div>
                    <h1 className="mt-1.5 text-[20px] font-semibold tracking-tight sm:text-[24px]">{mod.title}</h1>
                    <div className="mt-0.5 text-[11.5px] text-muted">{mod.subtitle}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[9.5px] text-muted">
                  <span className="flex items-center gap-1"><Clock size={10} /> {mod.minutes} min</span>
                  <span className="flex items-center gap-1 text-[#ffd08d]"><Zap size={10} /> {mod.reward_credits} credits</span>
                </div>
              </div>

              <p className="mt-3 max-w-2xl text-[11.5px] leading-relaxed text-muted">{mod.description}</p>

              {!locked && (
                <div className="mt-4 flex items-center gap-1 rounded-lg border border-white/[0.06] bg-black/20 p-0.5">
                  <button onClick={() => setTab("lesson")}
                    className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-[11px] font-semibold transition", tab === "lesson" ? "bg-white/[0.09] text-ink" : "text-muted hover:text-ink")}>
                    <BookOpen size={12} /> Lesson
                  </button>
                  <button onClick={() => setTab("quiz")}
                    className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-[11px] font-semibold transition", tab === "quiz" ? "bg-white/[0.09] text-ink" : "text-muted hover:text-ink")}>
                    <GraduationCap size={12} /> Quiz · {mod.questions.length} questions
                    {completed && <Check size={11} className="text-[#5beeb9]" />}
                  </button>
                </div>
              )}
            </div>
          </Card>

          {/* locked gate */}
          {locked ? (
            <Card className="overflow-hidden">
              <div className="relative p-6">
                <div className="mx-auto flex max-w-md flex-col items-center text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[rgba(139,123,255,.28)] bg-[rgba(139,123,255,.09)]">
                    <Lock size={24} className="text-[#b3a8ff]" />
                  </div>
                  <div className="mt-3 text-[16px] font-semibold">This module is locked</div>
                  <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">
                    {premium && mod.unlock_cost > 0
                      ? "Included with Premium. Unlock this module at no credit cost — credits you earn from quizzes stay in your wallet."
                      : mod.unlock_cost > 0
                        ? `Unlock it for ${mod.unlock_cost} credits. You currently hold ${localCredits}. Credits are earned by passing earlier modules — never bought with money.`
                        : "This module is free to open. Unlock it to start the lesson."}
                  </p>
                  <div className="mt-4 w-full rounded-xl border border-white/[0.06] bg-black/25 p-3 text-left">
                    <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                      <Lightbulb size={11} className="text-[#ffd08d]" /> Preview
                    </div>
                    <p className="mt-1.5 line-clamp-3 text-[11px] leading-relaxed text-[#b9c2d2]">
                      {firstBlock.replace(/\*\*/g, "").replace(/•/g, "")}
                    </p>
                  </div>
                  <button onClick={unlock} disabled={unlocking || (!premium && localCredits < mod.unlock_cost)}
                    className="btn btn-primary mt-4 w-full max-w-xs">
                    {unlocking
                      ? "Unlocking…"
                      : premium && mod.unlock_cost > 0
                        ? <><Unlock size={14} /> Unlock with Premium</>
                        : mod.unlock_cost > 0
                          ? <><Unlock size={14} /> Unlock for {mod.unlock_cost} credits</>
                          : <><Unlock size={14} /> Unlock module</>}
                  </button>
                  {!premium && localCredits < mod.unlock_cost && (
                    <div className="mt-2 text-[10px] text-[#ff8fa3]">
                      You need {mod.unlock_cost - localCredits} more credits. Pass an earlier module first.
                    </div>
                  )}
                  <Link href="/learn" className="mt-2 text-[10.5px] font-medium text-muted hover:text-ink">Back to the ladder</Link>
                </div>
              </div>
            </Card>
          ) : tab === "lesson" ? (
            <Card className="overflow-hidden">
              <div className="border-b border-white/[0.06] p-4">
                <SectionHead title="Lesson" subtitle={`${mod.minutes} minute read · ${mod.level}`} />
              </div>
              <div className="p-5">
                {mod.video_url && (
                  <div className="mb-4">
                    <ModuleVideo url={mod.video_url} title={mod.title} minutes={mod.minutes} />
                  </div>
                )}
                <Lesson content={mod.content} />
                <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-[rgba(255,192,97,.18)] bg-[rgba(255,192,97,.04)] p-3.5">
                  <Lightbulb size={14} className="mt-0.5 shrink-0 text-[#ffd08d]" />
                  <div>
                    <div className="text-[10.5px] font-semibold text-[#ffd08d]">Key takeaway</div>
                    <div className="mt-0.5 text-[10.5px] leading-relaxed text-[#c9bda6]">
                      You are assessed on the mechanics, not the vocabulary. If you can explain the trade-off out loud, you are ready for the quiz.
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[10px] text-muted">{mod.questions.length} questions · pass mark 66%</div>
                  <button onClick={() => setTab("quiz")} className="btn btn-primary btn-sm">
                    Take the quiz <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] p-4">
                <SectionHead title="Module quiz" subtitle={`${mod.questions.length} questions · pass mark 66%`} />
                <span className="text-[10px] text-muted">{answered}/{mod.questions.length} answered</span>
              </div>
              <div className="p-4 sm:p-5">
                {result ? (
                  <div className="animate-fade-in">
                    <div className={cn("relative overflow-hidden rounded-2xl border p-5 text-center",
                      result.passed ? "border-[rgba(47,227,160,.25)] bg-[rgba(47,227,160,.05)]" : "border-[rgba(255,93,122,.22)] bg-[rgba(255,93,122,.04)]")}>
                      <div className={cn("mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border",
                        result.passed ? "border-[rgba(47,227,160,.35)] bg-[rgba(47,227,160,.12)]" : "border-[rgba(255,93,122,.3)] bg-[rgba(255,93,122,.1)]")}>
                        {result.passed ? <Trophy size={24} className="text-[#5beeb9]" /> : <RotateCcw size={22} className="text-[#ff8fa3]" />}
                      </div>
                      <div className="mt-3 text-[22px] font-semibold tracking-tight">
                        {result.score} / {result.total}
                      </div>
                      <div className={cn("mt-0.5 text-[12px] font-semibold", result.passed ? "text-[#5beeb9]" : "text-[#ff8fa3]")}>
                        {result.passed ? "Module passed" : "Not quite — 66% needed"}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-[10.5px] text-muted">
                        {result.credits > 0 && <span className="chip chip-amber"><Zap size={9} /> +{result.credits} credits</span>}
                        <span>{result.firstPass ? "First pass" : "Retake"}</span>
                        <span>·</span>
                        <span>{Math.round((result.score / result.total) * 100)}% accuracy</span>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                        {result.passed && result.nextSlug && (
                          <Link href={`/learn/${result.nextSlug}`} className="btn btn-primary btn-sm">Next module <ArrowRight size={13} /></Link>
                        )}
                        <button onClick={retake} className="btn btn-ghost btn-sm"><RotateCcw size={12} /> Retake quiz</button>
                        <Link href="/learn" className="btn btn-dark btn-sm">Back to ladder</Link>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2.5">
                      {mod.questions.map((q, i) => {
                        const d = result.details[i];
                        return (
                          <div key={q.id} className={cn("rounded-xl border p-3.5",
                            d.correct ? "border-[rgba(47,227,160,.2)] bg-[rgba(47,227,160,.03)]" : "border-[rgba(255,93,122,.18)] bg-[rgba(255,93,122,.03)]")}>
                            <div className="flex items-start gap-2">
                              <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                                d.correct ? "bg-[rgba(47,227,160,.16)] text-[#5beeb9]" : "bg-[rgba(255,93,122,.14)] text-[#ff8fa3]")}>
                                {d.correct ? <Check size={11} strokeWidth={3} /> : <X size={11} strokeWidth={3} />}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="text-[11.5px] font-semibold leading-snug">{q.prompt}</div>
                                <div className="mt-1.5 text-[10px] text-muted">
                                  Correct answer: <span className="font-semibold text-[#8df5d0]">{LETTERS[d.answer]}. {q.options[d.answer]}</span>
                                </div>
                                <div className="mt-1 rounded-lg bg-black/25 px-2.5 py-2 text-[10px] leading-relaxed text-[#b9c2d2]">
                                  {d.explanation}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mod.questions.map((q, qi) => (
                      <div key={q.id} className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-4">
                        <div className="flex items-start gap-2.5">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-[10px] font-bold text-muted">
                            {qi + 1}
                          </span>
                          <div className="text-[12px] font-semibold leading-snug">{q.prompt}</div>
                        </div>
                        <div className="mt-3 space-y-1.5">
                          {q.options.map((opt, oi) => {
                            const selected = answers[qi] === oi;
                            return (
                              <button key={oi} onClick={() => setAnswers((prev) => prev.map((a, idx) => (idx === qi ? oi : a)))}
                                className={cn("flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition",
                                  selected ? "border-[rgba(47,227,160,.35)] bg-[rgba(47,227,160,.07)]" : "border-white/[0.06] bg-black/15 hover:border-white/15")}>
                                <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[9px] font-bold",
                                  selected ? "border-[#2fe3a0] bg-[#2fe3a0] text-[#04140d]" : "border-white/15 text-muted")}>
                                  {selected ? <Check size={11} strokeWidth={3} /> : LETTERS[oi]}
                                </span>
                                <span className={cn("text-[11px] leading-relaxed", selected ? "text-[#d7f7ec]" : "text-[#b9c2d2]")}>{opt}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-2 text-[10px] text-muted">
                        <Progress value={(answered / mod.questions.length) * 100} className="w-24" />
                        <span>{answered}/{mod.questions.length}</span>
                      </div>
                      <button onClick={submit} disabled={!canSubmit} className="btn btn-primary btn-sm">
                        {submitting ? "Scoring…" : <>Submit answers <ArrowRight size={13} /></>}
                      </button>
                    </div>
                    <div className="flex items-start gap-1.5 text-[9.5px] leading-relaxed text-muted/70">
                      <Sparkles size={10} className="mt-0.5 shrink-0 text-[#ffd08d]" />
                      A perfect score pays the full reward. A pass pays 60%. Credits can only be earned here.
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* prev / next */}
          <div className="grid gap-3 sm:grid-cols-2">
            {prev ? (
              <Link href={`/learn/${prev.slug}`} className="card-soft card-hover flex items-center gap-2.5 p-3.5">
                <ArrowLeft size={14} className="shrink-0 text-muted" />
                <div className="min-w-0">
                  <div className="text-[9px] uppercase tracking-[0.1em] text-muted">Previous</div>
                  <div className="truncate text-[11px] font-semibold">{prev.title}</div>
                </div>
              </Link>
            ) : <div />}
            {next ? (
              <Link href={`/learn/${next.slug}`} className="card-soft card-hover flex items-center gap-2.5 p-3.5 sm:justify-end sm:text-right">
                <div className="min-w-0">
                  <div className="text-[9px] uppercase tracking-[0.1em] text-muted">Next</div>
                  <div className="truncate text-[11px] font-semibold">{next.title}</div>
                </div>
                <ArrowRight size={14} className="shrink-0 text-muted" />
              </Link>
            ) : <div />}
          </div>
        </div>

        {/* rail */}
        <aside className="space-y-4 xl:sticky xl:top-[112px] xl:self-start">
          <Card className="p-4">
            <SectionHead title="Module facts" subtitle={`Module ${mod.order_index} of ${totalModules}`} />
            <div className="mt-3 space-y-2">
              {[
                ["Level", mod.level],
                ["Read time", `${mod.minutes} minutes`],
                ["Questions", `${mod.questions.length}`],
                ["Reward", `${mod.reward_credits} credits`],
                ["Status", completed ? "Completed" : locked ? "Locked" : "Unlocked"],
              ].map(([l, v]) => (
                <div key={l} className="flex items-center justify-between text-[10.5px]">
                  <span className="text-muted">{l}</span>
                  <span className={cn("font-semibold", l === "Reward" ? "text-[#ffd08d]" : l === "Status" && completed ? "text-[#5beeb9]" : "")}>{v}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 border-t border-white/[0.05] pt-3">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-muted">Credits balance</span>
                <span className="flex items-center gap-1 font-semibold text-[#ffd08d]"><Zap size={10} /> {localCredits}</span>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <SectionHead title="Learning record" subtitle="Public, honest marks" />
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[rgba(139,123,255,.22)] bg-[rgba(139,123,255,.08)] text-[#b3a8ff]">
                <Sparkles size={16} />
              </div>
              <div>
                <div className="num text-[15px] font-semibold">{accuracy.toFixed(1)}%</div>
                <div className="text-[9px] uppercase tracking-[0.1em] text-muted">AI forecast accuracy</div>
              </div>
            </div>
            <p className="mt-2.5 text-[9.5px] leading-relaxed text-muted">
              Forecasts are scored in public. Nothing on this platform hides its track record.
            </p>
          </Card>

          <div className="rounded-xl border border-white/[0.055] bg-white/[0.015] p-3.5">
            <div className="flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-muted">
              <GraduationCap size={11} /> Curriculum note
            </div>
            <p className="mt-1.5 text-[9.5px] leading-relaxed text-muted">
              Modules build on each other. Skipping the foundations makes the advanced material feel like trivia instead of mechanics.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
