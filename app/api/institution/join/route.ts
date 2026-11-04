import { NextResponse } from "next/server";
import { z } from "zod";
import { one, run, now } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { emitToUser } from "@/lib/realtime";

const schema = z.object({ code: z.string().trim().min(4).max(12) });

export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter the classroom code." }, { status: 400 });

  const code = parsed.data.code.toUpperCase();
  const room = one<{ id: number; name: string; code: string; owner_id: number }>(
    "SELECT id, name, code, owner_id FROM classrooms WHERE upper(code) = upper(?)",
    code
  );
  if (!room) return NextResponse.json({ error: "No classroom uses that code." }, { status: 404 });
  if (session.role === "admin") {
    return NextResponse.json({ error: "Admin accounts cannot join a classroom." }, { status: 400 });
  }

  const existing = one<{ user_id: number }>(
    "SELECT user_id FROM classroom_members WHERE classroom_id = ? AND user_id = ?",
    room.id, session.id
  );
  if (existing) {
    return NextResponse.json({ ok: true, classroom: room, already: true });
  }

  run(
    "INSERT INTO classroom_members (classroom_id,user_id,role,joined_at) VALUES (?,?,?,?)",
    room.id, session.id, "member", now()
  );

  const ts = now();
  run(
    "INSERT INTO notifications (user_id,type,title,body,read,created_at) VALUES (?,?,?,?,0,?)",
    room.owner_id,
    "social",
    `${session.name} joined ${room.name}`,
    `${session.email} joined using the classroom code.`,
    ts
  );
  emitToUser(room.owner_id, "notification", {
    id: ts, type: "social", title: `${session.name} joined ${room.name}`,
    body: `${session.email} joined using the classroom code.`, read: 0, created_at: ts,
  });

  return NextResponse.json({ ok: true, classroom: room, already: false });
}
