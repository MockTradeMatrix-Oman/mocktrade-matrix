import { NextResponse } from "next/server";
import { all } from "@/lib/db";

export const dynamic = "force-dynamic";

/* Public, read-only price tape for the marketing page. No account needed. */
export async function GET() {
  const rows = all<{ symbol: string; price: number; prev_close: number }>(
    "SELECT symbol, price, prev_close FROM assets"
  );
  return NextResponse.json({ t: Date.now(), assets: rows });
}
