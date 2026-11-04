import "server-only";
import { all, one, now, DAY } from "./db";
import { getClassroomLeaderboard } from "./data";

export type ClassroomRow = {
  id: number;
  name: string;
  code: string;
  owner_id: number;
  created_at: number;
  members: number;
};

export function getOwnedClassrooms(userId: number) {
  return all<ClassroomRow>(
    `SELECT c.*, (SELECT COUNT(*) FROM classroom_members m WHERE m.classroom_id = c.id) AS members
     FROM classrooms c
     WHERE c.owner_id = ?
     ORDER BY c.created_at DESC`,
    userId
  );
}

export function getClassroom(classroomId: number) {
  return one<ClassroomRow>(
    `SELECT c.*, (SELECT COUNT(*) FROM classroom_members m WHERE m.classroom_id = c.id) AS members
     FROM classrooms c WHERE c.id = ?`,
    classroomId
  );
}

export type MemberRow = {
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

export function getClassroomMembers(classroomId: number) {
  return all<MemberRow>(
    `SELECT u.id, u.name, u.email, u.avatar, u.xp, u.credits, u.region, u.id_verified,
            u.last_seen, m.joined_at, m.role
     FROM classroom_members m
     JOIN users u ON u.id = m.user_id
     WHERE m.classroom_id = ?
     ORDER BY m.joined_at`,
    classroomId
  );
}

export function getClassroomAnalytics(classroomId: number) {
  const members = getClassroomMembers(classroomId);
  const leaderboard = getClassroomLeaderboard(classroomId);
  const returns = new Map(leaderboard.map((r) => [r.id, r.returnPct]));

  const quiz = one<{ avg: number | null; attempts: number }>(
    `SELECT AVG(score * 100.0 / MAX(total, 1)) AS avg, COUNT(*) AS attempts
     FROM quiz_attempts
     WHERE user_id IN (SELECT user_id FROM classroom_members WHERE classroom_id = ?)`,
    classroomId
  );

  const cutoff = now() - 7 * DAY;
  const verified = members.filter((m) => m.id_verified).length;
  const active7d = members.filter((m) => m.last_seen >= cutoff).length;
  const sum = (fn: (m: MemberRow) => number) => members.reduce((s, m) => s + fn(m), 0);

  return {
    memberCount: members.length,
    verified,
    verifiedPct: members.length ? (verified / members.length) * 100 : 0,
    active7d,
    activePct: members.length ? (active7d / members.length) * 100 : 0,
    avgXp: members.length ? sum((m) => m.xp) / members.length : 0,
    quizAvg: quiz?.avg ?? 0,
    attempts: quiz?.attempts ?? 0,
    avgReturn: members.length ? sum((m) => returns.get(m.id) ?? 0) / members.length : 0,
  };
}

export type CompetitionRow = {
  id: number;
  classroom_id: number;
  name: string;
  created_by: number;
  starts_at: number;
  ends_at: number;
  status: string;
  teams: string;
  snapshot: string;
  created_at: number;
};

export function getCompetitions(classroomId: number) {
  return all<CompetitionRow>(
    "SELECT * FROM classroom_competitions WHERE classroom_id = ? ORDER BY created_at DESC",
    classroomId
  );
}

export type TeamStanding = {
  key: "A" | "B";
  members: Array<{ id: number; name: string; total: number; base: number; changePct: number }>;
  avg: number;
};

export function competitionStandings(row: CompetitionRow) {
  const byId = new Map(getClassroomLeaderboard(row.classroom_id).map((r) => [r.id, r]));

  let teams: { A?: number[]; B?: number[] } = {};
  let snapshot: Record<string, number> = {};
  try {
    teams = JSON.parse(row.teams || "{}");
  } catch {
    teams = {};
  }
  try {
    snapshot = JSON.parse(row.snapshot || "{}");
  } catch {
    snapshot = {};
  }

  const build = (key: "A" | "B"): TeamStanding => {
    const ids = Array.isArray(teams[key]) ? teams[key]! : [];
    const members = ids.map((id) => {
      const live = byId.get(id);
      const base = Number(snapshot[String(id)] ?? 0);
      const total = live?.total ?? 0;
      return {
        id,
        name: live?.name ?? "Unknown member",
        total,
        base,
        changePct: base > 0 ? ((total - base) / base) * 100 : 0,
      };
    });
    return {
      key,
      members,
      avg: members.length ? members.reduce((s, m) => s + m.changePct, 0) / members.length : 0,
    };
  };

  return { A: build("A"), B: build("B") };
}

export type SupportRequestRow = {
  id: number;
  user_id: number;
  classroom_id: number | null;
  subject: string;
  body: string;
  status: string;
  resolution: string | null;
  created_at: number;
  resolved_at: number | null;
  user_name: string;
  user_email: string;
};

export function getSupportRequests(userId?: number) {
  const base = `SELECT s.*, u.name AS user_name, u.email AS user_email
                FROM support_requests s JOIN users u ON u.id = s.user_id`;
  return userId == null
    ? all<SupportRequestRow>(`${base} ORDER BY s.created_at DESC`)
    : all<SupportRequestRow>(`${base} WHERE s.user_id = ? ORDER BY s.created_at DESC`, userId);
}
