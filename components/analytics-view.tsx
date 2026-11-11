"use client";

import Link from "next/link";
import {
  ArrowRight, BarChart3, BrainCircuit, CheckCircle2, Crown, GraduationCap,
  ShieldCheck, Sparkles, Target, TrendingUp,
} from "lucide-react";
import { Badge, Card, Progress, SectionHead, cn } from "./ui";
import { AnalyticsActions } from "./analytics-actions";
import { fmtMoney, levelFromXp } from "@/lib/finance";
import { metricValue } from "@/lib/analytics-format";
import type { AnalyticsMetric, AnalyticsReport, MetricBand } from "@/lib/analytics-types";

const BAND_TEXT: Record<MetricBand, string> = {
  good: "text-[#5beeb9]",
  watch: "text-[#ffd08d]",
  risk: "text-[#ff8fa3]",
  none: "text-muted",
};

const BAND_BG: Record<MetricBand, string> = {
  good: "border-[rgba(47,227,160,.22)] bg-[rgba(47,227,160,.05)]",
  watch: "border-[rgba(255,192,97,.22)] bg-[rgba(255,192,97,.05)]",
  risk: "border-[rgba(255,143,163,.22)] bg-[rgba(255,143,163,.05)]",
  none: "border-white/[0.06] bg-white/[0.015]",
};

function MetricCard({ metric, region }: { metric: AnalyticsMetric; region: string }) {
  return (
    <div className={cn("rounded-xl border p-3.5", BAND_BG[metric.band])}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-muted">{metric.label}</div>
        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full",
          metric.band === "good" ? "bg-[#5beeb9]" :
          metric.band === "watch" ? "bg-[#ffd08d]" :
          metric.band === "risk" ? "bg-[#ff8fa3]" : "bg-white/20")} />
      </div>
      <div className={cn("num mt-2 text-[21px] font-semibold leading-none", BAND_TEXT[metric.band])}>
        {metricValue(metric, region)}
      </div>
      <p className="mt-2 text-[10.5px] leading-relaxed text-muted">{metric.detail}</p>
    </div>
  );
}

export function AnalyticsView({ report }: { report: AnalyticsReport }) {
  const region = report.user.region;
  const { learning } = report;
  const level = levelFromXp(learning.xp);
  const generated = new Date(report.generatedAt);

  return (
    <div className="mx-auto max-w-[1120px] px-4 pb-14 pt-6 sm:px-6 print:max-w-none print:px-0">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <div className="eyebrow flex items-center gap-1.5"><BarChart3 size={11} /> Analytics</div>
          <h1 className="mt-2 text-[27px] font-semibold leading-tight tracking-[-0.03em] sm:text-[33px]">
            Complete analytics &amp; improvement plan
          </h1>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">
            {report.user.name} · generated {generated.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge tone="amber"><Crown size={9} /> Premium analytics</Badge>
          <AnalyticsActions />
        </div>
      </div>

      <div className="mt-5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {report.headline.map((item) => (
          <div key={item.label} className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-4">
            <div className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-muted">{item.label}</div>
            <div className={cn("num mt-2 text-[24px] font-semibold leading-none", BAND_TEXT[item.band])}>
              {item.value === null
                ? "—"
                : item.unit === "money"
                  ? fmtMoney(item.value, region)
                  : item.unit === "pct"
                    ? `${item.value.toFixed(2)}%`
                    : item.value}
            </div>
            <div className="mt-1.5 text-[10px] leading-relaxed text-muted">{item.sub}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[.85fr_1.15fr]">
        <Card className="p-5">
          <SectionHead title="Risk & behaviour" subtitle="Derived only from your real record" />
          <div className="mt-4 flex items-center gap-4">
            <div
              className="relative h-[104px] w-[104px] shrink-0 rounded-full"
              style={{
                background: `conic-gradient(${
                  report.risk.score === null || report.risk.score < 50
                    ? "#ff8fa3"
                    : report.risk.score < 70
                      ? "#ffd08d"
                      : "#5beeb9"
                } ${(report.risk.score ?? 0) * 3.6}deg, rgba(255,255,255,.06) 0deg)`,
              }}
            >
              <div className="absolute inset-[13px] flex flex-col items-center justify-center rounded-full bg-[#0a0e15]">
                <span className="num text-[24px] font-semibold leading-none">{report.risk.score ?? "—"}</span>
                <span className="mt-0.5 text-[9px] text-muted">/ 100</span>
              </div>
            </div>
            <div>
              <div className="text-[14px] font-semibold">{report.risk.band}</div>
              <div className="mt-1 text-[10.5px] leading-relaxed text-muted">
                {report.risk.coverage}% signal coverage. Signals with no data are excluded, never estimated.
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {report.risk.metrics.map((metric) => (
              <div key={metric.key}>
                <div className="flex items-center justify-between text-[10.5px]">
                  <span className="text-[#c9d2e2]">{metric.label}</span>
                  <span className={cn("num font-semibold", BAND_TEXT[metric.band])}>{metricValue(metric, region)}</span>
                </div>
                <Progress
                  className="mt-1.5"
                  value={metric.value === null ? 0 : metric.unit === "x" ? Math.min(100, metric.value * 4) : Math.min(100, Math.abs(metric.value))}
                  tone={metric.band === "risk" ? "amber" : metric.band === "watch" ? "amber" : "green"}
                />
              </div>
            ))}
          </div>
        </Card>

        <div className="grid gap-2.5 sm:grid-cols-2">
          {report.execution.map((metric) => (
            <MetricCard key={metric.key} metric={metric} region={region} />
          ))}
        </div>
      </div>

      <Card className="mt-6 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <SectionHead title="Learning progress" subtitle={`${learning.modulesDone} of ${learning.totalModules} modules completed`} />
          <Link href="/learn" className="btn btn-dark btn-sm">
            <GraduationCap size={13} /> Open learning ladder
          </Link>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
          <div>
            <div className="flex items-center justify-between text-[10.5px] text-muted">
              <span>Curriculum completion</span>
              <span className="num font-semibold text-ink">
                {learning.totalModules > 0 ? Math.round((learning.modulesDone / learning.totalModules) * 100) : 0}%
              </span>
            </div>
            <Progress
              className="mt-2"
              value={learning.totalModules > 0 ? (learning.modulesDone / learning.totalModules) * 100 : 0}
            />
            <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.015] p-2.5">
                <div className="text-[9px] uppercase tracking-wide text-muted">Average quiz</div>
                <div className="num mt-1 text-[16px] font-semibold">{learning.avgQuiz.toFixed(0)}%</div>
              </div>
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.015] p-2.5">
                <div className="text-[9px] uppercase tracking-wide text-muted">Best quiz</div>
                <div className="num mt-1 text-[16px] font-semibold">{learning.bestQuiz.toFixed(0)}%</div>
              </div>
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.015] p-2.5">
                <div className="text-[9px] uppercase tracking-wide text-muted">Attempts</div>
                <div className="num mt-1 text-[16px] font-semibold">{learning.attempts}</div>
              </div>
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.015] p-2.5">
                <div className="text-[9px] uppercase tracking-wide text-muted">Crash drill</div>
                <div className={cn("mt-1 flex items-center gap-1 text-[12px] font-semibold", learning.crashDone ? "text-[#5beeb9]" : "text-[#ffd08d]")}>
                  {learning.crashDone ? <CheckCircle2 size={12} /> : <Target size={12} />}
                  {learning.crashDone ? "Done" : "Pending"}
                </div>
              </div>
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.015] p-2.5">
                <div className="text-[9px] uppercase tracking-wide text-muted">Streak</div>
                <div className="num mt-1 text-[16px] font-semibold">{learning.streak}d</div>
              </div>
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.015] p-2.5">
                <div className="text-[9px] uppercase tracking-wide text-muted">Arena</div>
                <div className="num mt-1 text-[16px] font-semibold">{learning.arenaWins}/{learning.arenaMatches}</div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[rgba(139,123,255,.18)] bg-[rgba(139,123,255,.04)] p-4">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#b3a8ff]">
              <TrendingUp size={11} /> Next step
            </div>
            <div className="mt-2 text-[13px] font-semibold">
              {learning.nextModule ? learning.nextModule.title : "All modules complete"}
            </div>
            <p className="mt-1.5 text-[10.5px] leading-relaxed text-muted">
              {learning.nextModule
                ? "Finish this module to move one step closer to the final assessment and the Completion Merit Certificate."
                : "Every module is complete. The final assessment unlocks the Completion Merit Certificate."}
            </p>
            <div className="mt-3 flex items-center gap-2 text-[10px] text-muted">
              <Sparkles size={11} className="text-[#ffd08d]" /> Level {learning.level} · {learning.xp} XP
            </div>
            <Progress className="mt-2" value={level.progress * 100} tone="violet" />
            <Link
              href={learning.nextModule ? `/learn/${learning.nextModule.slug}` : "/learn"}
              className="btn btn-primary btn-sm mt-3 w-full"
            >
              {learning.nextModule ? "Continue learning" : "Open learning ladder"} <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </Card>

      <Card className="mt-6 p-5">
        <div className="flex items-center gap-2">
          <BrainCircuit size={15} className="text-[#5beeb9]" />
          <h2 className="text-[15px] font-semibold">Your improvement plan</h2>
        </div>
        <p className="mt-1 text-[10.5px] leading-relaxed text-muted">
          Generated from the metrics above. Each step names a behaviour you can change in the simulation.
        </p>
        <ol className="mt-4 space-y-2.5">
          {report.guidance.map((line, index) => (
            <li key={line} className="flex gap-3 rounded-xl border border-white/[0.06] bg-white/[0.015] p-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[rgba(47,227,160,.1)] text-[11px] font-semibold text-[#5beeb9]">
                {index + 1}
              </span>
              <span className="text-[11.5px] leading-relaxed text-[#c9d2e2]">{line}</span>
            </li>
          ))}
        </ol>
      </Card>

      <div className="mt-6 flex flex-wrap items-center gap-3 text-[10px] text-muted">
        <span className="flex items-center gap-1.5"><ShieldCheck size={11} className="text-[#5beeb9]" /> Simulation only — no real capital at risk</span>
        <span className="text-muted/30">·</span>
        <span>Credits never convert to cash</span>
        <span className="text-muted/30">·</span>
        <Link href="/portfolio/report" className="inline-flex items-center gap-1 font-semibold text-[#8df5d0] hover:underline">
          Portfolio report <ArrowRight size={10} />
        </Link>
      </div>
    </div>
  );
}
