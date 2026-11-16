import Link from "next/link";
import { ArrowRight, Check, Crown, Lock, ShieldCheck } from "lucide-react";
import { Badge, Card } from "./ui";

export function PremiumGate({
  eyebrow,
  title,
  body,
  features,
  icon,
}: {
  eyebrow: string;
  title: string;
  body: string;
  features: string[];
  icon?: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-[900px] px-1 pb-8 pt-2">
      <div className="eyebrow flex items-center gap-1.5">{icon} {eyebrow}</div>
      <h1 className="mt-2 text-[28px] font-semibold leading-tight tracking-[-0.03em] sm:text-[34px]">
        {title}
      </h1>
      <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-muted">{body}</p>

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
                  Premium play
                </span>
              </div>
              <p className="mt-2 max-w-xl text-[11.5px] leading-relaxed text-muted">
                Daily quests, streak freezes, badges and celebrations stay free. Premium adds the
                timed modes and weekly competition.
              </p>
            </div>
            <Badge tone="amber"><Lock size={9} /> Locked</Badge>
          </div>

          <div className="relative mt-5 grid gap-2 sm:grid-cols-2">
            {features.map((line) => (
              <div key={line} className="flex items-start gap-2 text-[11px] leading-relaxed text-[#c9d2e2]">
                <Check size={11} className="mt-0.5 shrink-0 text-[#5beeb9]" /> {line}
              </div>
            ))}
          </div>

          <div className="relative mt-6 flex flex-wrap gap-2">
            <Link href="/pricing" className="btn btn-primary">
              <Crown size={14} /> See Premium <ArrowRight size={13} />
            </Link>
            <Link href="/quests" className="btn btn-dark">
              Open free daily quests
            </Link>
          </div>
          <div className="relative mt-3 flex items-center gap-1.5 text-[9.5px] text-muted">
            <ShieldCheck size={10} className="text-[#5beeb9]" /> No card is charged. Premium is
            activated with earned credits.
          </div>
        </div>
      </Card>
    </div>
  );
}
