import { NextResponse } from "next/server";
import { z } from "zod";
import { one, run, now } from "@/lib/db";
import { emitToUser } from "@/lib/realtime";

const schema = z.object({
  token: z.string().min(10).max(120),
  decision: z.enum(["approved", "declined"]),
  note: z.string().max(400).optional(),
});

type Row = {
  id: number;
  user_id: number;
  guardian_email: string;
  status: string;
  name: string;
};

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid guardian decision." }, { status: 400 });

  const row = one<Row>(
    `SELECT g.id, g.user_id, g.guardian_email, g.status, u.name
     FROM guardian_requests g JOIN users u ON u.id = g.user_id
     WHERE g.token = ?`,
    parsed.data.token
  );
  if (!row) return NextResponse.json({ error: "This consent link is not valid." }, { status: 404 });
  if (row.status !== "pending") {
    return NextResponse.json({ error: "This consent request has already been decided." }, { status: 409 });
  }

  const { decision, note } = parsed.data;
  const ts = now();
  run("UPDATE guardian_requests SET status = ?, note = ?, decided_at = ? WHERE id = ?", decision, note ?? null, ts, row.id);
  run("UPDATE users SET guardian_status = ? WHERE id = ?", decision, row.user_id);

  run(
    "INSERT INTO notifications (user_id,type,title,body,read,created_at) VALUES (?,?,?,?,0,?)",
    row.user_id,
    decision === "approved" ? "success" : "danger",
    decision === "approved" ? "Guardian approval received" : "Guardian consent declined",
    decision === "approved"
      ? "Your guardian approved simulated trading access. Finish onboarding to enter the market."
      : `Your guardian declined simulated trading access.${note ? ` Note: ${note}` : ""}`,
    ts
  );

  emitToUser(row.user_id, "guardian:update", { status: decision });
  emitToUser(row.user_id, "notification", {
    id: Date.now(),
    type: decision === "approved" ? "success" : "danger",
    title: decision === "approved" ? "Guardian approval received" : "Guardian consent declined",
    body: decision === "approved" ? "Your guardian approved simulated trading access." : "Your guardian declined simulated trading access.",
    read: 0,
    created_at: ts,
  });

  return NextResponse.json({ ok: true, status: decision, student: row.name });
}
