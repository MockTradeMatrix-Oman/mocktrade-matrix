"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Crown, Loader2, Mail, Trash2 } from "lucide-react";
import { Badge, Card, SectionHead, cn } from "./ui";
import { useToast } from "./toast";

type Holder = {
  id: number;
  name: string;
  email: string;
  plan: string;
  premium_until: number | null;
  premium_source: string | null;
};

const DAY = 86_400_000;

function daysLeft(until: number | null) {
  if (!until) return 0;
  return Math.max(0, Math.ceil((until - Date.now()) / DAY));
}

export function PlansAdmin({ holders }: { holders: Holder[] }) {
  const router = useRouter();
  const { push } = useToast();
  const [email, setEmail] = useState("");
  const [days, setDays] = useState<30 | 90 | 365>(30);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function act(action: "grant" | "revoke", targetEmail: string) {
    setBusy(`${action}:${targetEmail}`);
    setError("");
    try {
      const res = await fetch("/api/admin/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "grant"
            ? { action, email: targetEmail, days }
            : { action, email: targetEmail }
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not update the plan.");
      push({
        tone: "success",
        title: action === "grant" ? "Premium granted" : "Premium removed",
        body:
          action === "grant"
            ? `${data.name ?? targetEmail} has ${data.days ?? days} days of Premium.`
            : `${data.name ?? targetEmail} is back on the Free plan. Progress is untouched.`,
      });
      if (action === "grant") setEmail("");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] p-4 sm:p-5">
        <SectionHead
          title="Plans"
          subtitle="Grant Premium by email. Admins and Institution accounts already include it."
        />
        <Badge tone="amber"><Crown size={9} /> {holders.length} premium</Badge>
      </div>

      <div className="space-y-3 p-4 sm:p-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const target = email.trim();
            if (target) act("grant", target);
          }}
          className="flex flex-col gap-2 sm:flex-row"
        >
          <div className="relative flex-1">
            <Mail size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              placeholder="learner@school.edu"
              className="input pl-9"
              autoComplete="off"
            />
          </div>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value) as 30 | 90 | 365)}
            className="input w-full sm:w-[120px]"
            aria-label="Premium length"
          >
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
            <option value={365}>365 days</option>
          </select>
          <button
            type="submit"
            disabled={Boolean(busy) || !email.trim()}
            className="btn btn-primary btn-sm shrink-0"
          >
            {busy === `grant:${email.trim()}` ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            Grant Premium
          </button>
        </form>

        <p className="text-[9.5px] leading-relaxed text-muted/70">
          Beta plan: 500 earned credits buys 30 days in the app. An admin grant does not touch credits or cash.
          Revoking Premium keeps every completed module and score.
        </p>

        {error && (
          <div className="rounded-lg border border-[rgba(255,93,122,.3)] bg-[rgba(255,93,122,.08)] px-3 py-2 text-[10.5px] text-[#ff9db0]">
            {error}
          </div>
        )}

        {holders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/[0.08] px-4 py-8 text-center text-[11px] text-muted">
            No credit subscriptions yet. Grant one above to demo Premium.
          </div>
        ) : (
          <ul className="divide-y divide-white/[0.05] overflow-hidden rounded-xl border border-white/[0.06]">
            {holders.map((h) => {
              const left = daysLeft(h.premium_until);
              return (
                <li key={h.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[rgba(255,192,97,.25)] bg-[rgba(255,192,97,.1)] text-[#ffd08d]">
                    <Crown size={14} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[11.5px] font-semibold">{h.name}</div>
                    <div className="truncate text-[9.5px] text-muted">{h.email}</div>
                  </div>
                  <Badge tone={left > 0 ? "green" : "red"}>
                    {left > 0 ? `${left}d left` : "Expired"}
                  </Badge>
                  <span className="hidden shrink-0 text-[9px] uppercase tracking-wide text-muted/60 sm:inline">
                    {h.premium_source === "admin" ? "Admin grant" : "Credits"}
                  </span>
                  <button
                    onClick={() => act("revoke", h.email)}
                    disabled={Boolean(busy)}
                    className={cn("btn btn-ghost btn-sm shrink-0 text-[#ff9db0]", busy === `revoke:${h.email}` && "opacity-60")}
                  >
                    {busy === `revoke:${h.email}` ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                    Revoke
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}
