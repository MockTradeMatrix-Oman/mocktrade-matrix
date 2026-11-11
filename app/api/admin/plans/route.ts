import { NextResponse } from "next/server";
import { z } from "zod";
import { one, run, now, DAY, type User } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { notify } from "@/lib/trading";
import { emitToUser } from "@/lib/realtime";

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("grant"),
    email: z.string().trim().email(),
    days: z.union([z.literal(30), z.literal(90), z.literal(365)]),
  }),
  z.object({ action: z.literal("revoke"), email: z.string().trim().email() }),
]);

export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Only an administrator can manage plans." }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }
  const data = parsed.data;

  const target = one<User>("SELECT * FROM users WHERE lower(email) = lower(?)", data.email);
  if (!target) {
    return NextResponse.json(
      { error: `No account uses ${data.email}. The learner must sign up first.` },
      { status: 404 }
    );
  }
  if (target.role === "admin") {
    return NextResponse.json({ error: "Admin accounts already include every plan." }, { status: 400 });
  }

  const ts = now();

  if (data.action === "grant") {
    const until = Math.max(ts, Number(target.premium_until ?? 0)) + data.days * DAY;
    run(
      `UPDATE users
          SET plan = 'premium',
              plan_since = COALESCE(plan_since, ?),
              premium_until = ?,
              premium_source = 'admin'
        WHERE id = ?`,
      ts, until, target.id
    );
    notify(
      target.id,
      "success",
      "Premium granted",
      `${data.days} days of Premium are now active: every module unlocked, full analytics and the final exam.`
    );
    emitToUser(target.id, "plan:update", {
      plan: "premium",
      premiumUntil: until,
      premium: true,
    });
    return NextResponse.json({ ok: true, name: target.name, until, days: data.days });
  }

  run(
    "UPDATE users SET plan = 'free', premium_until = NULL, premium_source = NULL WHERE id = ?",
    target.id
  );
  notify(
    target.id,
    "info",
    "Premium changed",
    target.institution_access
      ? "The credit subscription was cleared. Institution access still includes Premium features."
      : "The Premium subscription is no longer active. Your progress and unlocked modules are unchanged."
  );
  emitToUser(target.id, "plan:update", {
    plan: "free",
    premiumUntil: null,
    premium: Boolean(target.institution_access),
  });
  return NextResponse.json({ ok: true, name: target.name });
}
