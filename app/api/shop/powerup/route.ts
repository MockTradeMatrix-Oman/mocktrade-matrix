import { NextResponse } from "next/server";
import { one, run, now, tx, type User } from "@/lib/db";
import { getSessionUser, isOnboarded } from "@/lib/auth";
import { emitToUser } from "@/lib/realtime";
import { getPowerupInventory } from "@/lib/arena";
import { powerupById } from "@/lib/arena-catalog";

export const runtime = "nodejs";

/**
 * Buy a single quiz powerup with credits.
 *
 * The client only ever sends an id. Price and existence are resolved from the
 * same catalogue the match engine uses, so the shop cannot undercharge.
 */
export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Sign in to use the shop." }, { status: 401 });
  if (!isOnboarded(session)) {
    return NextResponse.json(
      { error: "Verify your identity before buying powerups.", verify: true },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  const powerup = powerupById(String(body?.powerupId ?? ""));
  if (!powerup) return NextResponse.json({ error: "That powerup does not exist." }, { status: 404 });

  const user = one<User>("SELECT * FROM users WHERE id = ?", session.id);
  if (!user) return NextResponse.json({ error: "Account not found." }, { status: 404 });
  if (user.credits < powerup.cost) {
    return NextResponse.json(
      { error: `You need ${powerup.cost - user.credits} more credits for ${powerup.name}.` },
      { status: 400 }
    );
  }

  const ts = now();
  try {
    tx(() => {
      const deducted = run(
        "UPDATE users SET credits = credits - ? WHERE id = ? AND credits >= ?",
        powerup.cost, user.id, powerup.cost
      );
      if (deducted.changes !== 1) throw new Error("insufficient");

      run(
        `INSERT INTO user_powerups (user_id, powerup_id, qty) VALUES (?,?,1)
         ON CONFLICT(user_id, powerup_id) DO UPDATE SET qty = qty + 1`,
        user.id, powerup.id
      );
      run(
        "INSERT INTO transactions (user_id,kind,amount,bucket,note,created_at) VALUES (?,?,?,?,?,?)",
        user.id, "powerup_purchase", -powerup.cost, "credits", `Bought ${powerup.name} powerup`, ts
      );
      run(
        "INSERT INTO notifications (user_id,type,title,body,read,created_at) VALUES (?,?,?,?,0,?)",
        user.id, "reward", `${powerup.name} powerup added`,
        `${powerup.description} Use it during a live quiz battle.`,
        ts
      );
    });
  } catch {
    return NextResponse.json({ error: "Not enough credits for that powerup." }, { status: 400 });
  }

  const updated = one<User>("SELECT credits FROM users WHERE id = ?", user.id)!;
  const inventory = getPowerupInventory(user.id);

  emitToUser(user.id, "credits:update", {
    credits: updated.credits, delta: -powerup.cost, note: `${powerup.name} powerup`,
  });
  emitToUser(user.id, "arena:inventory", { inventory });
  emitToUser(user.id, "notification", {
    id: 0, type: "reward", title: `${powerup.name} powerup added`,
    body: powerup.description, created_at: ts,
  });

  return NextResponse.json({
    ok: true,
    powerup: { id: powerup.id, name: powerup.name, cost: powerup.cost },
    credits: updated.credits,
    inventory,
  });
}
