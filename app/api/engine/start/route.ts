import { NextResponse } from "next/server";
import { startEngine } from "@/lib/engine";

export async function POST(req: Request) {
  const key = req.headers.get("x-engine-key");
  const expected =
    process.env.AUTH_SECRET ||
    (process.env.NODE_ENV !== "production" ? "mtm_dev_8f3a91c47be25d0fa6c1e9b7348d52ac1f0e6b9d" : "");
  if (!expected || key !== expected) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const out = startEngine();
  return NextResponse.json({ ok: true, ...out });
}
