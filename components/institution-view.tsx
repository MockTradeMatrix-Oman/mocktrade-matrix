"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity, ArrowRight, Building2, Check, Copy, GraduationCap, LifeBuoy, Loader2, Plus,
  ShieldCheck, Sparkles, Swords, Trash2, TrendingUp, Trophy, UserPlus, Users, Zap,
} from "lucide-react";
import { Badge, Card, EmptyState, Progress, SectionHead, Stat, cn } from "./ui";
import { useToast } from "./toast";
import { timeAgo } from "@/lib/finance";

const DAY = 86_400_000;

export type Classroom = {
  id: number;
  name: string;
  code: string;
  created_at: number;
  members: number;
};

export type Member = {
  id: number;
  name: string;
  email: string;
  avatar: string;
  xp: number;
  credits: number;
  region: string;
  id_verified: number;
  last_seen: number;
  joined_at: number;
  role: string;
};

export type Analytics = {
  memberCount: number;
  verified: number;
  verifiedPct: number;
  active7d: number;
  activePct: number;
  avgXp: number;
  quizAvg: number;
  attempts: number;
  avgReturn: number;
};

export type TeamStanding = {
  key: "A" | "B";
  members: Array<{ id: number; name: string; total: number; base: number; changePct: number }>;
  avg: number;
};

export type Competition = {
  id: number;
  name: string;
  startsAt: number;
  endsAt: number;
  status: string;
  A: TeamStanding;
  B: TeamStanding;
};

export type Support = {
  id: number;
  subject: string;
  body: string;
  status: string;
  resolution: string | null;
  created_at: number;
};

function pct(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function dayLabel(ms: number) {
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function InstitutionView({
  user,
  classrooms,
  activeId,
  analytics,
  members,
  competitions,
  support,
}: {
  user: { name: string; email: string; region: string };
  classrooms: Classroom[];
  activeId: number | null;
  analytics: Analytics | null;
  members: Member[];
  competitions: Competition[];
  support: Support[];
}) {
  const router = useRouter();
  const { push } = useToast();
  const active = classrooms.find((c) => c.id === activeId) ?? null;

  const [roomName, setRoomName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const [compName, setCompName] = useState("");
  const [days, setDays] = useState(7);
  const [teamA, setTeamA] = useState<number[]>([]);
  const [teamB, setTeamB] = useState<number[]>([]);

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  async function call(payload: Record<string, unknown>, key: string) {
    setBusy(key);
    setError("");
    try {
      const res = await fetch("/api/institution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      return data as Record<string, any>;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function createRoom() {
    const name = roomName.trim();
    if (name.length < 2) return;
    const data = await call({ action: "create-classroom", name }, "create-room");
    if (!data) return;
    setRoomName("");
    push({ tone: "success", title: "Classroom created", body: `Share code ${data.code} with your learners.` });
    router.push(`/institution?classroom=${data.id}`);
    router.refresh();
  }

  async function addMember() {
    if (!active) return;
    const email = memberEmail.trim();
    if (!email) return;
    const data = await call({ action: "add-member", classroomId: active.id, email }, "add-member");
    if (!data) return;
    setMemberEmail("");
    push({ tone: "success", title: "Learner added", body: `${data.member?.name ?? email} joined ${active.name}.` });
    router.refresh();
  }

  async function removeMember(member: Member) {
    if (!active) return;
    const data = await call(
      { action: "remove-member", classroomId: active.id, userId: member.id },
      `remove:${member.id}`
    );
    if (!data) return;
    push({ tone: "success", title: "Learner removed", body: `${member.name} is no longer in ${active.name}.` });
    router.refresh();
  }

  async function createCompetition() {
    if (!active) return;
    const name = compName.trim();
    if (name.length < 2) {
      setError("Name the competition first.");
      return;
    }
    if (teamA.length === 0 || teamB.length === 0) {
      setError("Pick at least one learner for each team.");
      return;
    }
    const data = await call(
      { action: "create-competition", classroomId: active.id, name, days, teamA, teamB },
      "create-comp"
    );
    if (!data) return;
    setCompName("");
    setTeamA([]);
    setTeamB([]);
    push({ tone: "success", title: "Competition started", body: `${name} runs for ${days} day${days === 1 ? "" : "s"}.` });
    router.refresh();
  }

  async function endCompetition(competition: Competition) {
    if (!active) return;
    const data = await call(
      { action: "end-competition", classroomId: active.id, competitionId: competition.id },
      `end-comp:${competition.id}`
    );
    if (!data) return;
    push({ tone: "success", title: "Competition closed", body: `${competition.name} is now final.` });
    router.refresh();
  }

  async function sendSupport() {
    if (subject.trim().length < 3 || body.trim().length < 10) {
      setError("Add a subject and at least a sentence describing the issue.");
      return;
    }
    const data = await call(
      { action: "create-support", subject: subject.trim(), body: body.trim(), classroomId: active?.id },
      "support"
    );
    if (!data) return;
    setSubject("");
    setBody("");
    push({ tone: "success", title: "Priority request sent", body: "The admin team has been notified." });
    router.refresh();
  }

  function toggleTeam(id: number, team: "A" | "B") {
    if (!active) return;
    if (team === "A") {
      setTeamA((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
      setTeamB((prev) => prev.filter((x) => x !== id));
    } else {
      setTeamB((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
      setTeamA((prev) => prev.filter((x) => x !== id));
    }
    setError("");
  }

  async function copyCode() {
    if (!active) return;
    try {
      await navigator.clipboard.writeText(active.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      push({ tone: "error", title: "Copy failed", body: `The code is ${active.code}.` });
    }
  }

  const learners = members.filter((m) => m.role !== "educator");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#b3a8ff]">
            <Building2 size={11} /> Institution
          </div>
          <h1 className="mt-1 text-[24px] font-semibold tracking-tight sm:text-[28px]">Classrooms & cohorts</h1>
          <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-muted">
            Run a classroom for {user.name}. Codes, educator analytics, team competitions and priority support all
            read live from real learner activity.
          </p>
        </div>
        <Badge tone="violet"><ShieldCheck size={9} /> Access granted</Badge>
      </div>

      {error && (
        <div className="rounded-xl border border-[rgba(255,93,122,.3)] bg-[rgba(255,93,122,.08)] px-3.5 py-2.5 text-[11px] text-[#ff9db0]">
          {error}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[280px_1fr]">
        {/* classroom list */}
        <Card className="h-fit overflow-hidden">
          <div className="border-b border-white/[0.06] p-4">
            <SectionHead title="Your classrooms" subtitle={`${classrooms.length} active`} />
          </div>
          <div className="space-y-1 p-2">
            {classrooms.length === 0 && (
              <div className="px-3 py-5 text-center text-[11px] text-muted">No classrooms yet.</div>
            )}
            {classrooms.map((room) => (
              <button
                key={room.id}
                onClick={() => router.push(`/institution?classroom=${room.id}`)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition",
                  room.id === active?.id
                    ? "border-[rgba(47,227,160,.3)] bg-[rgba(47,227,160,.07)]"
                    : "border-transparent hover:bg-white/[0.03]"
                )}
              >
                <span className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                  room.id === active?.id
                    ? "border-[rgba(47,227,160,.3)] bg-[rgba(47,227,160,.1)] text-[#5beeb9]"
                    : "border-white/[0.07] bg-white/[0.03] text-muted"
                )}>
                  <GraduationCap size={14} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[11.5px] font-semibold">{room.name}</div>
                  <div className="text-[9.5px] text-muted">{room.members} member{room.members === 1 ? "" : "s"} · {room.code}</div>
                </div>
              </button>
            ))}

            <div className="border-t border-white/[0.06] p-2 pt-3">
              <label className="label">New classroom</label>
              <div className="mt-1 flex gap-1.5">
                <input
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="Class 10-B"
                  maxLength={80}
                  className="input h-9 px-2.5 text-[11px]"
                  onKeyDown={(e) => e.key === "Enter" && createRoom()}
                />
                <button
                  onClick={createRoom}
                  disabled={busy === "create-room" || roomName.trim().length < 2}
                  className="btn btn-primary btn-sm shrink-0 px-2.5"
                  aria-label="Create classroom"
                >
                  {busy === "create-room" ? <Loader2 size={12} className="animate-spin" /> : <Plus size={13} />}
                </button>
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          {!active || !analytics ? (
            <Card>
              <EmptyState
                icon={<Building2 size={18} />}
                title="Create your first classroom"
                body="Name a classroom on the left to get a shareable code. Learners can join from Settings or you can add them by email."
              />
            </Card>
          ) : (
            <>
              {/* code + learners */}
              <Card className="overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] p-4 sm:p-5">
                  <SectionHead title={active.name} subtitle={`Started ${dayLabel(active.created_at)} · ${members.length} member${members.length === 1 ? "" : "s"}`} />
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-lg border border-white/[0.1] bg-black/30 px-2.5 py-1.5 font-mono text-[12px] font-semibold tracking-[0.16em] text-[#8df5d0]">
                      {active.code}
                    </span>
                    <button onClick={copyCode} className="btn btn-dark btn-sm" title="Copy classroom code">
                      {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1fr_280px]">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">Members</div>
                      <span className="text-[9.5px] text-muted/70">Real accounts only</span>
                    </div>
                    {members.length === 0 ? (
                      <div className="mt-2 rounded-xl border border-dashed border-white/[0.08] px-4 py-6 text-center text-[11px] text-muted">
                        Nobody has joined yet. Add a learner by email or share the code.
                      </div>
                    ) : (
                      <ul className="mt-2 divide-y divide-white/[0.05] overflow-hidden rounded-xl border border-white/[0.06]">
                        {members.map((m) => (
                          <li key={m.id} className="flex flex-wrap items-center gap-2.5 px-3 py-2.5">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-[9px] font-bold text-muted">
                              {m.avatar}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="truncate text-[11.5px] font-semibold">{m.name}</span>
                                {m.role === "educator" && <Badge tone="violet">Educator</Badge>}
                                {m.id_verified ? (
                                  <Badge tone="green"><ShieldCheck size={9} /> Verified</Badge>
                                ) : (
                                  <Badge tone="amber">Unverified</Badge>
                                )}
                              </div>
                              <div className="truncate text-[9.5px] text-muted">{m.email} · active {timeAgo(m.last_seen)}</div>
                            </div>
                            <div className="hidden shrink-0 text-right sm:block">
                              <div className="num text-[10.5px] font-semibold">{m.xp} XP</div>
                              <div className="flex items-center justify-end gap-1 text-[9px] text-[#ffd08d]"><Zap size={9} /> {m.credits}</div>
                            </div>
                            {m.role !== "educator" && (
                              <button
                                onClick={() => removeMember(m)}
                                disabled={busy === `remove:${m.id}`}
                                className="rounded-lg border border-white/[0.07] p-1.5 text-muted transition hover:border-[rgba(255,93,122,.3)] hover:text-[#ff9db0]"
                                title={`Remove ${m.name}`}
                              >
                                {busy === `remove:${m.id}` ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-3.5">
                    <div className="flex items-center gap-1.5 text-[10.5px] font-semibold">
                      <UserPlus size={12} className="text-[#5beeb9]" /> Add by email
                    </div>
                    <p className="mt-1 text-[9.5px] leading-relaxed text-muted">
                      The learner must already have a MockTrade account. They are notified and the class appears in
                      their Settings.
                    </p>
                    <input
                      value={memberEmail}
                      onChange={(e) => setMemberEmail(e.target.value)}
                      type="email"
                      placeholder="learner@school.edu"
                      className="input mt-2 h-9 px-2.5 text-[11px]"
                      onKeyDown={(e) => e.key === "Enter" && addMember()}
                    />
                    <button
                      onClick={addMember}
                      disabled={busy === "add-member" || !memberEmail.trim()}
                      className="btn btn-primary btn-sm mt-2 w-full"
                    >
                      {busy === "add-member" ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                      Add learner
                    </button>
                    <div className="mt-3 border-t border-white/[0.06] pt-3 text-[9.5px] leading-relaxed text-muted">
                      Share code <span className="font-mono font-semibold text-[#8df5d0]">{active.code}</span> for
                      learners to join themselves from Settings.
                    </div>
                  </div>
                </div>
              </Card>

              {/* analytics */}
              <div>
                <SectionHead title="Educator analytics" subtitle="Live from member accounts, quizzes and portfolios" />
                <div className="mt-2.5 grid grid-cols-2 gap-3 lg:grid-cols-3">
                  <Stat
                    label="Members"
                    value={analytics.memberCount}
                    sub={`${analytics.verified} ID-verified`}
                    tone="green"
                    icon={<Users size={14} />}
                  />
                  <Stat
                    label="Verified"
                    value={`${Math.round(analytics.verifiedPct)}%`}
                    sub={`${analytics.verified} of ${analytics.memberCount} accounts`}
                    tone="violet"
                    icon={<ShieldCheck size={14} />}
                  />
                  <Stat
                    label="Active 7 days"
                    value={analytics.active7d}
                    sub={`${Math.round(analytics.activePct)}% of members`}
                    tone="amber"
                    icon={<Activity size={14} />}
                  />
                  <Stat
                    label="Average XP"
                    value={Math.round(analytics.avgXp)}
                    sub={`${analytics.attempts} quiz attempt${analytics.attempts === 1 ? "" : "s"}`}
                    icon={<Sparkles size={14} />}
                  />
                  <Stat
                    label="Quiz average"
                    value={`${Math.round(analytics.quizAvg)}%`}
                    sub={analytics.attempts ? "Across every attempt" : "No attempts yet"}
                    tone={analytics.quizAvg >= 60 ? "green" : analytics.attempts ? "red" : "neutral"}
                    icon={<GraduationCap size={14} />}
                  />
                  <Stat
                    label="Avg portfolio"
                    value={pct(analytics.avgReturn)}
                    sub="Return vs starting capital"
                    tone={analytics.avgReturn >= 0 ? "green" : "red"}
                    icon={<TrendingUp size={14} />}
                  />
                </div>
                {members.length > 0 && (
                  <Card className="mt-3 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[10.5px]">
                      <span className="text-muted">ID verification coverage</span>
                      <span className="font-semibold text-[#8df5d0]">{analytics.verifiedPct.toFixed(0)}%</span>
                    </div>
                    <Progress value={analytics.verifiedPct} className="mt-2" />
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10.5px]">
                      <span className="text-muted">Active in the last 7 days</span>
                      <span className="font-semibold text-[#ffd08d]">{analytics.activePct.toFixed(0)}%</span>
                    </div>
                    <Progress value={analytics.activePct} tone="amber" className="mt-2" />
                  </Card>
                )}
              </div>

              {/* competitions */}
              <Card className="overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] p-4 sm:p-5">
                  <SectionHead title="Team competitions" subtitle="Team A vs Team B, scored on real portfolio returns" />
                  <Badge tone="violet"><Swords size={9} /> {competitions.filter((c) => c.status === "active").length} live</Badge>
                </div>

                <div className="space-y-3 p-4 sm:p-5">
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-3.5">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        value={compName}
                        onChange={(e) => setCompName(e.target.value)}
                        placeholder="Competition name (e.g. Sector sprint)"
                        maxLength={80}
                        className="input h-9 flex-1 px-2.5 text-[11px]"
                      />
                      <div className="flex items-center gap-2">
                        {[3, 7, 14].map((d) => (
                          <button
                            key={d}
                            onClick={() => setDays(d)}
                            className={cn(
                              "rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold transition",
                              days === d
                                ? "border-[rgba(47,227,160,.35)] bg-[rgba(47,227,160,.08)] text-[#8df5d0]"
                                : "border-white/[0.07] bg-white/[0.02] text-muted hover:text-ink"
                            )}
                          >
                            {d}d
                          </button>
                        ))}
                      </div>
                    </div>

                    {learners.length === 0 ? (
                      <p className="mt-2 text-[9.5px] text-muted">Add learners to build teams.</p>
                    ) : (
                      <>
                        <div className="mt-2.5 grid gap-1 sm:grid-cols-2">
                          {learners.map((m) => {
                            const inA = teamA.includes(m.id);
                            const inB = teamB.includes(m.id);
                            return (
                              <div key={m.id} className="flex items-center gap-2 rounded-lg border border-white/[0.05] bg-black/20 px-2 py-1.5">
                                <span className="min-w-0 flex-1 truncate text-[10.5px] font-medium">{m.name}</span>
                                <button
                                  onClick={() => toggleTeam(m.id, "A")}
                                  className={cn(
                                    "rounded border px-1.5 py-0.5 text-[9px] font-bold transition",
                                    inA ? "border-[rgba(47,227,160,.4)] bg-[rgba(47,227,160,.15)] text-[#8df5d0]" : "border-white/[0.08] text-muted"
                                  )}
                                >
                                  A
                                </button>
                                <button
                                  onClick={() => toggleTeam(m.id, "B")}
                                  className={cn(
                                    "rounded border px-1.5 py-0.5 text-[9px] font-bold transition",
                                    inB ? "border-[rgba(139,123,255,.4)] bg-[rgba(139,123,255,.15)] text-[#b3a8ff]" : "border-white/[0.08] text-muted"
                                  )}
                                >
                                  B
                                </button>
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                          <div className="text-[9.5px] text-muted">
                            Team A: <span className="font-semibold text-[#8df5d0]">{teamA.length}</span> · Team B:{" "}
                            <span className="font-semibold text-[#b3a8ff]">{teamB.length}</span>
                          </div>
                          <button onClick={createCompetition} disabled={busy === "create-comp"} className="btn btn-primary btn-sm">
                            {busy === "create-comp" ? <Loader2 size={12} className="animate-spin" /> : <Swords size={12} />}
                            Start competition
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {competitions.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-white/[0.08] px-4 py-8 text-center text-[11px] text-muted">
                      No competitions yet. Assign learners to two teams above to start one.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {competitions.map((c) => {
                        const leader = c.A.avg === c.B.avg ? "tie" : c.A.avg > c.B.avg ? "A" : "B";
                        const live = c.status === "active";
                        return (
                          <div key={c.id} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex min-w-0 items-center gap-2">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[rgba(255,208,141,.25)] bg-[rgba(255,208,141,.08)] text-[#ffd08d]">
                                  <Trophy size={14} />
                                </span>
                                <div className="min-w-0">
                                  <div className="truncate text-[11.5px] font-semibold">{c.name}</div>
                                  <div className="text-[9.5px] text-muted">
                                    {dayLabel(c.startsAt)} – {dayLabel(c.endsAt)} ·{" "}
                                    {live ? `${Math.max(1, Math.ceil((c.endsAt - Date.now()) / DAY))} day(s) left` : "Final"}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Badge tone={live ? "green" : "neutral"}>{live ? "Live" : "Completed"}</Badge>
                                {live && (
                                  <button
                                    onClick={() => endCompetition(c)}
                                    disabled={busy === `end-comp:${c.id}`}
                                    className="btn btn-ghost btn-sm"
                                  >
                                    {busy === `end-comp:${c.id}` ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                                    End
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                              {[c.A, c.B].map((team) => (
                                <div
                                  key={team.key}
                                  className={cn(
                                    "rounded-lg border p-2.5",
                                    leader === team.key
                                      ? team.key === "A"
                                        ? "border-[rgba(47,227,160,.3)] bg-[rgba(47,227,160,.06)]"
                                        : "border-[rgba(139,123,255,.3)] bg-[rgba(139,123,255,.06)]"
                                      : "border-white/[0.05] bg-black/20"
                                  )}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 text-[10.5px] font-semibold">
                                      <span className={team.key === "A" ? "text-[#8df5d0]" : "text-[#b3a8ff]"}>Team {team.key}</span>
                                      {leader === team.key && <Trophy size={10} className="text-[#ffd08d]" />}
                                    </div>
                                    <span className={cn("num text-[11px] font-semibold", team.avg >= 0 ? "text-[#5beeb9]" : "text-[#ff8fa3]")}>
                                      {pct(team.avg)}
                                    </span>
                                  </div>
                                  <div className="mt-1.5 space-y-1">
                                    {team.members.length === 0 && (
                                      <div className="text-[9px] text-muted">No learners assigned.</div>
                                    )}
                                    {team.members.map((m) => (
                                      <div key={m.id} className="flex items-center justify-between gap-2 text-[9.5px]">
                                        <span className="truncate text-muted">{m.name}</span>
                                        <span className={cn("num shrink-0 font-semibold", m.changePct >= 0 ? "text-[#5beeb9]" : "text-[#ff8fa3]")}>
                                          {pct(m.changePct)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </Card>

              {/* support + links */}
              <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                <Card className="overflow-hidden">
                  <div className="border-b border-white/[0.06] p-4">
                    <SectionHead title="Priority support" subtitle="Goes straight to the admin console" />
                  </div>
                  <div className="space-y-2.5 p-4">
                    <input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Subject"
                      maxLength={120}
                      className="input h-9 px-2.5 text-[11px]"
                    />
                    <textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="Describe the issue or request…"
                      rows={3}
                      maxLength={2000}
                      className="input min-h-[74px] resize-none px-2.5 py-2 text-[11px]"
                    />
                    <button onClick={sendSupport} disabled={busy === "support"} className="btn btn-primary btn-sm w-full">
                      {busy === "support" ? <Loader2 size={12} className="animate-spin" /> : <LifeBuoy size={12} />}
                      Send priority request
                    </button>

                    {support.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        {support.slice(0, 4).map((s) => (
                          <div key={s.id} className="rounded-lg border border-white/[0.06] bg-black/20 p-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="min-w-0 truncate text-[10.5px] font-semibold">{s.subject}</span>
                              <Badge tone={s.status === "resolved" ? "green" : "amber"}>
                                {s.status === "resolved" ? "Resolved" : "Open"}
                              </Badge>
                            </div>
                            <div className="mt-0.5 text-[9px] text-muted">{timeAgo(s.created_at)}</div>
                            {s.resolution && <div className="mt-1 text-[9.5px] text-[#8df5d0]">{s.resolution}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>

                <Card className="p-4">
                  <SectionHead title="Learner features" subtitle="Everything the pricing card promises, live in the app" />
                  <ul className="mt-3 space-y-2">
                    {[
                      { href: "/learn", icon: GraduationCap, title: "Learning ladder", body: "Modules, quizzes and progress for your class." },
                      { href: "/markets", icon: TrendingUp, title: "Markets", body: "India and US instruments on one simulated tape." },
                      { href: "/portfolio", icon: Building2, title: "Portfolio & report", body: "Positions plus the behavioural report export." },
                      { href: "/settings", icon: UserPlus, title: "Join a classroom", body: "Learners enter a code from Settings." },
                    ].map((item) => (
                      <li key={item.href}>
                        <Link href={item.href} className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.015] p-2.5 transition hover:border-white/15">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.03] text-muted">
                            <item.icon size={14} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-[11px] font-semibold">{item.title}</div>
                            <div className="text-[9.5px] text-muted">{item.body}</div>
                          </div>
                          <ArrowRight size={12} className="shrink-0 text-muted" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex items-start gap-1.5 text-[9px] leading-relaxed text-muted/70">
                    <ShieldCheck size={10} className="mt-0.5 shrink-0" />
                    All analytics above are computed from real accounts. There are no demo learners.
                  </div>
                </Card>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
