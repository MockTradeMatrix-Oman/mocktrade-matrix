import "server-only";
import { all, one, run, now } from "./db";

/**
 * Expert sessions.
 *
 * Premium includes a monthly group session with an industry expert. Sessions
 * are created only by an administrator, so this module never invents a
 * speaker, date or join link. When nothing has been scheduled the learner
 * sees an honest empty state instead of a placeholder.
 */
export type ExpertSession = {
  id: number;
  title: string;
  speaker: string;
  speaker_bio: string | null;
  starts_at: number;
  duration_mins: number;
  join_url: string | null;
  status: string;
  created_by: number;
  created_at: number;
};

export type SessionView = ExpertSession & {
  attending: boolean;
  attendees: number;
  live: boolean;
  ended: boolean;
};

export type AdminSession = ExpertSession & {
  attendees: number;
  rsvps: Array<{ user_id: number; name: string; email: string; created_at: number }>;
};

const ATTENDEE_COUNT = `(SELECT COUNT(*) FROM expert_session_rsvps r WHERE r.session_id = s.id)`;

function decorate(session: ExpertSession, userId: number | null, attendees: number): SessionView {
  const end = session.starts_at + session.duration_mins * 60_000;
  const ts = now();
  const attending = userId
    ? Boolean(
        one<{ user_id: number }>(
          "SELECT user_id FROM expert_session_rsvps WHERE session_id = ? AND user_id = ?",
          session.id,
          userId
        )
      )
    : false;

  return {
    ...session,
    attending,
    attendees,
    live: session.status === "scheduled" && ts >= session.starts_at && ts < end,
    ended: ts >= end,
  };
}

/** Sessions a learner can still act on: scheduled and not yet finished. */
export function listOpenSessions(userId: number | null): SessionView[] {
  const rows = all<ExpertSession & { attendees: number }>(
    `SELECT s.*, ${ATTENDEE_COUNT} AS attendees
       FROM expert_sessions s
      WHERE s.status = 'scheduled'
        AND s.starts_at + s.duration_mins * 60000 > ?
      ORDER BY s.starts_at ASC`,
    now()
  );
  return rows.map((row) => decorate(row, userId, row.attendees));
}

export function listAllSessions(): AdminSession[] {
  const rows = all<ExpertSession & { attendees: number }>(
    `SELECT s.*, ${ATTENDEE_COUNT} AS attendees
       FROM expert_sessions s
      ORDER BY s.starts_at DESC`
  );
  return rows.map((row) => ({
    ...row,
    rsvps: all<{ user_id: number; name: string; email: string; created_at: number }>(
      `SELECT r.user_id, u.name, u.email, r.created_at
         FROM expert_session_rsvps r
         JOIN users u ON u.id = r.user_id
        WHERE r.session_id = ?
        ORDER BY r.created_at ASC`,
      row.id
    ),
  }));
}

export function getSession(id: number): ExpertSession | null {
  return one<ExpertSession>("SELECT * FROM expert_sessions WHERE id = ?", id) ?? null;
}

export function createSession(
  adminId: number,
  input: {
    title: string;
    speaker: string;
    speakerBio?: string | null;
    startsAt: number;
    durationMins: number;
    joinUrl?: string | null;
  }
): ExpertSession {
  const result = run(
    `INSERT INTO expert_sessions
       (title, speaker, speaker_bio, starts_at, duration_mins, join_url, status, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'scheduled', ?, ?)`,
    input.title.trim(),
    input.speaker.trim(),
    input.speakerBio?.trim() || null,
    input.startsAt,
    input.durationMins,
    input.joinUrl?.trim() || null,
    adminId,
    now()
  );
  return getSession(Number(result.lastId))!;
}

export function cancelSession(id: number): ExpertSession | null {
  const session = getSession(id);
  if (!session) return null;
  run("UPDATE expert_sessions SET status = 'cancelled' WHERE id = ?", id);
  return getSession(id);
}

export function setRsvp(userId: number, sessionId: number, attending: boolean): number {
  const session = getSession(sessionId);
  if (!session) throw new Error("That session no longer exists.");
  if (session.status !== "scheduled") throw new Error("That session is no longer open for RSVPs.");
  const end = session.starts_at + session.duration_mins * 60_000;
  if (now() >= end) throw new Error("That session has already finished.");

  if (attending) {
    run(
      `INSERT INTO expert_session_rsvps (session_id, user_id, created_at)
       VALUES (?, ?, ?)
       ON CONFLICT(session_id, user_id) DO NOTHING`,
      sessionId,
      userId,
      now()
    );
  } else {
    run(
      "DELETE FROM expert_session_rsvps WHERE session_id = ? AND user_id = ?",
      sessionId,
      userId
    );
  }

  return (
    one<{ n: number }>(
      "SELECT COUNT(*) AS n FROM expert_session_rsvps WHERE session_id = ?",
      sessionId
    )?.n ?? 0
  );
}

/** Compact UTC label so a date is never ambiguous across time zones. */
export function sessionDateLabel(startsAt: number, durationMins: number): string {
  const start = new Date(startsAt);
  const end = new Date(startsAt + durationMins * 60_000);
  const day = start.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  const time = (date: Date) =>
    date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC",
    });
  return `${day} · ${time(start)}–${time(end)} UTC`;
}
