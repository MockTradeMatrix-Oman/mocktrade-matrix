import { NextResponse } from "next/server";
import { z } from "zod";
import { one, run, now, type User } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { emitToUser } from "@/lib/realtime";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("grant"), email: z.string().trim().email() }),
  z.object({ action: z.literal("revoke"), email: z.string().trim().email() }),
  z.object({
    action: z.literal("resolve"),
    requestId: z.number().int().positive(),
    resolution: z.string().trim().max(600).optional(),
  }),
]);

function notify(userId: number, type: string, title: string, body: string) {
  const ts = now();
  run(
    "INSERT INTO notifications (user_id,type,title,body,read,created_at) VALUES (?,?,?,?,0,?)",
    userId, type, title, body, ts
  );
  emitToUser(userId, "notification", { id: ts, type, title, body, read: 0, created_at: ts });
}

export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Only an administrator can manage institution access." }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }
  const data = parsed.data;

  if (data.action === "grant" || data.action === "revoke") {
    const target = one<User>("SELECT * FROM users WHERE lower(email) = lower(?)", data.email);
    if (!target) {
      return NextResponse.json(
        { error: `No account uses ${data.email}. The learner must sign up first.` },
        { status: 404 }
      );
    }
    if (target.role === "admin") {
      return NextResponse.json({ error: "Admin accounts already have full access." }, { status: 400 });
    }

    if (data.action === "grant") {
      if (target.institution_access) {
        return NextResponse.json({ ok: true, already: true, name: target.name });
      }
      run(
        "UPDATE users SET institution_access = 1, institution_granted_at = ? WHERE id = ?",
        now(), target.id
      );
      notify(
        target.id,
        "success",
        "Institution access granted",
        "Your account now includes the Institution tab: classrooms, educator analytics, team competitions and priority support."
      );
      return NextResponse.json({ ok: true, already: false, name: target.name });
    }

    if (!target.institution_access) {
      return NextResponse.json({ ok: true, already: true, name: target.name });
    }
    run("UPDATE users SET institution_access = 0, institution_granted_at = NULL WHERE id = ?", target.id);
    notify(
      target.id,
      "info",
      "Institution access removed",
      "The Institution tab is no longer available on this account. Contact your administrator if this was unexpected."
    );
    return NextResponse.json({ ok: true, already: false, name: target.name });
  }

  if (data.action === "resolve") {
    const request = one<{ id: number; user_id: number; subject: string; status: string }>(
      "SELECT id, user_id, subject, status FROM support_requests WHERE id = ?",
      data.requestId
    );
    if (!request) return NextResponse.json({ error: "Support request not found." }, { status: 404 });
    if (request.status === "resolved") {
      return NextResponse.json({ ok: true, already: true });
    }
    const resolution = data.resolution?.trim() || "Resolved by the MockTrade team.";
    run(
      "UPDATE support_requests SET status = 'resolved', resolution = ?, resolved_at = ? WHERE id = ?",
      resolution, now(), request.id
    );
    notify(request.user_id, "success", `Support resolved: ${request.subject}`, resolution);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown admin action." }, { status: 400 });
}
