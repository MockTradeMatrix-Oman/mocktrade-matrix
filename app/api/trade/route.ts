import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, isOnboarded } from "@/lib/auth";
import { executeOrder } from "@/lib/trading";
import { one, type Asset } from "@/lib/db";
import { toLocal } from "@/lib/finance";

const schema = z.object({
  symbol: z.string().min(1).max(20),
  side: z.enum(["BUY", "SELL"]),
  qty: z.number().positive().max(1_000_000),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in to trade." }, { status: 401 });
  if (!isOnboarded(user)) {
    return NextResponse.json(
      { error: "Verify your identity before placing orders.", verify: true },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid quantity." }, { status: 400 });

  const result = executeOrder({
    userId: user.id,
    symbol: parsed.data.symbol,
    side: parsed.data.side,
    qty: parsed.data.qty,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  const asset = one<Asset>("SELECT * FROM assets WHERE symbol = ?", parsed.data.symbol)!;
  return NextResponse.json({
    ok: true,
    message: result.message,
    order: result.order,
    executedLocal: result.order.executed_price,
    priceLocal: toLocal(asset.price, user.region),
    portfolio: {
      total: result.portfolio.total, cash: result.portfolio.cash,
      cryptoCash: result.portfolio.cryptoCash, dayChange: result.portfolio.dayChange,
      dayPct: result.portfolio.dayPct,
    },
  });
}
