import "server-only";
import { all, now, one, run, tx, type User } from "../db";
import { DAY_MS, dayKeyFor, startOfLocalDay } from "./day";

/**
 * Daily quests. Three tasks rotate every local calendar day and are drawn
 * from pools so a learner always gets one habit task, one skill task and one
 * market task. Progress is read from real tables (lessons, quiz attempts,
 * orders, arena matches) -- there is no way to claim a quest without doing it.
 */
export type QuestMetric = "lesson" | "quiz80" | "questions" | "trade" | "arena";

export type QuestDef = {
  key: string;
  title: string;
  description: string;
  metric: QuestMetric;
  target: number;
  credits: number;
  xp: number;
};

export type DailyQuest = QuestDef & {
  progress: number;
  claimed: boolean;
  complete: boolean;
};

const HABIT: QuestDef[] = [
  {
    key: "lesson",
    title: "Finish one lesson",
    description: "Complete any learning module today.",
    metric: "lesson",
    target: 1,
    credits: 20,
    xp: 30,
  },
  {
    key: "questions",
    title: "Answer 10 quiz questions",
    description: "Any mix of module quizzes counts toward this.",
    metric: "questions",
    target: 10,
    credits: 15,
    xp: 25,
  },
];

const SKILL: QuestDef[] = [
  {
    key: "quiz80",
    title: "Score 80% or higher",
    description: "Pass any module quiz with at least 80%.",
    metric: "quiz80",
    target: 1,
    credits: 25,
    xp: 40,
  },
  {
    key: "arena",
    title: "Play one arena match",
    description: "Finish a skill-based 1v1 quiz battle.",
    metric: "arena",
    target: 1,
    credits: 25,
    xp: 35,
  },
];

const MARKET: QuestDef[] = [
  {
    key: "trade",
    title: "Place one sandbox trade",
    description: "Buy or sell any instrument in the simulator.",
    metric: "trade",
    target: 1,
    credits: 15,
    xp: 20,
  },
  {
    key: "three-trades",
    title: "Make three trades",
    description: "Place three simulated orders today.",
    metric: "trade",
    target: 3,
    credits: 25,
    xp: 40,
  },
];

function hash(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick(pool: QuestDef[], dayKey: string) {
  return pool[hash(dayKey) % pool.length];
}

export function dailyQuestDefs(dayKey: string): QuestDef[] {
  return [pick(HABIT, `${dayKey}:habit`), pick(SKILL, `${dayKey}:skill`), pick(MARKET, `${dayKey}:market`)];
}

function metricValue(userId: number, metric: QuestMetric, start: number) {
  switch (metric) {
    case "lesson":
      return (
        one<{ c: number }>(
          "SELECT COUNT(*) AS c FROM module_progress WHERE user_id = ? AND completed_at IS NOT NULL AND completed_at >= ?",
          userId,
          start
        )?.c ?? 0
      );
    case "quiz80":
      return (
        one<{ c: number }>(
          "SELECT COUNT(*) AS c FROM quiz_attempts WHERE user_id = ? AND created_at >= ? AND total > 0 AND (score * 1.0 / total) >= 0.8",
          userId,
          start
        )?.c ?? 0
      );
    case "questions":
      return (
        one<{ c: number }>(
          "SELECT COALESCE(SUM(total), 0) AS c FROM quiz_attempts WHERE user_id = ? AND created_at >= ?",
          userId,
          start
        )?.c ?? 0
      );
    case "trade":
      return (
        one<{ c: number }>(
          "SELECT COUNT(*) AS c FROM orders WHERE user_id = ? AND created_at >= ?",
          userId,
          start
        )?.c ?? 0
      );
    case "arena":
      return (
        one<{ c: number }>(
          "SELECT COUNT(*) AS c FROM arena_matches WHERE (p1 = ? OR p2 = ?) AND started_at >= ?",
          userId,
          userId,
          start
        )?.c ?? 0
      );
    default:
      return 0;
  }
}

type QuestUser = Pick<User, "id" | "region">;

export function getDailyQuests(user: QuestUser) {
  const ts = now();
  const dayKey = dayKeyFor(ts, user.region);
  const dayStart = startOfLocalDay(ts, user.region);
  const claims = all<{ quest_key: string }>(
    "SELECT quest_key FROM quest_claims WHERE user_id = ? AND day_key = ?",
    user.id,
    dayKey
  );
  const claimed = new Set(claims.map((c) => c.quest_key));
  const quests: DailyQuest[] = dailyQuestDefs(dayKey).map((def) => {
    const progress = Math.min(def.target, metricValue(user.id, def.metric, dayStart));
    return {
      ...def,
      progress,
      claimed: claimed.has(def.key),
      complete: progress >= def.target,
    };
  });
  return {
    dayKey,
    dayStart,
    resetAt: dayStart + DAY_MS,
    quests,
    claimable: quests.filter((q) => q.complete && !q.claimed).length,
    done: quests.filter((q) => q.claimed).length,
  };
}

export function claimQuest(userId: number, questKey: string) {
  const user = one<Pick<User, "id" | "region" | "credits" | "xp">>(
    "SELECT id, region, credits, xp FROM users WHERE id = ?",
    userId
  );
  if (!user) throw new Error("Account not found.");

  const overview = getDailyQuests(user);
  const quest = overview.quests.find((q) => q.key === questKey);
  if (!quest) throw new Error("That quest is not active today.");
  if (quest.claimed) throw new Error("Quest already claimed.");
  if (!quest.complete) throw new Error("Finish the quest before claiming it.");

  return tx(() => {
    run(
      "INSERT INTO quest_claims (user_id, day_key, quest_key, credits, xp, claimed_at) VALUES (?, ?, ?, ?, ?, ?)",
      user.id,
      overview.dayKey,
      quest.key,
      quest.credits,
      quest.xp,
      now()
    );
    run(
      "UPDATE users SET credits = credits + ?, xp = xp + ? WHERE id = ?",
      quest.credits,
      quest.xp,
      user.id
    );
    run(
      "INSERT INTO activity (user_id, type, text, created_at) VALUES (?, 'success', ?, ?)",
      user.id,
      `Quest complete: ${quest.title}`,
      now()
    );
    return {
      quests: getDailyQuests(user),
      credits: user.credits + quest.credits,
      xp: user.xp + quest.xp,
      claimed: quest,
    };
  });
}
