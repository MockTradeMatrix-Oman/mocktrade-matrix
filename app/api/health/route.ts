import { NextResponse } from "next/server";
import { one } from "@/lib/db";
import { engineStatus } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const row = one<{ ok: number }>("SELECT 1 AS ok");
    if (!row || Number(row.ok) !== 1) throw new Error("database check failed");
    return NextResponse.json(
      {
        ok: true,
        db: "ok",
        engine: engineStatus(),
        uptime: Math.round(process.uptime()),
      },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        db: "error",
        error: err instanceof Error ? err.message : "unknown error",
      },
      { status: 503, headers: { "cache-control": "no-store" } }
    );
  }
}
