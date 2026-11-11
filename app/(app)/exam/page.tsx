import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight, Award, Check, CheckCircle2, Crown, GraduationCap, Lock, ShieldCheck, Sparkles,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getModules } from "@/lib/data";
import { examEligibility, EXAM_PASS_PCT, EXAM_QUESTION_COUNT } from "@/lib/exam";
import { Badge, Card, Progress } from "@/components/ui";
import { FinalExam } from "@/components/final-exam";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Final assessment — MockTrade Matrix",
  robots: { index: false, follow: false },
};

export default async function ExamPage() {
  const user = await requireUser();
  const gate = examEligibility(user);

  if (!gate.premium) {
    return (
      <div className="mx-auto max-w-[900px] px-4 pb-16 pt-6 sm:px-6">
        <div className="eyebrow flex items-center gap-1.5"><Award size={11} /> Final assessment</div>
        <h1 className="mt-2 text-[28px] font-semibold leading-tight tracking-[-0.03em] sm:text-[34px]">
          The final assessment is part of Premium
        </h1>
        <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-muted">
          Premium unlocks every learning module and the final assessment. Pass it after completing the
          curriculum to earn the Completion Merit Certificate.
        </p>

        <Card className="mt-6 overflow-hidden">
          <div className="relative p-6">
            <div
              className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full"
              style={{ background: "radial-gradient(circle, rgba(255,208,141,.14), transparent 65%)" }}
            />
            <div className="relative flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Crown size={15} className="text-[#ffd08d]" />
                  <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#ffd08d]">
                    Premium assessment
                  </span>
                </div>
                <p className="mt-2 max-w-xl text-[11.5px] leading-relaxed text-muted">
                  Current plan: <span className="font-semibold text-ink">{gate.premium ? "Premium" : "Free"}</span>.
                  {gate.totalModules > 0 && ` ${gate.modulesDone} of ${gate.totalModules} modules completed.`}
                </p>
              </div>
              <Badge tone="amber"><Lock size={9} /> Locked</Badge>
            </div>

            <div className="relative mt-5 grid gap-2 sm:grid-cols-2">
              {[
                "Every learning module unlocks at no credit cost",
                `${EXAM_QUESTION_COUNT} questions covering the full curriculum`,
                `${EXAM_PASS_PCT}% pass mark with a server-side score`,
                "Completion Merit Certificate with a public verification link",
                "Answer explanations after every attempt",
                "Retakes allowed to improve your score",
              ].map((line) => (
                <div key={line} className="flex items-start gap-2 text-[11px] leading-relaxed text-[#c9d2e2]">
                  <Check size={11} className="mt-0.5 shrink-0 text-[#5beeb9]" /> {line}
                </div>
              ))}
            </div>

            <div className="relative mt-6 flex flex-wrap gap-2">
              <Link href="/pricing" className="btn btn-primary">
                <Crown size={14} /> See Premium <ArrowRight size={13} />
              </Link>
              <Link href="/learn" className="btn btn-dark">
                <GraduationCap size={14} /> Open learning ladder
              </Link>
            </div>
            <div className="relative mt-3 flex items-center gap-1.5 text-[9.5px] text-muted">
              <ShieldCheck size={10} className="text-[#5beeb9]" /> No card is charged. Premium is activated with earned credits.
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!gate.allComplete) {
    const modules = getModules(user.id);
    const next = modules.find((module) => module.status !== "completed");
    const pct = gate.totalModules > 0 ? (gate.modulesDone / gate.totalModules) * 100 : 0;

    return (
      <div className="mx-auto max-w-[900px] px-4 pb-16 pt-6 sm:px-6">
        <div className="eyebrow flex items-center gap-1.5"><Award size={11} /> Final assessment</div>
        <h1 className="mt-2 text-[28px] font-semibold leading-tight tracking-[-0.03em] sm:text-[34px]">
          Finish the curriculum first
        </h1>
        <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-muted">
          The final assessment opens once every learning module is complete. Premium already covers
          every unlock, so the remaining step is the lessons themselves.
        </p>

        <Card className="mt-6 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles size={15} className="text-[#ffd08d]" />
                <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#ffd08d]">
                  Curriculum progress
                </span>
              </div>
              <div className="num mt-3 text-[32px] font-semibold leading-none">
                {gate.modulesDone} <span className="text-[16px] font-normal text-muted">/ {gate.totalModules}</span>
              </div>
              <div className="mt-1 text-[10.5px] text-muted">modules completed</div>
            </div>
            <Badge tone="green"><CheckCircle2 size={9} /> Premium active</Badge>
          </div>

          <Progress className="mt-5" value={pct} />

          <div className="mt-5 rounded-xl border border-white/[0.06] bg-white/[0.015] p-4">
            <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted">Next module</div>
            <div className="mt-1 text-[14px] font-semibold">
              {next ? next.title : "All modules complete"}
            </div>
            <p className="mt-1 text-[10.5px] leading-relaxed text-muted">
              {next
                ? "Complete this module, then continue down the ladder until every module shows as completed."
                : "Refresh this page to start the final assessment."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {next && (
                <Link href={`/learn/${next.slug}`} className="btn btn-primary btn-sm">
                  Continue learning <ArrowRight size={12} />
                </Link>
              )}
              <Link href="/learn" className="btn btn-dark btn-sm">
                <GraduationCap size={12} /> Open learning ladder
              </Link>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-1.5 text-[9.5px] text-muted">
            <ShieldCheck size={10} className="text-[#5beeb9]" />
            The assessment counts modules marked completed, not just unlocked.
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[980px] px-4 pb-16 pt-6 sm:px-6">
      <div className="eyebrow flex items-center gap-1.5"><Award size={11} /> Final assessment</div>
      <h1 className="mt-2 text-[28px] font-semibold leading-tight tracking-[-0.03em] sm:text-[34px]">
        Completion Merit Certificate
      </h1>
      <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-muted">
        All {gate.totalModules} modules are complete. Pass the final assessment to earn the certificate
        from MockTradeMatrix.
      </p>

      <FinalExam
        passMark={EXAM_PASS_PCT}
        questionCount={EXAM_QUESTION_COUNT}
        certificateSerial={gate.certificate?.serial ?? null}
        bestPercent={gate.bestPercent}
      />
    </div>
  );
}
