import "server-only";
import { all, now, one, run, tx, type User } from "../db";
import { weekEndMs, weekKeyFor } from "./day";

/**
 * Weekly XP leagues. Learners are placed in cohorts of at most twenty within
 * their tier. Weekly XP is measured from the lifetime XP snapshot taken when
 * they join the week, so a mid-week join is still fair. Promotion and
 * demotion resolve once, on the first visit after the week closes.
 */
export const TIERS = ["bronze", "silver", "gold", "diamond"] as const;
export type Tier = (typeof TIERS)[number];
export const COHORT_SIZE = 20;
export const PROMOTE_COUNT = 5;
export const DEMOTE_COUNT = 5;

export function tierLabel(tier: string) {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

function nextTier(tier: Tier): Tier {
  const i = TIERS.indexOf(tier);
  return TIERS[Math.min(TIERS.length - 1, i + 1)];
}

function prevTier(tier: Tier): Tier {
  const i = TIERS.indexOf(tier);
  return TIERS[Math.max(0, i - 1)];
}

type MemberRow = {
  week_key: string;
  user_id: number;
  tier: string;
  cohort: number;
  xp_start: number;
  joined_at: number;
  name: string;
  avatar: string;
  xp: number;
};

function assignCohort(userId: number, tier: Tier, weekKey: string, xp: number) {
  const cohorts = all<{ cohort: number; n: number }>(
    `SELECT c.cohort,
            (SELECT COUNT(*) FROM league_members m
              WHERE m.week_key = c.week_key AND m.tier = c.tier AND m.cohort = c.cohort) AS n
       FROM league_cohorts c
      WHERE c.week_key = ? AND c.tier = ?
      ORDER BY c.cohort ASC`,
    weekKey,
    tier
  );
  const open = cohorts.find((c) => c.n < COHORT_SIZE);
  const cohort = open ? open.cohort : (cohorts.at(-1)?.cohort ?? 0) + 1;
  run(
    "INSERT OR IGNORE INTO league_cohorts (week_key, tier, cohort, finalized) VALUES (?, ?, ?, 0)",
    weekKey,
    tier,
    cohort
  );
  run(
    `INSERT OR IGNORE INTO league_members (week_key, user_id, tier, cohort, xp_start, joined_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    weekKey,
    userId,
    tier,
    cohort,
    xp,
    now()
  );
}

function finalizeCohort(weekKey: string, tier: Tier, cohort: number) {
  const state = one<{ finalized: number }>(
    "SELECT finalized FROM league_cohorts WHERE week_key = ? AND tier = ? AND cohort = ?",
    weekKey,
    tier,
    cohort
  );
  if (!state || state.finalized) return;

  const members = all<MemberRow>(
    `SELECT m.*, u.name, u.avatar, u.xp
       FROM league_members m JOIN users u ON u.id = m.user_id
      WHERE m.week_key = ? AND m.tier = ? AND m.cohort = ?
      ORDER BY (u.xp - m.xp_start) DESC, m.joined_at ASC`,
    weekKey,
    tier,
    cohort
  );
  if (members.length === 0) {
    run(
      "UPDATE league_cohorts SET finalized = 1 WHERE week_key = ? AND tier = ? AND cohort = ?",
      weekKey,
      tier,
      cohort
    );
    return;
  }

  const demoting = members.length >= 10 ? DEMOTE_COUNT : 0;
  const promoting = members.length >= 10 ? PROMOTE_COUNT : Math.min(3, members.length);
  const ts = now();

  tx(() => {
    members.forEach((member, index) => {
      let target = tier as Tier;
      let note: string | null = null;
      if (index < promoting && tier !== "diamond") {
        target = nextTier(tier);
        note = `Promoted to ${tierLabel(target)} league`;
      } else if (demoting > 0 && index >= members.length - demoting && tier !== "bronze") {
        target = prevTier(tier);
        note = `Moved to ${tierLabel(target)} league`;
      }
      if (target !== tier) {
        run("UPDATE users SET league_tier = ? WHERE id = ?", target, member.user_id);
      }
      if (note) {
        run(
          "INSERT INTO notifications (user_id, type, title, body, read, created_at) VALUES (?, ?, ?, ?, 0, ?)",
          member.user_id,
          target === tier ? "info" : index < promoting ? "success" : "info",
          note,
          `Week of ${weekKey} finished. Your cohort placed you ${index + 1} of ${members.length}.`,
          ts
        );
      }
    });
    run(
      "UPDATE league_cohorts SET finalized = 1 WHERE week_key = ? AND tier = ? AND cohort = ?",
      weekKey,
      tier,
      cohort
    );
  });
}

function finalizePast(userId: number) {
  const current = weekKeyFor();
  const rows = all<{ week_key: string; tier: string; cohort: number }>(
    `SELECT m.week_key, m.tier, m.cohort
       FROM league_members m
       JOIN league_cohorts c ON c.week_key = m.week_key AND c.tier = m.tier AND c.cohort = m.cohort
      WHERE m.user_id = ? AND m.week_key < ? AND c.finalized = 0`,
    userId,
    current
  );
  for (const row of rows) finalizeCohort(row.week_key, row.tier as Tier, row.cohort);
}

type LeagueUser = Pick<User, "id" | "xp" | "league_tier">;

export function getLeague(user: LeagueUser) {
  finalizePast(user.id);
  const weekKey = weekKeyFor();
  const tier = (TIERS.includes(user.league_tier as Tier) ? user.league_tier : "bronze") as Tier;

  const existing = one<{ cohort: number }>(
    "SELECT cohort FROM league_members WHERE week_key = ? AND user_id = ?",
    weekKey,
    user.id
  );
  if (!existing) assignCohort(user.id, tier, weekKey, user.xp);

  const membership = one<{ cohort: number; tier: string; xp_start: number }>(
    "SELECT cohort, tier, xp_start FROM league_members WHERE week_key = ? AND user_id = ?",
    weekKey,
    user.id
  );
  const cohort = membership?.cohort ?? 0;
  const cohortTier = (membership?.tier ?? tier) as Tier;

  const rows = all<MemberRow>(
    `SELECT m.*, u.name, u.avatar, u.xp
       FROM league_members m JOIN users u ON u.id = m.user_id
      WHERE m.week_key = ? AND m.tier = ? AND m.cohort = ?
      ORDER BY (u.xp - m.xp_start) DESC, m.joined_at ASC`,
    weekKey,
    cohortTier,
    cohort
  );

  const members = rows.map((row) => ({
    userId: row.user_id,
    name: row.name,
    avatar: row.avatar,
    xp: Math.max(0, Number(row.xp) - Number(row.xp_start)),
    joinedAt: row.joined_at,
  }));

  const me = members.findIndex((m) => m.userId === user.id);
  const size = members.length;
  const promoteCount = size >= 10 ? PROMOTE_COUNT : Math.min(3, size);
  const demoteCount = size >= 10 ? DEMOTE_COUNT : 0;

  return {
    tier: cohortTier,
    tierLabel: tierLabel(cohortTier),
    weekKey,
    cohort,
    cohortSize: size,
    endsAt: weekEndMs(),
    members,
    myRank: me >= 0 ? me + 1 : null,
    myXp: me >= 0 ? members[me].xp : Math.max(0, user.xp - (membership?.xp_start ?? user.xp)),
    promoteCount,
    demoteCount,
    nextTier: nextTier(cohortTier),
    nextTierLabel: tierLabel(nextTier(cohortTier)),
  };
}
