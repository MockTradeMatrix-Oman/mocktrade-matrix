import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight, CalendarClock, Check, Crown, Lock, ShieldCheck, Users, Video,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { isPremium } from "@/lib/plans";
import { listOpenSessions, sessionDateLabel } from "@/lib/sessions";
import { Badge, Card } from "@/components/ui";
import { SessionsView } from "@/components/sessions-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Expert sessions — MockTrade Matrix",
  robots: { index: false, follow: false },
};

export default async function SessionsPage() {
  const user = await requireUser();
  const premium = isPremium(user);

  if (!premium) {
    return (
      <div className="mx-auto max-w-[900px] px-4 pb-16 pt-6 sm:px-6">
        <div className="eyebrow flex items-center gap-1.5"><Video size={11} /> Expert sessions</div>
        <h1 className="mt-2 text-[28px] font-semibold leading-tight tracking-[-0.03em] sm:text-[34px]">
          Expert sessions are part of Premium
        </h1>
        <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-muted">
          Premium includes a monthly group session with an industry expert, alongside every learning
          module, full analytics and the final assessment.
        </p>

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
                    Premium sessions
                  </span>
                </div>
                <p className="mt-2 max-w-xl text-[11.5px] leading-relaxed text-muted">
                  One group session each month, not a guaranteed one-to-one. Sessions are scheduled by
                  the MockTradeMatrix team and appear here only once a speaker and date are confirmed.
                </p>
              </div>
              <Badge tone="amber"><Lock size={9} /> Locked</Badge>
            </div>

            <div className="relative mt-5 grid gap-2 sm:grid-cols-2">
              {[
                "Monthly live group session with an industry expert",
                "RSVP inside the app and keep the date in one place",
                "Joining details appear here after you RSVP",
                "No invented speakers, recordings or testimonials",
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
              <Link href="/learn" className="btn btn-dark">
                Open learning ladder
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

  const sessions = listOpenSessions(user.id).map((session) => ({
    id: session.id,
    title: session.title,
    speaker: session.speaker,
    speaker_bio: session.speaker_bio,
    starts_at: session.starts_at,
    duration_mins: session.duration_mins,
    join_url: session.join_url,
    attending: session.attending,
    attendees: session.attendees,
    live: session.live,
    dateLabel: sessionDateLabel(session.starts_at, session.duration_mins),
  }));

  return (
    <div className="mx-auto max-w-[980px] px-4 pb-16 pt-6 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="eyebrow flex items-center gap-1.5"><Video size={11} /> Expert sessions</div>
          <h1 className="mt-2 text-[28px] font-semibold leading-tight tracking-[-0.03em] sm:text-[34px]">
            Monthly expert sessions
          </h1>
          <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-muted">
            A live group session with an industry expert, included with Premium. Sessions are
            announced here only when the speaker and date are confirmed.
          </p>
        </div>
        <Badge tone="green"><ShieldCheck size={9} /> Premium</Badge>
      </div>

      {sessions.length === 0 ? (
        <Card className="mt-6 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.02]">
            <CalendarClock size={22} className="text-[#b3a8ff]" />
          </div>
          <h2 className="mt-4 text-[18px] font-semibold tracking-[-0.02em]">
            No session has been scheduled yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-[11.5px] leading-relaxed text-muted">
            There is no placeholder speaker and no date to announce. A session appears on this page
            once a real speaker and date are confirmed, and you can RSVP from here.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2 text-[10px] text-muted">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.07] px-3 py-1">
              <Users size={10} /> Group session, not 1:1
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.07] px-3 py-1">
              <CalendarClock size={10} /> Monthly cadence
            </span>
          </div>
        </Card>
      ) : (
        <>
          <SessionsView sessions={sessions} />
          <p className="mt-3 text-center text-[9.5px] leading-relaxed text-muted">
            Times are shown in UTC so the date is unambiguous. Sessions are a group format, not a
            guaranteed one-to-one.
          </p>
        </>
      )}
    </div>
  );
}
