import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { all, one, type Asset } from "@/lib/db";
import { getIntraday } from "@/lib/engine";
import { toLocal } from "@/lib/finance";

export async function GET(req: Request) {
  const user = await getSessionUser();
  const region = user?.region ?? "IN";
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol") ?? "RELIANCE";
  const range = searchParams.get("range") ?? "1D";

  const asset = one<Asset>("SELECT * FROM assets WHERE symbol = ?", symbol);
  if (!asset) return NextResponse.json({ error: "Unknown instrument" }, { status: 404 });

  if (range === "1D") {
    const points = getIntraday(symbol).map((p) => ({ t: Math.floor(p.t / 1000), v: toLocal(p.p, region) }));
    return NextResponse.json({ symbol, range, region, points, price: toLocal(asset.price, region) });
  }

  const days = range === "1W" ? 7 : range === "1M" ? 30 : range === "1Y" ? 220 : 180;
  const rows = all<{ t: number; c: number }>(
    "SELECT t, c FROM candles WHERE symbol = ? ORDER BY t DESC LIMIT ?",
    symbol, days
  ).reverse();
  const points = rows.map((r) => ({ t: r.t, v: toLocal(r.c, region) }));
  return NextResponse.json({ symbol, range, region, points, price: toLocal(asset.price, region) });
}
