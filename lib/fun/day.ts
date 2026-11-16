/**
 * Date helpers for the fun layer.
 *
 * Streaks and daily quests follow the learner's own calendar day, while
 * leagues and boss battles rotate on UTC boundaries so every cohort sees the
 * same week regardless of timezone. Pure functions only -- no database here.
 */
const DAY_MS = 86_400_000;

export function timezoneFor(region: string) {
  return region === "US" ? "America/New_York" : "Asia/Kolkata";
}

function parts(ts: number, timeZone: string) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const list = dtf.formatToParts(new Date(ts));
  const get = (type: string) => Number(list.find((p) => p.type === type)?.value ?? 0);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour") % 24,
    minute: get("minute"),
    second: get("second"),
  };
}

function offsetMs(ts: number, timeZone: string) {
  const p = parts(ts, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(ts / 1000) * 1000;
}

/** Calendar day (YYYY-MM-DD) in the learner's timezone. */
export function dayKeyFor(ts: number, region: string) {
  const timeZone = timezoneFor(region);
  const p = parts(ts, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export function dayNumber(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
}

/** Inverse of dayNumber; returns YYYY-MM-DD for a day index. */
export function dayKeyFromNumber(value: number) {
  return new Date(value * DAY_MS).toISOString().slice(0, 10);
}

/** First millisecond of the learner's local day. */
export function startOfLocalDay(ts: number, region: string) {
  const timeZone = timezoneFor(region);
  const offset = offsetMs(ts, timeZone);
  const local = new Date(ts + offset);
  const start = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  return start - offset;
}

/** Monday 00:00 UTC for the week containing ts, used as the league key. */
export function weekStartMs(ts = Date.now()) {
  const d = new Date(ts);
  const sinceMonday = (d.getUTCDay() + 6) % 7;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - sinceMonday);
}

export function weekKeyFor(ts = Date.now()) {
  const start = weekStartMs(ts);
  const d = new Date(start);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export function weekEndMs(ts = Date.now()) {
  return weekStartMs(ts) + 7 * DAY_MS;
}

export function monthKeyFor(ts = Date.now()) {
  const d = new Date(ts);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function daysLeftInMonth(ts = Date.now()) {
  const d = new Date(ts);
  const end = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
  return Math.max(0, Math.ceil((end - ts) / DAY_MS));
}

export { DAY_MS };
