import "server-only";
import { all, one } from "./db";

export type ArenaStats = {
  user_id: number;
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  correct: number;
  answered: number;
  best_streak: number;
  credits_won: number;
  rating: number;
  updated_at: number;
};

export type ArenaLeaderRow = {
  id: number;
  name: string;
  avatar: string;
  arena_region: string;
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  correct: number;
  answered: number;
  credits_won: number;
  rating: number;
  winPct: number;
  accuracy: number;
  rank?: number;
};

// Arena region falls back to the market region for rows created before the
// arena region column existed.
const ARENA_REGION_SQL = "COALESCE(NULLIF(u.arena_region, ''), CASE WHEN u.region = 'US' THEN 'US' ELSE 'IN' END)";

export function getArenaStats(userId: number): ArenaStats | null {
  return one<ArenaStats>("SELECT * FROM arena_stats WHERE user_id = ?", userId) ?? null;
}

export function getArenaLeaderboard(region?: string, limit = 25): ArenaLeaderRow[] {
  const rows = all<Omit<ArenaLeaderRow, "winPct" | "accuracy">>(
    `SELECT u.id, u.name, u.avatar, ${ARENA_REGION_SQL} AS arena_region,
            s.matches, s.wins, s.losses, s.draws, s.correct, s.answered, s.credits_won, s.rating
     FROM arena_stats s
     JOIN users u ON u.id = s.user_id
     WHERE u.role = 'user'${region ? ` AND ${ARENA_REGION_SQL} = ?` : ""}
     ORDER BY s.rating DESC, s.wins DESC, s.matches ASC
     LIMIT ?`,
    ...(region ? [region, limit] : [limit])
  );

  return rows.map((row, index) => ({
    ...row,
    winPct: row.matches > 0 ? Math.round((row.wins / row.matches) * 1000) / 10 : 0,
    accuracy: row.answered > 0 ? Math.round((row.correct / row.answered) * 1000) / 10 : 0,
    rank: index + 1,
  }));
}

/** Every arena region at once, for the region switcher on the leaderboard. */
export function getArenaLeaderboards(limit = 20): Record<string, ArenaLeaderRow[]> {
  const rows = all<Omit<ArenaLeaderRow, "winPct" | "accuracy">>(
    `SELECT u.id, u.name, u.avatar, ${ARENA_REGION_SQL} AS arena_region,
            s.matches, s.wins, s.losses, s.draws, s.correct, s.answered, s.credits_won, s.rating
     FROM arena_stats s
     JOIN users u ON u.id = s.user_id
     WHERE u.role = 'user'
     ORDER BY s.rating DESC, s.wins DESC, s.matches ASC`
  );

  const boards: Record<string, ArenaLeaderRow[]> = {};
  for (const row of rows) {
    const list = (boards[row.arena_region] ??= []);
    if (list.length >= limit) continue;
    list.push({
      ...row,
      winPct: row.matches > 0 ? Math.round((row.wins / row.matches) * 1000) / 10 : 0,
      accuracy: row.answered > 0 ? Math.round((row.correct / row.answered) * 1000) / 10 : 0,
      rank: list.length + 1,
    });
  }
  return boards;
}

export function getArenaRank(userId: number, region?: string): number | null {
  const row = one<{ rating: number; wins: number }>(
    "SELECT rating, wins FROM arena_stats WHERE user_id = ?",
    userId
  );
  if (!row) return null;

  const higher = one<{ c: number }>(
    `SELECT COUNT(*) AS c FROM arena_stats s
     JOIN users u ON u.id = s.user_id
     WHERE u.role = 'user'${region ? ` AND ${ARENA_REGION_SQL} = ?` : ""}
       AND (s.rating > ? OR (s.rating = ? AND s.wins > ?))`,
    ...(region ? [region, row.rating, row.rating, row.wins] : [row.rating, row.rating, row.wins])
  );

  return (higher?.c ?? 0) + 1;
}

export function getPowerupInventory(userId: number): Record<string, number> {
  const rows = all<{ powerup_id: string; qty: number }>(
    "SELECT powerup_id, qty FROM user_powerups WHERE user_id = ?",
    userId
  );
  const map: Record<string, number> = {};
  for (const row of rows) map[row.powerup_id] = row.qty;
  return map;
}

export type ArenaMatchRow = {
  id: string;
  region: string;
  p1: number;
  p2: number;
  p1_name: string;
  p2_name: string;
  p1_region: string;
  p2_region: string;
  p1_score: number;
  p2_score: number;
  p1_correct: number;
  p2_correct: number;
  p1_ms: number;
  p2_ms: number;
  winner_id: number | null;
  reason: string | null;
  credits_awarded: number;
  questions: number;
  status: string;
  started_at: number;
  ended_at: number | null;
};

export function getRecentArenaMatches(userId: number, limit = 6): ArenaMatchRow[] {
  return all<ArenaMatchRow>(
    `SELECT * FROM arena_matches
     WHERE (p1 = ? OR p2 = ?) AND status = 'finished'
     ORDER BY started_at DESC LIMIT ?`,
    userId, userId, limit
  );
}
