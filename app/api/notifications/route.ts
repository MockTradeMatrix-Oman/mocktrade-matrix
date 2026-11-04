import { NextResponse } from "next/server";
import { run, now } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = (await req.json().catch(() => ({}))) as { id?: number };
  if (id) run("UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?", Number(id), user.id);
  else run("UPDATE notifications SET read = 1 WHERE user_id = ?", user.id);
  return NextResponse.json({ ok: true, at: now() });
}
