import "server-only";
import { run, now, type User } from "./db";
import { dayKeyFor, dayKeyFromNumber, dayNumber } from "./fun/day";
import { consumeStreakFreeze } from "./fun/streak-freeze";

/**
 * Record a real daily login.
 *
 * - same calendar day -> streak unchanged (only one credit per day)
 * - the next calendar day -> streak + 1
 * - exactly one missed day and a streak freeze available -> the freeze is
 *   consumed and the streak survives
 * - any longer gap -> streak resets to 1
 *
 * `last_streak_day` is the source of truth. Older accounts fall back to
 * `last_seen` the first time they sign in after this ships.
 */
export function recordDailyLogin(
  user: Pick<User, "id" | "region" | "streak" | "last_seen" | "last_streak_day">
) {
  const ts = now();
  const today = dayKeyFor(ts, user.region);
  const last = user.last_streak_day || dayKeyFor(user.last_seen || ts, user.region);
  const current = Math.max(1, Number(user.streak) || 1);

  let streak = current;
  if (last !== today) {
    const gap = dayNumber(today) - dayNumber(last);
    if (gap === 1) {
      streak = current + 1;
    } else if (gap === 2 && consumeStreakFreeze(user.id, dayKeyFromNumber(dayNumber(last) + 1))) {
      // One missed day was covered by a purchased freeze.
      streak = current + 1;
    } else {
      streak = 1;
    }
  }

  run(
    "UPDATE users SET last_streak_day = ?, streak = ?, last_seen = ? WHERE id = ?",
    today,
    streak,
    ts,
    user.id
  );
  return streak;
}
