import { NextResponse } from "next/server";
import { one, run, type User } from "@/lib/db";
import { getSessionUser, isOnboarded } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const { action } = await req.json().catch(() => ({}));

  // Identity is only ever granted by POST /api/verify/document after a real
  // document check. There is deliberately no client-callable shortcut.
  if (action === "terms") {
    run("UPDATE users SET terms_accepted = 1 WHERE id = ?", session.id);
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
