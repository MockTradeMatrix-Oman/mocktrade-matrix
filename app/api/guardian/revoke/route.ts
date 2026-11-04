import { NextResponse } from "next/server";
import { one, run, now } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

type Row = { id: number; status: string };

/**
 * Withdraw a guardian's approval from the student's own account.
 * The account immediately drops back to "declined", which locks trading until
 * a guardian approves a fresh consent link from /verify.
 */
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });

  if (!["approved", "pending"].includes(user.guardian_status)) {
    return NextResponse.json({ error: "There is no active guardian consent to revoke." }, { status: 409 });
  }

  const ts = now();
  const latest = one<Row>(
    "SELECT id, status FROM guardian_requests WHERE user_id = ? ORDER BY id DESC LIMIT 1",
    user.id
  );

  if (latest) {
    run(
      "UPDATE guardian_requests SET status = 'declined', note = ?, decided_at = ? WHERE id = ?",
      "Consent withdrawn by the student.",
      ts,
      latest.id
    );
  } else {
    run(
      "INSERT INTO guardian_requests (token,user_id,guardian_email,status,note,created_at,decided_at) VALUES (?,?,?,'declined',?,?,?)",
      `revoked-${user.id}-${ts}`,
      user.id,
      user.guardian_email ?? "unknown",
      "Consent withdrawn by the student.",
      ts,
      ts
    );
  }

  run("UPDATE users SET guardian_status = 'declined' WHERE id = ?", user.id);

  run(
    "INSERT INTO notifications (user_id,type,title,body,read,created_at) VALUES (?,?,?,?,0,?)",
    user.id,
    "warning",
    "Guardian consent withdrawn",
    "Trading access is locked. Send a new consent link from the verification page when you are ready.",
    ts
  );

  return NextResponse.json({ ok: true, guardianStatus: "declined" });
}
