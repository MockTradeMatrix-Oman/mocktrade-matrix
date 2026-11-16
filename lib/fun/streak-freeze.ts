import "server-only";
import { all, now, one, run, tx } from "../db";

/**
 * Streak freezes. A learner can hold at most two unused freezes and buy at
 * most two in any rolling 30 days. A freeze is consumed automatically when
 * exactly one calendar day is missed; it never rewards activity that did not
 * happen, it only prevents a long streak from resetting once.
 */
export const FREEZE_COST = 60;
export const FREEZE_HOLD_LIMIT = 2;
export const FREEZE_BUY_LIMIT = 2;
const BUY_WINDOW_MS = 30 * 86_400_000;

export type FreezeRow = { id: number; purchased_at: number; used_day: string | null };

export function freezeStatus(userId: number) {
  const rows = all<FreezeRow>(
    "SELECT id, purchased_at, used_day FROM streak_freezes WHERE user_id = ? ORDER BY purchased_at ASC",
    userId
  );
  const unused = rows.filter((r) => !r.used_day);
  const boughtRecent = rows.filter((r) => r.purchased_at >= now() - BUY_WINDOW_MS);
  return {
    cost: FREEZE_COST,
    unused: unused.length,
    used: rows.filter((r) => Boolean(r.used_day)).length,
    boughtRecent: boughtRecent.length,
    holdLimit: FREEZE_HOLD_LIMIT,
    buyLimit: FREEZE_BUY_LIMIT,
    canBuy:
      unused.length < FREEZE_HOLD_LIMIT && boughtRecent.length < FREEZE_BUY_LIMIT,
    history: rows.slice(-6).map((r) => ({
      id: r.id,
      purchased_at: r.purchased_at,
      used_day: r.used_day,
    })),
  };
}

export function buyStreakFreeze(userId: number) {
  const status = freezeStatus(userId);
  if (status.unused >= FREEZE_HOLD_LIMIT) {
    throw new Error("You already hold two streak freezes.");
  }
  if (status.boughtRecent >= FREEZE_BUY_LIMIT) {
    throw new Error("Two freezes per 30 days is the limit.");
  }
  return tx(() => {
    const user = one<{ credits: number }>("SELECT credits FROM users WHERE id = ?", userId);
    if (!user) throw new Error("Account not found.");
    if (user.credits < FREEZE_COST) {
      throw new Error(`A streak freeze costs ${FREEZE_COST} credits.`);
    }
    run("UPDATE users SET credits = credits - ? WHERE id = ?", FREEZE_COST, userId);
    run(
      "INSERT INTO streak_freezes (user_id, purchased_at, used_day) VALUES (?, ?, NULL)",
      userId,
      now()
    );
    return {
      freezes: freezeStatus(userId),
      credits: user.credits - FREEZE_COST,
    };
  });
}

/** Consume one unused freeze for a missed calendar day. */
export function consumeStreakFreeze(userId: number, missedDay: string) {
  return tx(() => {
    const freeze = one<{ id: number }>(
      "SELECT id FROM streak_freezes WHERE user_id = ? AND used_day IS NULL ORDER BY purchased_at ASC LIMIT 1",
      userId
    );
    if (!freeze) return false;
    run("UPDATE streak_freezes SET used_day = ? WHERE id = ?", missedDay, freeze.id);
    return true;
  });
}
