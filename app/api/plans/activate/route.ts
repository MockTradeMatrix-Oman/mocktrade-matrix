import { NextResponse } from "next/server";
import { one, run, tx, now, type User } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { notify } from "@/lib/trading";
import { emitToUser } from "@/lib/realtime";
import {
  PREMIUM_MONTH_CREDITS,
  PREMIUM_TERM_DAYS,
  PREMIUM_TERM_MS,
  isPremium,
} from "@/lib/plans";

/**
 * Activates or extends Premium for 30 days using earned credits.
 *
 * The debit and the plan update happen in one transaction with a conditional
 * `credits >= price` guard, so a stale session can never overdraw the wallet.
 * No cash, card or invoice is involved in this build.
 */
export async function POST() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });

  if (session.role === "admin") {
    return NextResponse.json({ error: "Admin accounts already include every plan." }, { status: 400 });
  }
  if (session.institution_access) {
    return NextResponse.json(
      { error: "Institution access already includes Premium features." },
      { status: 400 }
    );
  }

  const ts = now();
  let until = ts + PREMIUM_TERM_MS;

  try {
    tx(() => {
      const latest = one<User>("SELECT * FROM users WHERE id = ?", session.id);
      if (!latest) throw new Error("missing");
      if (latest.role === "admin" || latest.institution_access) throw new Error("included");

      until = Math.max(ts, Number(latest.premium_until ?? 0)) + PREMIUM_TERM_MS;

      const deducted = run(
        `UPDATE users
            SET credits = credits - ?,
                plan = 'premium',
                plan_since = COALESCE(plan_since, ?),
                premium_until = ?,
                premium_source = 'credits'
          WHERE id = ? AND credits >= ?`,
        PREMIUM_MONTH_CREDITS, ts, until, session.id, PREMIUM_MONTH_CREDITS
      );
      if (deducted.changes !== 1) throw new Error("insufficient");

      run(
        "INSERT INTO transactions (user_id,kind,amount,bucket,note,created_at) VALUES (?,?,?,?,?,?)",
        session.id, "plan_purchase", -PREMIUM_MONTH_CREDITS, "credits",
        `Premium · ${PREMIUM_TERM_DAYS} days`, ts
      );
    });
  } catch (err) {
    const reason = String((err as { message?: string })?.message ?? "");
    if (reason === "insufficient") {
      return NextResponse.json(
        { error: `Premium costs ${PREMIUM_MONTH_CREDITS} credits. Earn more in Learning or the Arena.` },
        { status: 400 }
      );
    }
    if (reason === "included") {
      return NextResponse.json({ error: "Your account already includes Premium features." }, { status: 400 });
    }
    return NextResponse.json({ error: "Could not activate Premium. Try again." }, { status: 500 });
  }

  const updated = one<User>("SELECT * FROM users WHERE id = ?", session.id)!;
  emitToUser(updated.id, "credits:update", {
    credits: updated.credits,
    delta: -PREMIUM_MONTH_CREDITS,
    note: "Premium activation",
  });
  emitToUser(updated.id, "plan:update", {
    plan: updated.plan,
    premiumUntil: updated.premium_until,
    premium: isPremium(updated),
  });
  notify(
    updated.id,
    "success",
    "Premium is live",
    `You have ${premiumLeft(until)} days to use every module, full analytics and the final exam.`
  );

  return NextResponse.json({
    ok: true,
    credits: updated.credits,
    plan: updated.plan,
    premiumUntil: updated.premium_until,
    days: premiumLeft(until),
  });
}

function premiumLeft(until: number) {
  return Math.max(0, Math.ceil((until - Date.now()) / 86_400_000));
}
