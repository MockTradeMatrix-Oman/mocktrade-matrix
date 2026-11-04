"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, Loader2, Mail, ShieldCheck, Trash2, Zap } from "lucide-react";
import { Badge, Card, SectionHead, cn } from "./ui";
import { useToast } from "./toast";
import { timeAgo } from "@/lib/finance";

type Granted = {
  id: number;
  name: string;
  email: string;
  institution_granted_at: number | null;
};

type SupportRequest = {
  id: number;
  subject: string;
  body: string;
  status: string;
  resolution: string | null;
  created_at: number;
  user_name: string;
  user_email: string;
};

export function InstitutionAdmin({
  granted,
  requests,
}: {
  granted: Granted[];
  requests: SupportRequest[];
}) {
  const router = useRouter();
  const { push } = useToast();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function act(action: "grant" | "revoke", targetEmail: string) {
    setBusy(`${action}:${targetEmail}`);
    setError("");
    try {
      const res = await fetch("/api/admin/institution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, email: targetEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not update access.");
      push({
        tone: "success",
        title: action === "grant" ? "Institution access granted" : "Institution access removed",
        body:
          action === "grant"
            ? `${data.name ?? targetEmail} now sees the Institution tab.`
            : `${data.name ?? targetEmail} no longer sees the Institution tab.`,
      });
      if (action === "grant") setEmail("");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  async function resolve(id: number) {
    setBusy(`resolve:${id}`);
    setError("");
    try {
      const res = await fetch("/api/admin/institution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resolve", requestId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not resolve this request.");
      push({ tone: "success", title: "Support request resolved", body: "The requester has been notified." });
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  const open = requests.filter((r) => r.status !== "resolved");

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] p-4 sm:p-5">
        <SectionHead
          title="Institution access"
          subtitle="Grant the Institution tab to one account at a time by email"
        />
        <Badge tone="violet"><Building2 size={9} /> {granted.length} granted</Badge>
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
          <button
            type="submit"
            disabled={Boolean(busy) || !email.trim()}
            className="btn btn-primary btn-sm shrink-0"
          >
            {busy === `grant:${email.trim()}` ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            Grant access
          </button>
        </form>

        <p className="text-[9.5px] leading-relaxed text-muted/70">
          The account must already exist. Granting adds the Institution tab with classrooms, educator analytics,
          team competitions and priority support. Revoking hides it immediately.
        </p>

        {error && (
          <div className="rounded-lg border border-[rgba(255,93,122,.3)] bg-[rgba(255,93,122,.08)] px-3 py-2 text-[10.5px] text-[#ff9db0]">
            {error}
          </div>
        )}

        {granted.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/[0.08] px-4 py-8 text-center text-[11px] text-muted">
            No accounts have institution access yet.
          </div>
        ) : (
          <ul className="divide-y divide-white/[0.05] overflow-hidden rounded-xl border border-white/[0.06]">
            {granted.map((g) => (
              <li key={g.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[rgba(139,123,255,.25)] bg-[rgba(139,123,255,.1)] text-[#b3a8ff]">
                  <Building2 size={14} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[11.5px] font-semibold">{g.name}</div>
                  <div className="truncate text-[9.5px] text-muted">{g.email}</div>
                </div>
                <span className="hidden shrink-0 text-[9px] text-muted/60 sm:inline">
                  {g.institution_granted_at ? `Granted ${timeAgo(g.institution_granted_at)}` : "Granted"}
                </span>
                <button
                  onClick={() => act("revoke", g.email)}
                  disabled={Boolean(busy)}
                  className={cn("btn btn-ghost btn-sm shrink-0 text-[#ff9db0]", busy === `revoke:${g.email}` && "opacity-60")}
                >
                  {busy === `revoke:${g.email}` ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-white/[0.06] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SectionHead
            title="Priority support"
            subtitle="Requests raised from the Institution tab"
          />
          <Badge tone={open.length ? "amber" : "green"}>
            <Zap size={9} /> {open.length} open
          </Badge>
        </div>

        {requests.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-white/[0.08] px-4 py-6 text-center text-[11px] text-muted">
            No support requests yet.
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {requests.map((r) => (
              <li key={r.id} className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-[11.5px] font-semibold">{r.subject}</span>
                      <Badge tone={r.status === "resolved" ? "green" : "amber"}>
                        {r.status === "resolved" ? <ShieldCheck size={9} /> : <Zap size={9} />}
                        {r.status === "resolved" ? "Resolved" : "Open"}
                      </Badge>
                    </div>
                    <div className="mt-0.5 text-[9.5px] text-muted">
                      {r.user_name} · {r.user_email} · {timeAgo(r.created_at)}
                    </div>
                  </div>
                  {r.status !== "resolved" && (
                    <button
                      onClick={() => resolve(r.id)}
                      disabled={Boolean(busy)}
                      className="btn btn-dark btn-sm shrink-0"
                    >
                      {busy === `resolve:${r.id}` ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                      Resolve
                    </button>
                  )}
                </div>
                <p className="mt-1.5 whitespace-pre-wrap text-[10.5px] leading-relaxed text-muted">{r.body}</p>
                {r.resolution && (
                  <p className="mt-1.5 rounded-lg border border-[rgba(47,227,160,.18)] bg-[rgba(47,227,160,.06)] px-2.5 py-1.5 text-[10px] text-[#8df5d0]">
                    {r.resolution}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
