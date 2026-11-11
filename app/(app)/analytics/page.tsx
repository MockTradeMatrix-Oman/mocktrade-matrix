import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BarChart3, Check, Crown, FileDown, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { isPremium, planLabel } from "@/lib/plans";
import { buildAnalytics } from "@/lib/analytics";
import { AnalyticsView } from "@/components/analytics-view";
import { Badge, Card } from "@/components/ui";
import { FREE_FEATURES, PREMIUM_FEATURES } from "@/lib/plans-copy";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Analytics — MockTrade Matrix",
  robots: { index: false, follow: false },
};

export default async function AnalyticsPage() {
  const user = await requireUser();

  if (!isPremium(user)) {
    return (
      <div className="mx-auto max-w-[900px] px-4 pb-16 pt-6 sm:px-6">
        <div className="eyebrow flex items-center gap-1.5"><BarChart3 size={11} /> Analytics</div>
        <h1 className="mt-2 text-[28px] font-semibold leading-tight tracking-[-0.03em] sm:text-[34px]">
          Complete analytics is part of Premium
        </h1>
        <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-muted">
          Your free portfolio report is unchanged and still available. Premium adds the full picture: risk,
          execution quality, learning progress and a written improvement plan generated from your own record.
        </p>

        <Card className="mt-6 overflow-hidden">
          <div className="relative p-6">
            <div
              className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full"
              style={{ background: "radial-gradient(circle, rgba(47,227,160,.14), transparent 65%)" }}
            />
            <div className="relative flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Crown size={15} className="text-[#ffd08d]" />
                  <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#ffd08d]">Premium analytics</span>
                </div>
                <p className="mt-2 max-w-xl text-[11.5px] leading-relaxed text-muted">
                  Current plan: <span className="font-semibold text-ink">{planLabel(user)}</span>. Unlocking Premium
                  also opens every learning module and the final assessment.
                </p>
              </div>
              <Badge tone="amber"><Lock size={9} /> Locked</Badge>
            </div>

            <div className="relative mt-5 grid gap-2 sm:grid-cols-2">
              {[
                "Return, risk and execution metrics in one view",
                "Concentration, drawdown and cash-buffer checks",
                "Fees, tax and turnover cost analysis",
                "Quiz and curriculum progress breakdown",
                "A written improvement plan from your own data",
                "CSV, HTML and print / PDF exports",
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
              <Link href="/portfolio/report" className="btn btn-dark">
                <FileDown size={14} /> Open free portfolio report
              </Link>
            </div>
            <div className="relative mt-3 flex items-center gap-1.5 text-[9.5px] text-muted">
              <ShieldCheck size={10} className="text-[#5beeb9]" /> No card is charged. Premium is activated with earned credits.
            </div>
          </div>
        </Card>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Card className="p-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">Free keeps today's report</div>
            <ul className="mt-2 space-y-1.5">
              {FREE_FEATURES.slice(6, 8).map((line) => (
                <li key={line} className="flex items-start gap-2 text-[10.5px] leading-relaxed text-muted">
                  <Check size={10} className="mt-0.5 shrink-0 text-[#5beeb9]" /> {line}
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#ffd08d]">Premium adds</div>
            <ul className="mt-2 space-y-1.5">
              {PREMIUM_FEATURES.slice(1, 4).map((line) => (
                <li key={line} className="flex items-start gap-2 text-[10.5px] leading-relaxed text-muted">
                  <Sparkles size={10} className="mt-0.5 shrink-0 text-[#ffd08d]" /> {line}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    );
  }

  const report = buildAnalytics(user);
  return <AnalyticsView report={report} />;
}
