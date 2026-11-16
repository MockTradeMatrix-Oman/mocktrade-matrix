import "server-only";
import { all, now, one, run, tx } from "../db";

/**
 * Badges are computed from real activity, then stored so the earned date is
 * stable. Loading the cabinet backfills anything a learner has already
 * qualified for; no badge can be granted without the underlying rows.
 */
export type BadgeTier = "bronze" | "silver" | "gold" | "violet";

export type BadgeDef = {
  key: string;
  title: string;
  description: string;
  tier: BadgeTier;
  target: number;
  value: (stats: BadgeStats) => number;
};

type BadgeStats = {
  trades: number;
  modulesDone: number;
  modulesTotal: number;
  quizAces: number;
  streak: number;
  crashDone: number;
  arenaWins: number;
  lightningBest: number;
  bossWins: number;
  certificates: number;
  questsClaimed: number;
  friends: number;
};

const BADGES: BadgeDef[] = [
  {
    key: "first-trade",
    title: "First order",
    description: "Place your first simulated trade.",
    tier: "bronze",
    target: 1,
    value: (s) => s.trades,
  },
  {
    key: "ten-trades",
    title: "Order flow",
    description: "Place 10 simulated trades.",
    tier: "silver",
    target: 10,
    value: (s) => s.trades,
  },
  {
    key: "first-lesson",
    title: "First lesson",
    description: "Complete your first learning module.",
    tier: "bronze",
    target: 1,
    value: (s) => s.modulesDone,
  },
  {
    key: "curriculum",
    title: "Curriculum complete",
    description: "Complete every published module.",
    tier: "gold",
    target: 8,
    value: (s) => Math.min(s.modulesDone, s.modulesTotal),
  },
  {
    key: "quiz-ace",
    title: "Quiz ace",
    description: "Score 80% or higher on five module quizzes.",
    tier: "silver",
    target: 5,
    value: (s) => s.quizAces,
  },
  {
    key: "streak-7",
    title: "Seven-day streak",
    description: "Sign in seven calendar days in a row.",
    tier: "silver",
    target: 7,
    value: (s) => s.streak,
  },
  {
    key: "streak-30",
    title: "Thirty-day streak",
    description: "Sign in thirty calendar days in a row.",
    tier: "gold",
    target: 30,
    value: (s) => s.streak,
  },
  {
    key: "crash-survivor",
    title: "Crash survivor",
    description: "Experience a forced market crash drill.",
    tier: "silver",
    target: 1,
    value: (s) => s.crashDone,
  },
  {
    key: "arena-win",
    title: "Arena winner",
    description: "Win a skill-based quiz battle.",
    tier: "silver",
    target: 1,
    value: (s) => s.arenaWins,
  },
  {
    key: "lightning-ace",
    title: "Lightning ace",
    description: "Answer 10 or more correctly in one Lightning Round.",
    tier: "gold",
    target: 10,
    value: (s) => s.lightningBest,
  },
  {
    key: "boss-slayer",
    title: "Boss slayer",
    description: "Defeat a monthly boss battle.",
    tier: "gold",
    target: 1,
    value: (s) => s.bossWins,
  },
  {
    key: "certified",
    title: "Certified",
    description: "Earn the Completion Merit Certificate.",
    tier: "violet",
    target: 1,
    value: (s) => s.certificates,
  },
  {
    key: "quest-keeper",
    title: "Quest keeper",
    description: "Claim 15 daily quests.",
    tier: "silver",
    target: 15,
    value: (s) => s.questsClaimed,
  },
  {
    key: "friendly",
    title: "Study buddy",
    description: "Accept your first friend.",
    tier: "bronze",
    target: 1,
    value: (s) => s.friends,
  },
];

function statsFor(userId: number): BadgeStats {
  const user = one<{ streak: number; crash_done: number }>(
    "SELECT streak, crash_done FROM users WHERE id = ?",
    userId
  ) ?? { streak: 0, crash_done: 0 };
  const count = (sql: string, ...params: unknown[]) =>
    one<{ c: number }>(sql, ...params)?.c ?? 0;

  return {
    trades: count("SELECT COUNT(*) AS c FROM orders WHERE user_id = ?", userId),
    modulesDone: count(
      "SELECT COUNT(*) AS c FROM module_progress WHERE user_id = ? AND status = 'completed'",
      userId
    ),
    modulesTotal: count("SELECT COUNT(*) AS c FROM modules WHERE is_published = 1"),
    quizAces: count(
      "SELECT COUNT(*) AS c FROM quiz_attempts WHERE user_id = ? AND total > 0 AND (score * 1.0 / total) >= 0.8",
      userId
    ),
    streak: Number(user.streak) || 0,
    crashDone: Number(user.crash_done) || 0,
    arenaWins: one<{ wins: number }>("SELECT wins FROM arena_stats WHERE user_id = ?", userId)?.wins ?? 0,
    lightningBest:
      one<{ best: number }>(
        "SELECT COALESCE(MAX(correct), 0) AS best FROM lightning_runs WHERE user_id = ? AND submitted_at IS NOT NULL",
        userId
      )?.best ?? 0,
    bossWins: count(
      "SELECT COUNT(*) AS c FROM boss_attempts WHERE user_id = ? AND passed = 1",
      userId
    ),
    certificates: count("SELECT COUNT(*) AS c FROM certificates WHERE user_id = ?", userId),
    questsClaimed: count("SELECT COUNT(*) AS c FROM quest_claims WHERE user_id = ?", userId),
    friends: count(
      "SELECT COUNT(*) AS c FROM friends WHERE status = 'accepted' AND (requester = ? OR addressee = ?)",
      userId,
      userId
    ),
  };
}

export type BadgeView = Omit<BadgeDef, "value"> & {
  earned: boolean;
  earnedAt: number | null;
  progress: number;
};

export function getBadges(userId: number) {
  const earnedRows = all<{ badge_key: string; earned_at: number }>(
    "SELECT badge_key, earned_at FROM user_badges WHERE user_id = ?",
    userId
  );
  const earned = new Map(earnedRows.map((r) => [r.badge_key, r.earned_at]));
  const stats = statsFor(userId);

  const required = (badge: BadgeDef) =>
    badge.key === "curriculum" ? Math.max(1, stats.modulesTotal) : badge.target;
  const fresh = BADGES.filter((badge) => !earned.has(badge.key) && badge.value(stats) >= required(badge));

  if (fresh.length > 0) {
    tx(() => {
      for (const badge of fresh) {
        const ts = now();
        run(
          "INSERT OR IGNORE INTO user_badges (user_id, badge_key, earned_at) VALUES (?, ?, ?)",
          userId,
          badge.key,
          ts
        );
        earned.set(badge.key, ts);
        run(
          "INSERT INTO activity (user_id, type, text, created_at) VALUES (?, 'reward', ?, ?)",
          userId,
          `Badge earned: ${badge.title}`,
          ts
        );
      }
    });
  }

  const badges: BadgeView[] = BADGES.map((badge) => {
    // The curriculum badge follows the real published-module count instead of
    // a hard-coded total, so adding a module cannot leave it unreachable.
    const target =
      badge.key === "curriculum" ? Math.max(1, stats.modulesTotal) : badge.target;
    const { value: _value, ...rest } = badge;
    return {
      ...rest,
      target,
      earned: earned.has(badge.key),
      earnedAt: earned.get(badge.key) ?? null,
      progress: Math.min(target, badge.value(stats)),
    };
  });

  return {
    badges,
    earned: badges.filter((b) => b.earned).length,
    total: badges.length,
    newKeys: fresh.map((b) => b.key),
  };
}
