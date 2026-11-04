"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle, ArrowRight, BadgeCheck, Check, CheckCircle2, GraduationCap, Lock,
  ShieldCheck, Sparkles, TrendingUp, Users, X,
} from "lucide-react";
import { Badge, Card, cn } from "./ui";
import { useToast } from "./toast";

type Decision = "approved" | "declined";

export function GuardianConsent({
  token,
  student,
  guardianEmail,
  initialStatus,
}: {
  token: string;
  student: { name: string; email: string; region: string; age: number | null; mode: string; createdAt: number };
  guardianEmail: string;
  initialStatus: string;
}) {
  const { push } = useToast();
  const [status, setStatus] = useState(initialStatus);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<Decision | null>(null);
  const [confirmDecline, setConfirmDecline] = useState(false);

  async function decide(decision: Decision) {
    setBusy(decision);
    try {
      const res = await fetch("/api/guardian/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, decision, note: note.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save your decision.");
      setStatus(decision);
      push({
        tone: decision === "approved" ? "success" : "error",
        title: decision === "approved" ? "Consent approved" : "Consent declined",
        body: decision === "approved"
          ? `${student.name} can now finish onboarding.`
          : `${student.name} will not be able to place simulated trades.`,
      });
    } catch (err: any) {
      push({ tone: "error", title: "Decision failed", body: err.message });
    } finally {
      setBusy(null);
    }
  }

  if (status !== "pending") {
    const approved = status === "approved";
    return (
      <Card className="overflow-hidden">
        <div className={cn("relative px-5 py-10 text-center sm:px-8", approved ? "bg-[rgba(47,227,160,.04)]" : "bg-[rgba(255,93,122,.04)]")}>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40" style={{ background: approved
            ? "radial-gradient(55% 100% at 50% 0%, rgba(47,227,160,.16), transparent 70%)"
            : "radial-gradient(55% 100% at 50% 0%, rgba(255,93,122,.14), transparent 70%)" }} />
          <div className="relative">
            <div className={cn("mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border",
              approved ? "border-[rgba(47,227,160,.35)] bg-[rgba(47,227,160,.12)]" : "border-[rgba(255,93,122,.3)] bg-[rgba(255,93,122,.1)]")}>
              {approved ? <CheckCircle2 size={28} className="text-[#5beeb9]" /> : <X size={28} className="text-[#ff8fa3]" />}
            </div>
            <h1 className="mt-4 text-[22px] font-semibold tracking-tight">
              {approved ? "Consent approved" : "Consent declined"}
            </h1>
            <p className="mx-auto mt-2 max-w-md text-[12px] leading-relaxed text-muted">
              {approved
                ? `You have authorised ${student.name} to use the MockTrade Matrix simulation. No real money is involved, and consent can be revoked at any time from their account settings.`
                : `You have declined simulated trading access for ${student.name}. They will not be able to place orders.`}
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <Link href="/" className="btn btn-ghost btn-sm">Back to MockTrade Matrix</Link>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-1.5 border-t border-white/[0.06] px-5 py-3 text-[9.5px] text-muted/70">
          <Lock size={10} /> Consent decision recorded for {guardianEmail}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="border-b border-white/[0.06] p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="green"><Users size={10} /> Guardian consent</Badge>
            <Badge tone="amber"><span className="h-1.5 w-1.5 rounded-full bg-[#ffc061]" /> Action needed</Badge>
          </div>
          <h1 className="mt-3 text-[24px] font-semibold tracking-tight sm:text-[28px]">
            Approve {student.name}&apos;s simulation access
          </h1>
          <p className="mt-2 max-w-xl text-[12px] leading-relaxed text-muted">
            {student.name} is learning about markets on MockTrade Matrix. Because they are under 18, we need your
            consent before they can place simulated trades. No real money is ever deposited, invested or withdrawn.
          </p>
        </div>

        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_300px]">
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                { icon: GraduationCap, title: "Education first", body: "Lessons and quizzes teach risk, fees and market mechanics before trading." },
                { icon: ShieldCheck, title: "Guardian-gated", body: "Trading is locked until you approve. You can revoke consent at any time." },
                { icon: TrendingUp, title: "100% simulated", body: "Virtual cash, virtual assets. Zero real capital at risk." },
                { icon: Lock, title: "Minimal data", body: "No document images are stored. Only the account details shown here." },
              ].map((f) => (
                <div key={f.title} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[rgba(47,227,160,.2)] bg-[rgba(47,227,160,.07)] text-[#5beeb9]">
                    <f.icon size={14} />
                  </span>
                  <div className="mt-2 text-[11.5px] font-semibold">{f.title}</div>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-muted">{f.body}</p>
                </div>
              ))}
            </div>

            <div>
              <label className="label">Note to the student <span className="font-normal text-muted/60">(optional)</span></label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={400}
                rows={3}
                placeholder="e.g. Only use the simulator, never real money."
                className="input resize-none"
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button onClick={() => decide("approved")} disabled={busy !== null} className="btn btn-primary flex-1">
                {busy === "approved" ? "Recording…" : <><Check size={15} /> Approve simulated access</>}
              </button>
              {confirmDecline ? (
                <button onClick={() => decide("declined")} disabled={busy !== null} className="btn flex-1 border border-[rgba(255,93,122,.3)] bg-[rgba(255,93,122,.1)] text-[#ffb3c0] hover:bg-[rgba(255,93,122,.16)]">
                  {busy === "declined" ? "Recording…" : <><AlertTriangle size={15} /> Confirm decline</>}
                </button>
              ) : (
                <button onClick={() => setConfirmDecline(true)} disabled={busy !== null} className="btn btn-ghost flex-1">
                  <X size={15} /> Decline
                </button>
              )}
            </div>
            <p className="text-[9.5px] leading-relaxed text-muted/70">
              By approving, you confirm you are the parent or legal guardian of {student.name} and consent to their use
              of this educational simulation. This is not a brokerage account.
            </p>
          </div>

          <aside className="space-y-3">
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
              <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">Student</div>
              <div className="mt-2 flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(47,227,160,.25)] bg-[rgba(47,227,160,.08)] text-[12px] font-bold text-[#8df5d0]">
                  {student.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-[12px] font-semibold">{student.name}</div>
                  <div className="truncate text-[9.5px] text-muted">{student.email}</div>
                </div>
              </div>
              <div className="mt-3 space-y-1.5 border-t border-white/[0.06] pt-3 text-[10px]">
                {[
                  ["Age", student.age ? `${student.age} years` : "Under 18"],
                  ["Region", student.region === "IN" ? "India · ₹ INR" : "United States · $ USD"],
                  ["Learner mode", student.mode],
                  ["Guardian email", guardianEmail],
                  ["Requested", new Date(student.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })],
                ].map(([l, v]) => (
                  <div key={l} className="flex items-start justify-between gap-2">
                    <span className="text-muted">{l}</span>
                    <span className="text-right font-medium text-ink/90">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-[rgba(255,192,97,.18)] bg-[rgba(255,192,97,.04)] p-3.5">
              <div className="flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-[#ffd08d]">
                <Sparkles size={11} /> What they unlock
              </div>
              <ul className="mt-2 space-y-1.5 text-[10px] leading-relaxed text-[#c9bda6]">
                {["Five simulated asset classes", "AI forecasts and market drills", "Quiz-gated learning ladder", "Virtual ₹1,00,000 starting capital"].map((x) => (
                  <li key={x} className="flex items-start gap-1.5">
                    <Check size={10} className="mt-0.5 shrink-0 text-[#5beeb9]" /> {x}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center gap-1.5 text-[9px] text-muted/60">
              <BadgeCheck size={11} className="text-[#5beeb9]" /> Secure, one-time consent link
            </div>
          </aside>
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[9.5px] text-muted/60">
        <span className="flex items-center gap-1.5"><ShieldCheck size={11} /> MockTrade Matrix · educational simulation only</span>
        <Link href="/" className="inline-flex items-center gap-1 hover:text-ink">mocktrade.app <ArrowRight size={10} /></Link>
      </div>
    </div>
  );
}
