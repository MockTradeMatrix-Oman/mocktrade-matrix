import { NextResponse } from "next/server";
import { one, run, now, tx, type User } from "@/lib/db";
import { getSessionUser, isOnboarded } from "@/lib/auth";
import { emitToUser } from "@/lib/realtime";
import { getPortfolio } from "@/lib/data";
import { packById, packAmounts } from "@/lib/shop";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Sign in to use the shop." }, { status: 401 });
  if (!isOnboarded(session)) {
    return NextResponse.json(
      { error: "Verify your identity before buying capital packs.", verify: true },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  const pack = packById(String(body?.packId ?? ""));
  if (!pack) return NextResponse.json({ error: "That pack is not in the shop." }, { status: 404 });

  const user = one<User>("SELECT * FROM users WHERE id = ?", session.id);
  if (!user) return NextResponse.json({ error: "Account not found." }, { status: 404 });
  if (user.credits < pack.credits) {
    return NextResponse.json(
      { error: `You need ${pack.credits - user.credits} more credits for ${pack.name}. Earn credits by passing quizzes.` },
      { status: 400 }
    );
  }

  const amounts = packAmounts(pack, user.start_capital);
  const ts = now();

  try {
    tx(() => {
      const deducted = run(
        "UPDATE users SET credits = credits - ?, cash = cash + ?, crypto_cash = crypto_cash + ? WHERE id = ? AND credits >= ?",
        pack.credits, amounts.cash, amounts.crypto, user.id, pack.credits
      );
      if (deducted.changes !== 1) throw new Error("insufficient");

      run(
        `INSERT INTO shop_purchases (user_id,pack_id,pack_name,credits,cash_added,crypto_added,created_at)
         VALUES (?,?,?,?,?,?,?)`,
        user.id, pack.id, pack.name, pack.credits, amounts.cash, amounts.crypto, ts
      );
      run(
        "INSERT INTO transactions (user_id,kind,amount,bucket,note,created_at) VALUES (?,?,?,?,?,?)",
        user.id, "shop_purchase", -pack.credits, "credits", `Bought ${pack.name} pack`, ts
      );
      run(
        "INSERT INTO transactions (user_id,kind,amount,bucket,note,created_at) VALUES (?,?,?,?,?,?)",
        user.id, "shop_topup", amounts.cash + amounts.crypto, "main", `Simulated capital from ${pack.name} pack`, ts
      );
      run(
        "INSERT INTO notifications (user_id,type,title,body,read,created_at) VALUES (?,?,?,?,0,?)",
        user.id, "reward", `${pack.name} pack added`,
        `${amounts.cash.toLocaleString()} simulated cash${amounts.crypto > 0 ? ` and ${amounts.crypto.toLocaleString()} sandbox cash` : ""} are ready to trade.`,
        ts
      );
    });
  } catch {
    return NextResponse.json({ error: "Not enough credits for that pack." }, { status: 400 });
  }

  const updated = one<User>("SELECT * FROM users WHERE id = ?", user.id)!;
  const portfolio = getPortfolio(updated);

  emitToUser(user.id, "credits:update", {
    credits: updated.credits, delta: -pack.credits, note: `${pack.name} pack`,
  });
  emitToUser(user.id, "portfolio:update", {
    total: portfolio.total, cash: portfolio.cash, cryptoCash: portfolio.cryptoCash,
    dayChange: portfolio.dayChange, dayPct: portfolio.dayPct, credits: updated.credits,
  });
  emitToUser(user.id, "notification", {
    id: 0, type: "reward", title: `${pack.name} pack added`,
    body: "Simulated capital has been added to your trading balance.", created_at: ts,
  });

  return NextResponse.json({
    ok: true,
    pack: { id: pack.id, name: pack.name, credits: pack.credits },
    added: amounts,
    credits: updated.credits,
    cash: updated.cash,
    cryptoCash: updated.crypto_cash,
    total: portfolio.total,
  });
}
