import { NextResponse } from "next/server";
import { one, run, type User } from "@/lib/db";
import { getSessionUser, isOnboarded } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { action } = body as { action?: string };

  // Identity is only ever granted by POST /api/verify/document after a real
  // document check. There is deliberately no client-callable shortcut.
  if (action === "terms") {
    // Every statement must be an explicit "yes" and the account holder must
    // type YES. The client enforces it, and so does the server.
    const required = ["simulation", "risk", "data", "age"] as const;
    const agreements = (body as { agreements?: Record<string, unknown> }).agreements ?? {};
    const accepted = required.every((key) => agreements[key] === "yes");
    const confirmed = String((body as { confirmation?: unknown }).confirmation ?? "").trim().toUpperCase() === "YES";
    if (!accepted || !confirmed) {
      return NextResponse.json(
        { error: "All four statements must be accepted and confirmed by typing YES." },
        { status: 400 }
      );
    }

    run("UPDATE users SET terms_accepted = 1 WHERE id = ?", session.id);
    run(
      "INSERT INTO activity (user_id, type, text, created_at) VALUES (?, 'consent', ?, ?)",
      session.id,
      "Signed simulation, risk, privacy and age agreements (typed YES)",
      Date.now()
    );
  } else {
    return NextResponse.json({ error: "Unknown verification step." }, { status: 400 });
  }

  const user = one<User>("SELECT * FROM users WHERE id = ?", session.id)!;
  return NextResponse.json({
    ok: true,
    onboarded: isOnboarded(user),
    user: {
      id: user.id, id_verified: user.id_verified, guardian_status: user.guardian_status,
      terms_accepted: user.terms_accepted,
    },
  });
}
