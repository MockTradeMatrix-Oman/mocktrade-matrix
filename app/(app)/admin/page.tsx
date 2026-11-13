import Link from "next/link";
import {
  ArrowRight, BookOpen, CheckCircle2, EyeOff, GraduationCap, Pencil, Plus, ScanFace, ShieldCheck,
  Sparkles, Users, Video, XCircle, Zap,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { all, one } from "@/lib/db";
import { getSupportRequests } from "@/lib/institution";
import { timeAgo } from "@/lib/finance";
import { Badge, Card, SectionHead, Stat } from "@/components/ui";
import { InstitutionAdmin } from "@/components/institution-admin";
import { PlansAdmin } from "@/components/plans-admin";
import { SessionsAdmin } from "@/components/sessions-admin";
import { listAllSessions, sessionDateLabel } from "@/lib/sessions";

export const dynamic = "force-dynamic";

function firstReason(raw: string) {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? String(parsed[0]) : null;
  } catch {
    return null;
  }
}

type AdminModule = {
  id: number;
  slug: string;
  title: string;
  subtitle: string;
  level: string;
  order_index: number;
  minutes: number;
  reward_credits: number;
  is_published: number;
  video_url: string | null;
  questions: number;
};

export default async function AdminPage() {
  const admin = await requireAdmin();

  const students = one<{ n: number }>("SELECT COUNT(*) AS n FROM users WHERE role <> 'admin'")?.n ?? 0;
  const verifiedUsers = one<{ n: number }>(
    "SELECT COUNT(*) AS n FROM users WHERE role <> 'admin' AND id_verified = 1"
  )?.n ?? 0;
  const attempts = one<{ n: number; avg: number }>(
    "SELECT COUNT(*) AS n, COALESCE(AVG(score),0) AS avg FROM quiz_attempts"
  );
  const guardians = one<{ n: number }>(
    "SELECT COUNT(*) AS n FROM guardian_requests WHERE status = 'pending'"
  )?.n ?? 0;

  const institutionUsers = all<{ id: number; name: string; email: string; institution_granted_at: number | null }>(
    "SELECT id, name, email, institution_granted_at FROM users WHERE institution_access = 1 ORDER BY institution_granted_at DESC"
  );
  const supportRequests = getSupportRequests();
  const planHolders = all<{
    id: number; name: string; email: string; plan: string;
    premium_until: number | null; premium_source: string | null;
  }>(
    `SELECT id, name, email, plan, premium_until, premium_source
       FROM users
      WHERE plan = 'premium'
      ORDER BY premium_until DESC`
  );
  const expertSessions = listAllSessions().map((session) => ({
    id: session.id,
    title: session.title,
    speaker: session.speaker,
    starts_at: session.starts_at,
    duration_mins: session.duration_mins,
    status: session.status,
    attendees: session.attendees,
    dateLabel: sessionDateLabel(session.starts_at, session.duration_mins),
  }));

  const modules = all<AdminModule>(
    `SELECT m.id, m.slug, m.title, m.subtitle, m.level, m.order_index, m.minutes,
            m.reward_credits, m.is_published, m.video_url,
            (SELECT COUNT(*) FROM quiz_questions q WHERE q.module_id = m.id) AS questions
     FROM modules m
     ORDER BY m.order_index, m.id`
  );
  const published = modules.filter((m) => m.is_published).length;
  const withVideo = modules.filter((m) => m.video_url).length;

  const recent = all<{
    id: number; name: string; avatar: string; module: string; score: number; total: number; created_at: number;
  }>(
    `SELECT a.id, u.name, u.avatar, m.title AS module, a.score, a.total, a.created_at
     FROM quiz_attempts a
     JOIN users u ON u.id = a.user_id
     JOIN modules m ON m.id = a.module_id
     ORDER BY a.created_at DESC
     LIMIT 6`
  );

  const idChecks = all<{
    id: number; doc_type: string; status: string; name: string | null; confidence: number;
    reasons: string; created_at: number; user_name: string; email: string;
  }>(
    `SELECT d.id, d.doc_type, d.status, d.name, d.confidence, d.reasons, d.created_at,
            u.name AS user_name, u.email
     FROM id_documents d
     JOIN users u ON u.id = d.user_id
     ORDER BY d.created_at DESC
     LIMIT 6`
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#b3a8ff]">
            <ShieldCheck size={11} /> Studio · admin only
          </div>
          <h1 className="mt-1 text-[24px] font-semibold tracking-tight sm:text-[28px]">Curriculum studio</h1>
          <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-muted">
            Publish video lessons and quizzes for students. Drafts stay hidden from the learning ladder until you
            publish them. Signed in as {admin.name}.
          </p>
        </div>
        <Link href="/admin/modules/new" className="btn btn-primary">
          <Plus size={15} /> New module
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Students" value={students} sub={`${verifiedUsers} ID-verified`} tone="violet" icon={<Users size={14} />} />
        <Stat
          label="Modules live"
          value={published}
          sub={`${modules.length - published} draft${modules.length - published === 1 ? "" : "s"} hidden`}
          tone="green"
          icon={<BookOpen size={14} />}
        />
        <Stat
          label="Quiz attempts"
          value={attempts?.n ?? 0}
          sub={`${Math.round(attempts?.avg ?? 0)}% average score`}
          tone="amber"
          icon={<GraduationCap size={14} />}
        />
        <Stat
          label="Guardian pending"
          value={guardians}
          sub={guardians ? "Awaiting a decision" : "Nothing waiting"}
          tone={guardians ? "red" : "neutral"}
          icon={<ShieldCheck size={14} />}
        />
      </div>

      <PlansAdmin holders={planHolders} />

      <SessionsAdmin sessions={expertSessions} />

      <InstitutionAdmin granted={institutionUsers} requests={supportRequests} />

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] p-4 sm:p-5">
          <SectionHead title="Recent identity checks" subtitle="Real OCR results · document images are never stored" />
          <Badge tone="green"><ScanFace size={9} /> {verifiedUsers} verified</Badge>
        </div>
        {idChecks.length === 0 ? (
          <div className="px-5 py-8 text-center text-[12px] text-muted">
            No document checks yet. Students must pass a name + address match before they can enter the app.
          </div>
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {idChecks.map((r) => {
              const reason = r.status === "rejected" ? firstReason(r.reasons) : null;
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-muted">
                    <ScanFace size={14} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-[11.5px] font-semibold">{r.user_name}</span>
                      <Badge tone={r.status === "approved" ? "green" : "red"}>
                        {r.status === "approved" ? <CheckCircle2 size={9} /> : <XCircle size={9} />}
                        {r.status === "approved" ? "Approved" : "Rejected"}
                      </Badge>
                      <span className="text-[9px] uppercase tracking-wide text-muted/60">{r.doc_type}</span>
                    </div>
                    <div className="mt-0.5 truncate text-[9.5px] text-muted">
                      {r.name ? `Read as ${r.name}` : "No name extracted"} · {r.confidence}% OCR
                      {reason ? ` · ${reason}` : ""}
                    </div>
                  </div>
                  <span className="shrink-0 text-[9.5px] text-muted/60">{timeAgo(r.created_at)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] p-4 sm:p-5">
          <SectionHead title="Learning ladder" subtitle={`${modules.length} modules · ${withVideo} with video`} />
          <Link href="/learn" className="btn btn-ghost btn-sm">
            Student view <ArrowRight size={12} />
          </Link>
        </div>

        {modules.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03] text-muted">
              <BookOpen size={18} />
            </div>
            <div className="mt-3 text-[14px] font-semibold">No modules yet</div>
            <p className="mx-auto mt-1.5 max-w-sm text-[12px] leading-relaxed text-muted">
              Create the first lesson and quiz. Students see it immediately once it is published.
            </p>
            <Link href="/admin/modules/new" className="btn btn-primary btn-sm mt-4">
              <Plus size={13} /> Create module
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {modules.map((m) => (
              <li key={m.id} className="flex flex-col gap-3 px-4 py-3.5 transition hover:bg-white/[0.015] sm:flex-row sm:items-center sm:px-5">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-[11px] font-bold text-muted">
                    {String(m.order_index).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-[12.5px] font-semibold">{m.title}</span>
                      <Badge tone={m.level === "Advanced" ? "amber" : m.level === "Intermediate" ? "violet" : "green"}>
                        {m.level}
                      </Badge>
                      {m.is_published ? (
                        <Badge tone="green"><CheckCircle2 size={9} /> Live</Badge>
                      ) : (
                        <Badge tone="amber"><EyeOff size={9} /> Draft</Badge>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-muted">
                      <span className="truncate">/{m.slug}</span>
                      <span className="text-muted/40">·</span>
                      <span>{m.questions} question{m.questions === 1 ? "" : "s"}</span>
                      <span className="text-muted/40">·</span>
                      <span>{m.minutes} min</span>
                      <span className="text-muted/40">·</span>
                      <span className={`flex items-center gap-1 ${m.video_url ? "text-[#b3a8ff]" : "text-muted/50"}`}>
                        <Video size={9} /> {m.video_url ? "Video" : "No video"}
                      </span>
                      <span className="text-muted/40">·</span>
                      <span className="flex items-center gap-1 text-[#ffd08d]"><Zap size={9} /> {m.reward_credits}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 pl-12 sm:pl-0">
                  <Link href={`/admin/modules/${m.id}`} className="btn btn-dark btn-sm">
                    <Pencil size={11} /> Edit
                  </Link>
                  <Link href={`/learn/${m.slug}`} className="btn btn-ghost btn-sm">
                    <ArrowRight size={11} /> View
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden">
          <div className="border-b border-white/[0.06] p-4 sm:p-5">
            <SectionHead title="Recent quiz attempts" subtitle="Live from the learning ladder" />
          </div>
          {recent.length === 0 ? (
            <div className="px-5 py-10 text-center text-[12px] text-muted">No quiz attempts yet.</div>
          ) : (
            <ul className="divide-y divide-white/[0.05]">
              {recent.map((r) => {
                const pct = Math.round((r.score / Math.max(1, r.total)) * 100);
                return (
                  <li key={r.id} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-[9px] font-bold text-muted">
                      {r.avatar}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[11.5px] font-medium">{r.name}</div>
                      <div className="truncate text-[9.5px] text-muted">{r.module}</div>
                    </div>
                    <span className={`num shrink-0 text-[11px] font-semibold ${pct >= 66 ? "text-[#5beeb9]" : "text-[#ff8fa3]"}`}>
                      {r.score}/{r.total} · {pct}%
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="p-4 sm:p-5">
          <SectionHead title="Publishing rules" subtitle="What students can see" />
          <ul className="mt-3 space-y-2.5 text-[10.5px] leading-relaxed text-muted">
            {[
              ["Drafts are invisible", "Unpublished modules never appear in the ladder, search or direct links."],
              ["Video is optional", "YouTube, Vimeo and direct MP4 links all play inline in the lesson."],
              ["Quizzes are scored", "Correct answers stay server-side. Students never receive the key before submitting."],
              ["Progress is preserved", "Editing a module keeps existing student progress and scores."],
            ].map(([t, b]) => (
              <li key={t} className="flex items-start gap-2">
                <Sparkles size={11} className="mt-0.5 shrink-0 text-[#ffd08d]" />
                <span><span className="font-semibold text-ink/90">{t}.</span> {b}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
