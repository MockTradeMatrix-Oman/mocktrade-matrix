import Link from "next/link";
import {
  ArrowLeft, ArrowRight, Building2, Check, Crown, Info, Mail, ShieldCheck, Sparkles, X,
} from "lucide-react";
import { Badge } from "./ui";
import { ActivatePremium } from "./activate-premium";
import { CONTACT_EMAIL, institutionEmail } from "@/lib/contact";
import {
  FREE_FEATURES, INSTITUTION_FEATURES, PLAN_COMPARE, PREMIUM_FEATURES, PREMIUM_SHIPPING,
} from "@/lib/plans-copy";
import { PREMIUM_MONTH_CREDITS } from "@/lib/plans";

const FAQ: Array<[string, string]> = [
  [
    "How does Premium activation work?",
    "Premium costs 500 earned credits for 30 days. Credits come from passing modules and Arena battles — they are never bought with money. Activation is instant and no card is requested.",
  ],
  [
    "What happens when Premium expires?",
    "The extra features close and the account returns to Free. Every completed module, quiz score, unlocked module, trade and report stays exactly where it is. Nothing is deleted.",
  ],
  [
    "Is the certificate accredited?",
    "No. It is a Completion Merit Certificate from MockTradeMatrix for finishing all eight modules and the final assessment. It is not a licensed financial qualification and does not imply SEBI, SEC or university accreditation.",
  ],
  [
    "How do the monthly expert sessions work?",
    "Premium members are invited first to a monthly group session with a guest practitioner. Sessions are scheduled by the MockTradeMatrix team. The first session is still being scheduled, so it is labelled Shipping next until a real speaker and date are confirmed.",
  ],
  [
    "Can I pay with cash?",
    "Not in this build. No card payments, invoices or subscriptions are processed. If real billing is enabled later, prices, taxes, renewal and cancellation terms will be shown before any payment is requested.",
  ],
  [
    "What does Institution cost?",
    "Institution is quoted per cohort. The button opens a pre-filled email so we can size the classroom, seats and support. No checkout is involved.",
  ],
];

export function PricingPage({
  signedIn,
  premium,
  label,
  credits,
}: {
  signedIn: boolean;
  premium: boolean;
  label: string;
  credits: number;
}) {
  return (
    <main className="relative z-10 mx-auto max-w-[1180px] px-5 pb-20 pt-10 sm:pt-14">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted transition hover:text-ink">
          <ArrowLeft size={12} /> Back to MockTradeMatrix
        </Link>
        <div className="flex items-center gap-2">
          <span className="chip chip-green !py-0 !text-[8.5px]"><ShieldCheck size={9} /> ZERO REAL MONEY</span>
          {signedIn && <Badge tone={premium ? "amber" : "neutral"}>{label}</Badge>}
        </div>
      </div>

      <div className="mx-auto mt-10 max-w-2xl text-center">
        <div className="eyebrow">Plans &amp; access</div>
        <h1 className="mt-3 text-[34px] font-semibold leading-[1.06] tracking-[-0.035em] sm:text-[46px]">
          Learn free. Go deeper on Premium.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-[12.5px] leading-relaxed text-muted">
          Every learner keeps the full simulation on the Free plan. Premium adds every module unlocked, the final
          exam and merit certificate, complete analytics, and a monthly expert session. Institution adds the
          classroom layer.
        </p>
        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[rgba(255,192,97,.22)] bg-[rgba(255,192,97,.07)] px-3 py-1.5 text-[10px] font-semibold text-[#ffd08d]">
          <Sparkles size={11} /> Beta pricing: {PREMIUM_MONTH_CREDITS} earned credits / month · no cash charged
        </div>
      </div>

      <div className="mt-10 grid gap-4 lg:grid-cols-3">
        {/* Free */}
        <section className="card p-6">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Free</div>
          <div className="mt-3 flex items-end gap-1">
            <span className="num text-[34px] font-semibold leading-none">₹0</span>
            <span className="mb-1 text-[11px] text-muted">/ $0</span>
          </div>
          <p className="mt-2 text-[11px] text-muted">Everything the app has today. No card, no expiry.</p>
          <ul className="mt-5 space-y-2">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-[11px] leading-relaxed text-[#b9c2d2]">
                <Check size={11} className="mt-0.5 shrink-0 text-[#5beeb9]" /> {f}
              </li>
            ))}
          </ul>
          <Link href={signedIn ? "/dashboard" : "/signup"} className="btn btn-ghost mt-6 w-full">
            {signedIn ? "Current plan" : "Create free account"} <ArrowRight size={13} />
          </Link>
        </section>

        {/* Premium */}
        <section className="card relative overflow-hidden p-6 ring-1 ring-[rgba(47,227,160,.28)]">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full" style={{ background: "radial-gradient(circle, rgba(47,227,160,.16), transparent 65%)" }} />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5beeb9]">Premium</div>
              <Badge tone="green">Investor beta</Badge>
            </div>
            <div className="mt-3 flex items-end gap-1.5">
              <span className="num text-[34px] font-semibold leading-none">{PREMIUM_MONTH_CREDITS}</span>
              <span className="mb-1 text-[11px] text-muted">credits / month</span>
            </div>
            <p className="mt-2 text-[11px] text-muted">
              30 days. Credits are earned in Learning and the Arena — never bought with money.
            </p>
            <ul className="mt-5 space-y-2">
              {PREMIUM_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-[11px] leading-relaxed text-[#b9c2d2]">
                  <Check size={11} className="mt-0.5 shrink-0 text-[#5beeb9]" /> {f}
                </li>
              ))}
              <li className="flex items-start gap-2 text-[11px] leading-relaxed text-[#b9c2d2]">
                <Sparkles size={11} className="mt-0.5 shrink-0 text-[#ffd08d]" />
                <span>
                  {PREMIUM_SHIPPING}{" "}
                  <span className="ml-1 rounded bg-[rgba(255,192,97,.12)] px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-[#ffd08d]">
                    Shipping next
                  </span>
                </span>
              </li>
            </ul>
            <ActivatePremium
              signedIn={signedIn}
              premium={premium}
              label={label}
              credits={credits}
              price={PREMIUM_MONTH_CREDITS}
            />
            <p className="mt-2 text-center text-[9px] leading-relaxed text-muted/70">
              No auto-renew. No card. No cash price in this build.
            </p>
          </div>
        </section>

        {/* Institution */}
        <section className="card p-6">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#b3a8ff]">Institution</div>
            <Badge tone="violet"><Building2 size={9} /> Cohorts</Badge>
          </div>
          <div className="mt-3 flex items-end gap-1.5">
            <span className="text-[27px] font-semibold leading-none">Custom quote</span>
          </div>
          <p className="mt-2 text-[11px] text-muted">Per cohort. Sized with you, not a checkout.</p>
          <ul className="mt-5 space-y-2">
            {INSTITUTION_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-[11px] leading-relaxed text-[#b9c2d2]">
                <Check size={11} className="mt-0.5 shrink-0 text-[#b3a8ff]" /> {f}
              </li>
            ))}
          </ul>
          <a
            href={institutionEmail("/pricing")}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary mt-6 w-full"
          >
            <Mail size={14} /> Talk to us
          </a>
          <p className="mt-2 text-center text-[9px] text-muted/70">Opens a pre-filled email to {CONTACT_EMAIL}</p>
        </section>
      </div>

      {signedIn && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-white/[0.015] px-4 py-3 text-[10.5px] text-muted">
          <span className="flex items-center gap-1.5">
            <Crown size={11} className="text-[#ffd08d]" /> Current plan: <span className="font-semibold text-ink">{label}</span>
          </span>
          <span className="flex items-center gap-1.5"><ZapChip /> {credits} credits available</span>
        </div>
      )}

      {/* comparison */}
      <section className="mt-14">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="eyebrow">Compare</div>
            <h2 className="mt-2 text-[26px] font-semibold tracking-[-0.03em] sm:text-[32px]">What changes between plans</h2>
          </div>
          <span className="text-[10px] text-muted">Same simulation. More depth.</span>
        </div>

        <div className="card mt-5 overflow-x-auto">
          <div className="min-w-[680px]">
            <div className="grid grid-cols-[1.8fr_repeat(3,1fr)] border-b border-white/[0.06] bg-white/[0.02] px-4 py-3 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-muted">
              <span>Capability</span>
              <span className="text-center">Free</span>
              <span className="text-center text-[#5beeb9]">Premium</span>
              <span className="text-center text-[#b3a8ff]">Institution</span>
            </div>
            {PLAN_COMPARE.map(([label, free, premiumValue, institution], i) => (
              <div key={label} className={`grid grid-cols-[1.8fr_repeat(3,1fr)] items-center px-4 py-2.5 text-[10.5px] ${i % 2 === 1 ? "bg-white/[0.012]" : ""}`}>
                <span className="pr-3 text-[#c9d2e2]">{label}</span>
                {[free, premiumValue, institution].map((value, j) => (
                  <span key={j} className="flex justify-center text-center">
                    {value === "Included" || value === "All unlocked" || value === "Always" ? (
                      <Check size={13} className={j === 1 ? "text-[#5beeb9]" : j === 2 ? "text-[#b3a8ff]" : "text-muted/70"} />
                    ) : value === "—" ? (
                      <X size={12} className="text-muted/25" />
                    ) : value === "Shipping next" ? (
                      <span className="rounded bg-[rgba(255,192,97,.1)] px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-[#ffd08d]">Shipping next</span>
                    ) : (
                      <span className="text-[9.5px] text-muted">{value}</span>
                    )}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-14 grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
        <div>
          <div className="eyebrow">FAQ</div>
          <h2 className="mt-2 text-[26px] font-semibold tracking-[-0.03em] sm:text-[32px]">Straight answers</h2>
          <p className="mt-3 max-w-sm text-[11.5px] leading-relaxed text-muted">
            The beta is deliberately honest: what is listed works, and what is not built is labelled Shipping next.
            Read the full terms on the <Link href="/legal" className="font-semibold text-[#8df5d0] hover:underline">legal page</Link>.
          </p>
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-[rgba(47,227,160,.16)] bg-[rgba(47,227,160,.04)] p-3 text-[10px] leading-relaxed text-[#8df5d0]">
            <Info size={12} className="mt-0.5 shrink-0" />
            <span>Credits can never be converted to cash. Starting capital is simulated. No real money is at risk.</span>
          </div>
        </div>
        <div className="space-y-2">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group rounded-xl border border-white/[0.06] bg-white/[0.015] px-4 py-3">
              <summary className="cursor-pointer list-none text-[12px] font-semibold text-[#d7deea] marker:hidden">
                <span className="flex items-center justify-between gap-3">
                  {q}
                  <span className="text-muted transition group-open:rotate-45">+</span>
                </span>
              </summary>
              <p className="mt-2 text-[10.5px] leading-relaxed text-muted">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}

function ZapChip() {
  return <Sparkles size={11} className="text-[#ffd08d]" />;
}
