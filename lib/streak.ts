import "server-only";
import { run, now, type User } from "./db";

const DAY_MS = 86_400_000;

/**
 * Calendar day in the learner's own timezone. Using a real date key (instead
 * of a rolling 24 hour window) means "logged in yesterday" is judged the same
 * way a learner would judge it, no matter what timezone the server runs in.
 */
function dayKey(ts: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(ts));
  const pick = (type: string) => parts.find((p) => p.type === type)?.value ?? "01";
  return `${pick("year")}-${pick("month")}-${pick("day")}`;
}

function dayNumber(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
}

export function timezoneFor(region: string) {
  return region === "US" ? "America/New_York" : "Asia/Kolkata";
}

/**
 * Record a real daily login.
 *
 * - same calendar day -> streak unchanged (only one credit per day)
 * - the next calendar day -> streak + 1
 * - any longer gap -> streak resets to 1
 *
 * `last_streak_day` is the source of truth. Older accounts fall back to
 * `last_seen` the first time they sign in after this ships.
 */
export function recordDailyLogin(
  user: Pick<User, "id" | "region" | "streak" | "last_seen" | "last_streak_day">
) {
  const ts = now();
  const timeZone = timezoneFor(user.region);
  const today = dayKey(ts, timeZone);
  const last = user.last_streak_day || dayKey(user.last_seen || ts, timeZone);
  const current = Math.max(1, Number(user.streak) || 1);

  let streak = current;
  if (last !== today) {
    streak = dayNumber(last) === dayNumber(today) - 1 ? current + 1 : 1;
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
