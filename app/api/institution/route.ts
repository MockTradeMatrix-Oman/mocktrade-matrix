import { NextResponse } from "next/server";
import { z } from "zod";
import { all, one, run, now, DAY, type User } from "@/lib/db";
import { getSessionUser, hasInstitutionAccess } from "@/lib/auth";
import { emitToUser } from "@/lib/realtime";
import { getClassroomLeaderboard } from "@/lib/data";

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create-classroom"),
    name: z.string().trim().min(2).max(80),
  }),
  z.object({
    action: z.literal("add-member"),
    classroomId: z.number().int().positive(),
    email: z.string().trim().email(),
  }),
  z.object({
    action: z.literal("remove-member"),
    classroomId: z.number().int().positive(),
    userId: z.number().int().positive(),
  }),
  z.object({
    action: z.literal("create-competition"),
    classroomId: z.number().int().positive(),
    name: z.string().trim().min(2).max(80),
    days: z.number().int().min(1).max(30),
    teamA: z.array(z.number().int().positive()).max(200),
    teamB: z.array(z.number().int().positive()).max(200),
  }),
  z.object({
    action: z.literal("end-competition"),
    classroomId: z.number().int().positive(),
    competitionId: z.number().int().positive(),
  }),
  z.object({
    action: z.literal("create-support"),
    subject: z.string().trim().min(3).max(120),
    body: z.string().trim().min(10).max(2000),
    classroomId: z.number().int().positive().optional(),
  }),
]);

function randomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

function uniqueCode() {
  for (let i = 0; i < 12; i++) {
    const code = randomCode();
    if (!one<{ id: number }>("SELECT id FROM classrooms WHERE code = ?", code)) return code;
  }
  return `C${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

function ownedRoom(userId: number, classroomId: number) {
  return one<{ id: number; name: string; code: string }>(
    "SELECT id, name, code FROM classrooms WHERE id = ? AND owner_id = ?",
    classroomId,
    userId
  );
}

function notify(userId: number, type: string, title: string, body: string) {
  const ts = now();
  run(
    "INSERT INTO notifications (user_id,type,title,body,read,created_at) VALUES (?,?,?,?,0,?)",
    userId, type, title, body, ts
  );
  emitToUser(userId, "notification", {
    id: ts, type, title, body, read: 0, created_at: ts,
  });
}

export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  if (!hasInstitutionAccess(session)) {
    return NextResponse.json({ error: "Institution access has not been granted on this account." }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }
  const data = parsed.data;

  if (data.action === "create-classroom") {
    const code = uniqueCode();
    const res = run(
      "INSERT INTO classrooms (name,owner_id,code,created_at) VALUES (?,?,?,?)",
      data.name, session.id, code, now()
    );
    run(
      "INSERT OR IGNORE INTO classroom_members (classroom_id,user_id,role,joined_at) VALUES (?,?,?,?)",
      res.lastId, session.id, "educator", now()
    );
    return NextResponse.json({ ok: true, id: res.lastId, code });
  }

  if (data.action === "add-member") {
    const room = ownedRoom(session.id, data.classroomId);
    if (!room) return NextResponse.json({ error: "Classroom not found." }, { status: 404 });

    const target = one<User>("SELECT * FROM users WHERE lower(email) = lower(?)", data.email);
    if (!target) {
      return NextResponse.json({ error: `No account uses ${data.email} yet.` }, { status: 404 });
    }
    if (target.role === "admin") {
      return NextResponse.json({ error: "Admin accounts cannot be added to a classroom." }, { status: 400 });
    }
    const existing = one<{ user_id: number }>(
      "SELECT user_id FROM classroom_members WHERE classroom_id = ? AND user_id = ?",
      room.id, target.id
    );
    if (existing) {
      return NextResponse.json({ error: `${target.name} is already in this classroom.` }, { status: 409 });
    }
    run(
      "INSERT INTO classroom_members (classroom_id,user_id,role,joined_at) VALUES (?,?,?,?)",
      room.id, target.id, "member", now()
    );
    notify(
      target.id,
      "social",
      `Added to ${room.name}`,
      `You were added to a classroom. Open Settings to see the class or use code ${room.code}.`
    );
    return NextResponse.json({ ok: true, member: { id: target.id, name: target.name, email: target.email } });
  }

  if (data.action === "remove-member") {
    const room = ownedRoom(session.id, data.classroomId);
    if (!room) return NextResponse.json({ error: "Classroom not found." }, { status: 404 });
    if (data.userId === session.id) {
      return NextResponse.json({ error: "The classroom owner cannot be removed." }, { status: 400 });
    }
    const target = one<User>("SELECT * FROM users WHERE id = ?", data.userId);
    const res = run(
      "DELETE FROM classroom_members WHERE classroom_id = ? AND user_id = ?",
      room.id, data.userId
    );
    if (res.changes === 0) return NextResponse.json({ error: "That learner is not in this classroom." }, { status: 404 });
    if (target) notify(target.id, "info", `Removed from ${room.name}`, "Your educator removed you from the classroom.");
    return NextResponse.json({ ok: true });
  }

  if (data.action === "create-competition") {
    const room = ownedRoom(session.id, data.classroomId);
    if (!room) return NextResponse.json({ error: "Classroom not found." }, { status: 404 });

    const members = all<{ user_id: number }>(
      "SELECT user_id FROM classroom_members WHERE classroom_id = ?",
      room.id
    );
    const memberIds = new Set(members.map((m) => m.user_id));
    const overlap = data.teamA.filter((id) => data.teamB.includes(id));
    if (overlap.length > 0) {
      return NextResponse.json({ error: "A learner can only be on one team." }, { status: 400 });
    }
    if (data.teamA.length === 0 || data.teamB.length === 0) {
      return NextResponse.json({ error: "Pick at least one learner for each team." }, { status: 400 });
    }
    if ([...data.teamA, ...data.teamB].some((id) => !memberIds.has(id))) {
      return NextResponse.json({ error: "Every team member must belong to this classroom." }, { status: 400 });
    }

    const live = new Map(getClassroomLeaderboard(room.id).map((r) => [r.id, r.total]));
    const snapshot: Record<string, number> = {};
    for (const id of [...data.teamA, ...data.teamB]) snapshot[String(id)] = live.get(id) ?? 0;

    const ts = now();
    const res = run(
      `INSERT INTO classroom_competitions
        (classroom_id,name,created_by,starts_at,ends_at,status,teams,snapshot,created_at)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      room.id, data.name, session.id, ts, ts + data.days * DAY, "active",
      JSON.stringify({ A: data.teamA, B: data.teamB }), JSON.stringify(snapshot), ts
    );
    return NextResponse.json({ ok: true, id: res.lastId });
  }

  if (data.action === "end-competition") {
    const room = ownedRoom(session.id, data.classroomId);
    if (!room) return NextResponse.json({ error: "Classroom not found." }, { status: 404 });
    const competition = one<{ id: number }>(
      "SELECT id FROM classroom_competitions WHERE id = ? AND classroom_id = ?",
      data.competitionId, room.id
    );
    if (!competition) return NextResponse.json({ error: "Competition not found." }, { status: 404 });
    run("UPDATE classroom_competitions SET status = 'completed' WHERE id = ?", competition.id);
    return NextResponse.json({ ok: true });
  }

  if (data.action === "create-support") {
    const ts = now();
    const res = run(
      `INSERT INTO support_requests (user_id,classroom_id,subject,body,status,created_at)
       VALUES (?,?,?,?,?,?)`,
      session.id, data.classroomId ?? null, data.subject, data.body, "open", ts
    );
    const admins = all<{ id: number }>("SELECT id FROM users WHERE role = 'admin'");
    for (const admin of admins) {
      notify(
        admin.id,
        "warning",
        `Priority support: ${data.subject}`,
        `${session.name} (${session.email}) opened a priority support request.`
      );
    }
    return NextResponse.json({ ok: true, id: res.lastId });
  }

  return NextResponse.json({ error: "Unknown institution action." }, { status: 400 });
}
