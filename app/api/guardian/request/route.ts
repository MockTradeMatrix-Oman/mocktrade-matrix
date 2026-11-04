import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { one, run, now } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

const schema = z.object({
  guardianEmail: z.string().email("Enter a valid guardian email."),
});

type GuardianRow = {
  id: number;
  token: string;
  guardian_email: string;
  status: string;
  created_at: number;
};

function linkFor(token: string) {
  return `/guardian/${token}`;
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });

  const request = one<GuardianRow>(
    "SELECT id, token, guardian_email, status, created_at FROM guardian_requests WHERE user_id = ? ORDER BY id DESC LIMIT 1",
    user.id
  );

  return NextResponse.json({
    ok: true,
    guardianStatus: user.guardian_status,
    request: request
      ? { ...request, url: linkFor(request.token) }
      : null,
  });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Enter a valid guardian email." }, { status: 400 });
  }
  const guardianEmail = parsed.data.guardianEmail.toLowerCase();

  const pending = one<GuardianRow>(
    "SELECT id, token, guardian_email, status, created_at FROM guardian_requests WHERE user_id = ? AND status = 'pending' ORDER BY id DESC LIMIT 1",
    user.id
  );

  let token = pending?.token;
  if (pending) {
    run("UPDATE guardian_requests SET guardian_email = ? WHERE id = ?", guardianEmail, pending.id);
  } else {
    token = randomBytes(18).toString("base64url");
    run(
      "INSERT INTO guardian_requests (token,user_id,guardian_email,status,created_at) VALUES (?,?,?,'pending',?)",
      token, user.id, guardianEmail, now()
    );
  }

  run("UPDATE users SET guardian_email = ?, guardian_status = 'pending' WHERE id = ?", guardianEmail, user.id);

  return NextResponse.json({
    ok: true,
    token,
    url: linkFor(token!),
    guardianEmail,
  });
}
