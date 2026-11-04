"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  BadgeCheck, Building2, Check, Globe2, GraduationCap, Loader2, LogOut, Palette, Rocket, Save,
  ShieldCheck, Sparkles, Target, UserRound, Users, Wallet, Workflow, Zap,
} from "lucide-react";
import { Avatar, Badge, Card, Modal, Progress, SectionHead, cn } from "./ui";
import { useToast } from "./toast";
import { MODES, fmtMoney, levelFromXp, modeName } from "@/lib/finance";
import { ARENA_REGION_GROUPS } from "@/lib/regions";

const MODE_ICONS = [GraduationCap, Rocket, Target, Workflow, Sparkles, Building2];

const ACCENTS = [
  { id: "emerald", label: "Emerald", color: "#2fe3a0" },
  { id: "violet", label: "Violet", color: "#8b7bff" },
  { id: "cyan", label: "Cyan", color: "#4cc9f0" },
  { id: "amber", label: "Amber", color: "#ffc061" },
];

export function SettingsView({
  user,
  classrooms,
}: {
  classrooms: Array<{ id: number; name: string; code: string; members: number; role: string }>;
  user: {
    name: string;
    email: string;
    mode: string;
    region: string;
    arenaRegion: string;
    accent: string;
    credits: number;
    cash: number;
    cryptoCash: number;
    xp: number;
    streak: number;
    startCapital: number;
    idVerified: number;
    guardianStatus: string;
    createdAt: number;
    crashDone: number;
  };
}) {
  const router = useRouter();
  const { push } = useToast();
  const [name, setName] = useState(user.name);
  const [mode, setMode] = useState(user.mode);
  const [region, setRegion] = useState(user.region);
  const [arenaRegion, setArenaRegion] = useState(user.arenaRegion);
  const [accent, setAccent] = useState(user.accent);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);

  const dirty = name !== user.name || mode !== user.mode || region !== user.region || arenaRegion !== user.arenaRegion || accent !== user.accent;
  const level = levelFromXp(user.xp);
  const guardianLabel =
    user.guardianStatus === "approved" ? "Approved"
      : user.guardianStatus === "not_required" ? "Not required"
      : user.guardianStatus === "pending" ? "Pending"
      : user.guardianStatus === "declined" ? "Withdrawn"
      : user.guardianStatus;
  const canRevoke = user.guardianStatus === "approved" || user.guardianStatus === "pending";

  async function revokeGuardian() {
    setRevoking(true);
    try {
      const res = await fetch("/api/guardian/revoke", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not withdraw consent.");
      setConfirmRevoke(false);
      push({
        tone: "success",
        title: "Guardian consent withdrawn",
        body: "Trading is locked until a guardian approves a new consent link.",
      });
      router.refresh();
    } catch (err: any) {
      push({ tone: "error", title: "Could not withdraw consent", body: err.message });
    } finally {
      setRevoking(false);
    }
  }

  async function joinClassroom() {
    const code = joinCode.trim();
    if (!code) return;
    setJoining(true);
    try {
      const res = await fetch("/api/institution/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not join that classroom.");
      setJoinCode("");
      push({
        tone: "success",
        title: data.already ? "Already in this classroom" : "Classroom joined",
        body: `${data.classroom?.name ?? "Your classroom"} now appears here.`,
      });
      router.refresh();
    } catch (err: any) {
      push({ tone: "error", title: "Could not join classroom", body: err.message });
    } finally {
      setJoining(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), mode, region, arenaRegion, accent }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save settings.");
      push({
        tone: "success",
        title: "Settings saved",
        body: region !== user.region
          ? "Region changed — balances converted at the fixed FX rate."
          : arenaRegion !== user.arenaRegion
            ? "Arena region saved — your quiz ladder now follows it."
            : "Your workspace has been updated.",
      });
      router.refresh();
    } catch (err: any) {
      push({ tone: "error", title: "Save failed", body: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    setSigningOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight sm:text-[26px]">Settings</h1>
          <p className="mt-1 text-[12px] text-muted">Your profile, learner mode, region and workspace preferences.</p>
        </div>
        <button onClick={save} disabled={!dirty || saving || name.trim().length < 2} className="btn btn-primary btn-sm">
          {saving ? "Saving…" : <><Save size={13} /> Save changes</>}
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {/* profile */}
          <Card className="overflow-hidden">
            <div className="border-b border-white/[0.06] p-4">
              <SectionHead title="Profile" subtitle="How you appear on leaderboards" />
            </div>
            <div className="space-y-4 p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <Avatar name={name || user.name} size={52} />
                <div className="min-w-0 flex-1">
                  <label className="label">Display name</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className="input" placeholder="Your name" />
                </div>
              </div>

              <div>
                <label className="label">Email address</label>
                <input value={user.email} readOnly disabled className="input opacity-60" />
                <div className="mt-1 text-[9.5px] text-muted/70">Email is fixed in this simulation. Sign up again to use a different address.</div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-3">
                  <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.1em] text-muted"><Wallet size={10} /> Main cash</div>
                  <div className="num mt-1 text-[14px] font-semibold">{fmtMoney(user.cash, region)}</div>
                </div>
                <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-3">
                  <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.1em] text-muted"><ShieldCheck size={10} /> Crypto sandbox</div>
                  <div className="num mt-1 text-[14px] font-semibold text-[#ff8fa3]">{fmtMoney(user.cryptoCash, region)}</div>
                </div>
              </div>
            </div>
          </Card>

          {/* learner mode */}
          <Card className="overflow-hidden">
            <div className="border-b border-white/[0.06] p-4">
              <SectionHead title="Learner mode" subtitle="The workspace adapts to how you want to learn" />
            </div>
            <div className="grid gap-2 p-4 sm:grid-cols-2 sm:p-5">
              {MODES.map((m, i) => {
                const Icon = MODE_ICONS[i] ?? UserRound;
                const active = mode === m.id;
                return (
                  <button key={m.id} onClick={() => setMode(m.id)}
                    className={cn("flex items-start gap-2.5 rounded-xl border p-3 text-left transition",
                      active ? "border-[rgba(47,227,160,.35)] bg-[rgba(47,227,160,.06)]" : "border-white/[0.06] bg-white/[0.015] hover:border-white/15")}>
                    <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                      active ? "border-[rgba(47,227,160,.3)] bg-[rgba(47,227,160,.1)] text-[#5beeb9]" : "border-white/[0.07] bg-white/[0.03] text-muted")}>
                      <Icon size={14} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={cn("text-[11.5px] font-semibold", active && "text-[#8df5d0]")}>{m.name}</span>
                        {active && <Check size={11} className="text-[#5beeb9]" />}
                      </div>
                      <div className="mt-0.5 text-[9.5px] leading-relaxed text-muted">{m.tagline}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* classrooms */}
          <Card className="overflow-hidden">
            <div className="border-b border-white/[0.06] p-4">
              <SectionHead title="Classrooms" subtitle="Join a class with the code from your educator" />
            </div>
            <div className="space-y-3 p-4 sm:p-5">
              {classrooms.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/[0.08] px-4 py-5 text-center text-[11px] text-muted">
                  You are not in a classroom yet.
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {classrooms.map((c) => (
                    <li key={c.id} className="flex flex-wrap items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.015] px-3 py-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[rgba(139,123,255,.25)] bg-[rgba(139,123,255,.1)] text-[#b3a8ff]">
                        <Building2 size={14} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[11.5px] font-semibold">{c.name}</div>
                        <div className="text-[9.5px] text-muted">
                          {c.members} member{c.members === 1 ? "" : "s"} · code {c.code}
                        </div>
                      </div>
                      <Badge tone={c.role === "educator" ? "violet" : "green"}>
                        <Users size={9} /> {c.role === "educator" ? "Educator" : "Learner"}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}

              <div>
                <label className="label">Join another classroom</label>
                <div className="mt-1 flex gap-2">
                  <input
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="ABC123"
                    maxLength={12}
                    className="input h-9 flex-1 px-2.5 font-mono text-[11px] tracking-[0.12em]"
                    onKeyDown={(e) => e.key === "Enter" && joinClassroom()}
                  />
                  <button onClick={joinClassroom} disabled={joining || joinCode.trim().length < 4} className="btn btn-primary btn-sm shrink-0">
                    {joining ? <Loader2 size={12} className="animate-spin" /> : <GraduationCap size={12} />}
                    Join
                  </button>
                </div>
                <div className="mt-1.5 text-[9px] leading-relaxed text-muted/70">
                  Classroom membership is real: your educator sees your XP, credits and portfolio return on their
                  Institution dashboard.
                </div>
              </div>
            </div>
          </Card>

          {/* region + accent */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="p-4 sm:p-5">
              <SectionHead title="Region & currency" subtitle="Balances convert at the fixed FX rate" />
              <div className="mt-3 space-y-2">
                {[
                  { id: "IN", title: "India", note: "₹ INR · 1 USD = ₹83.20", flag: "IN" },
                  { id: "US", title: "United States", note: "$ USD · base currency", flag: "US" },
                ].map((r) => {
                  const active = region === r.id;
                  return (
                    <button key={r.id} onClick={() => setRegion(r.id)}
                      className={cn("flex w-full items-center gap-2.5 rounded-xl border p-3 text-left transition",
                        active ? "border-[rgba(47,227,160,.35)] bg-[rgba(47,227,160,.06)]" : "border-white/[0.06] bg-white/[0.015] hover:border-white/15")}>
                      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-[9px] font-bold",
                        active ? "border-[rgba(47,227,160,.3)] bg-[rgba(47,227,160,.1)] text-[#5beeb9]" : "border-white/[0.07] bg-white/[0.03] text-muted")}>
                        {r.flag}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[11.5px] font-semibold">{r.title}</div>
                        <div className="text-[9px] text-muted">{r.note}</div>
                      </div>
                      {active && <Check size={13} className="text-[#5beeb9]" />}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex items-start gap-1.5 text-[9px] leading-relaxed text-muted/70">
                <Globe2 size={10} className="mt-0.5 shrink-0" />
                Changing region converts cash, crypto cash and starting capital. Holdings stay in USD-quoted assets.
              </div>
            </Card>

            <Card className="p-4 sm:p-5">
              <SectionHead title="Workspace accent" subtitle="Saved to your profile" />
              <div className="mt-3 grid grid-cols-2 gap-2">
                {ACCENTS.map((a) => {
                  const active = accent === a.id;
                  return (
                    <button key={a.id} onClick={() => setAccent(a.id)}
                      className={cn("flex items-center gap-2 rounded-xl border p-2.5 text-left transition",
                        active ? "border-white/25 bg-white/[0.05]" : "border-white/[0.06] bg-white/[0.015] hover:border-white/15")}>
                      <span className="h-5 w-5 shrink-0 rounded-md" style={{ background: a.color, boxShadow: `0 0 12px ${a.color}55` }} />
                      <span className="text-[10.5px] font-semibold">{a.label}</span>
                      {active && <Check size={11} className="ml-auto text-[#5beeb9]" />}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-white/[0.05] bg-black/20 p-2.5">
                <Palette size={13} className="text-muted" />
                <span className="text-[9.5px] text-muted">Accent is a saved preference; the base tape stays legible.</span>
              </div>
            </Card>
          </div>

          {/* arena region */}
          <Card className="p-4 sm:p-5">
            <SectionHead
              title="Quiz arena region"
              subtitle="Sets which regional ladder you appear on"
            />
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1.1fr] sm:items-center">
              <label className="block">
                <span className="mb-1.5 block text-[9.5px] font-semibold uppercase tracking-[0.12em] text-muted">
                  Your region
                </span>
                <select
                  value={arenaRegion}
                  onChange={(e) => setArenaRegion(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#0b0f16] px-3 py-2.5 text-[12px] text-ink outline-none transition focus:border-[rgba(47,227,160,.4)]"
                >
                  {ARENA_REGION_GROUPS.map((group) => (
                    <optgroup key={group.group} label={group.group}>
                      {group.regions.map((r) => (
                        <option key={r.id} value={r.id}>{r.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
              <div className="flex items-start gap-1.5 text-[9.5px] leading-relaxed text-muted/80">
                <Globe2 size={11} className="mt-0.5 shrink-0 text-[#5beeb9]" />
                <span>
                  Live matchmaking is global and skill-based, so you can meet anyone. This choice only sets the
                  regional leaderboard your rating appears on. It never converts cash or changes what you can trade.
                </span>
              </div>
            </div>
          </Card>

          {/* session */}
          <Card className="p-4 sm:p-5">
            <SectionHead title="Session" subtitle="You are signed in on this device" />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="text-[10.5px] text-muted">
                Signed in as <span className="font-semibold text-ink">{user.email}</span>
              </div>
              <button onClick={signOut} disabled={signingOut} className="btn btn-dark btn-sm">
                <LogOut size={12} /> {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          </Card>
        </div>

        {/* rail */}
        <aside className="space-y-4 xl:sticky xl:top-[112px] xl:self-start">
          <Card className="overflow-hidden">
            <div className="relative p-5 text-center">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-24" style={{ background: "radial-gradient(60% 100% at 50% 0%, rgba(47,227,160,.14), transparent 70%)" }} />
              <div className="relative">
                <Avatar name={name || user.name} size={58} className="mx-auto" />
                <div className="mt-2.5 text-[13.5px] font-semibold">{name || user.name}</div>
                <div className="text-[10px] text-muted">{modeName(mode)} · {region === "IN" ? "India" : "United States"}</div>
                <div className="mt-2 flex items-center justify-center gap-1.5">
                  <Badge tone="green"><BadgeCheck size={9} /> Verified</Badge>
                  <Badge tone="amber"><Zap size={9} /> {user.credits}</Badge>
                </div>
                <div className="mt-4 text-left">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-muted">Level {level.level}</span>
                    <span className="num text-muted">{user.xp} XP</span>
                  </div>
                  <Progress value={level.progress * 100} className="mt-1.5" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-px border-t border-white/[0.06] bg-white/[0.04]">
              {[
                ["Streak", `${user.streak}d`],
                ["Start capital", fmtMoney(user.startCapital, region)],
                ["Guardian", guardianLabel],
                ["Member since", new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })],
              ].map(([l, v]) => (
                <div key={l} className="bg-[#0a0e16] px-3 py-2.5">
                  <div className="text-[8.5px] uppercase tracking-[0.1em] text-muted">{l}</div>
                  <div className="num mt-0.5 truncate text-[10.5px] font-semibold">{v}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <SectionHead title="Verification" subtitle="Guardian-verified account" />
            <div className="mt-3 space-y-2">
              {[
                ["Identity", user.idVerified ? "Verified" : "Incomplete", Boolean(user.idVerified)],
                ["Guardian consent", guardianLabel, user.guardianStatus === "approved" || user.guardianStatus === "not_required"],
                ["Simulation terms", "Accepted", true],
                ["Crash drill", user.crashDone ? "Completed" : "Scheduled", Boolean(user.crashDone)],
              ].map(([label, value, ok]) => (
                <div key={label as string} className="flex items-center justify-between text-[10.5px]">
                  <span className="text-muted">{label as string}</span>
                  <span className={cn("flex items-center gap-1 font-semibold", ok ? "text-[#5beeb9]" : "text-[#ffd08d]")}>
                    {ok ? <Check size={10} /> : <ShieldCheck size={10} />} {value as string}
                  </span>
                </div>
              ))}
            </div>
            <Link href="/verify" className="btn btn-dark btn-sm mt-3 w-full">Review verification</Link>
            {canRevoke && (
              <button onClick={() => setConfirmRevoke(true)} className="btn btn-ghost btn-sm mt-2 w-full text-[#ff9db0]">
                Withdraw guardian consent
              </button>
            )}
            <p className="mt-2 text-[9px] leading-relaxed text-muted/70">
              Guardian consent is revocable at any time. Withdrawing locks simulated trading until a guardian approves again.
            </p>
          </Card>

          <div className="rounded-xl border border-white/[0.055] bg-white/[0.015] p-3.5">
            <div className="flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-muted">
              <ShieldCheck size={11} className="text-[#5beeb9]" /> Simulation disclosure
            </div>
            <p className="mt-1.5 text-[9.5px] leading-relaxed text-muted">
              MockTrade Matrix is an educational simulation. No real money, securities or crypto are bought or sold. Nothing here is investment advice.
            </p>
          </div>
        </aside>
      </div>

      <Modal
        open={confirmRevoke}
        onClose={() => setConfirmRevoke(false)}
        title="Withdraw guardian consent?"
        subtitle="Your guardian's approval will be cancelled and simulated trading will be locked immediately."
        width={440}
      >
        <div className="p-5">
          <ul className="space-y-1.5 text-[11px] leading-relaxed text-muted">
            <li>· Open positions stay visible but no new orders can be placed.</li>
            <li>· Lessons and quizzes remain available.</li>
            <li>· Send a fresh consent link from the verification page to restore access.</li>
          </ul>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button onClick={() => setConfirmRevoke(false)} className="btn btn-ghost btn-sm" disabled={revoking}>Keep consent</button>
            <button onClick={revokeGuardian} disabled={revoking} className="btn btn-primary btn-sm">
              {revoking ? "Withdrawing…" : "Yes, withdraw"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
