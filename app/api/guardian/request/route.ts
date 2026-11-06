import { NextResponse } from "next/server";
import { z } from "zod";
import { one } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { mailConfigured, sendGuardianEmail } from "@/lib/mail";
import {
  absoluteFromRequest,
  ageFromDob,
  createOrRefreshGuardianRequest,
  guardianPath,
  type GuardianRow,
} from "@/lib/guardian";

const schema = z.object({
  guardianEmail: z.string().email("Enter a valid guardian email."),
});

// One email per account per minute; re-clicking "Resend" must not spam a parent.
const lastSent = ((globalThis as any).__mtm_guardian_mail ??= new Map<number, number>()) as Map<number, number>;

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
      ? { ...request, url: guardianPath(request.token) }
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
  if (guardianEmail === user.email.toLowerCase()) {
    return NextResponse.json({ error: "Use your parent or guardian's email, not your own." }, { status: 400 });
  }

  const token = createOrRefreshGuardianRequest(user.id, guardianEmail);

  // Send the real consent email. A mail failure never blocks creating the
  // request — the link is still returned so it can be copied by hand.
  const path = guardianPath(token);
  const since = Date.now() - (lastSent.get(user.id) ?? 0);
  let emailSent = false;
  let emailError: string | undefined;
  let throttled = false;

  if (since < 60_000) {
    throttled = true;
    emailError = "An email was sent less than a minute ago. Use the link below or try again shortly.";
  } else if (!mailConfigured()) {
    emailError = "Email sending is not configured on this server. Copy the link below instead.";
  } else {
    const result = await sendGuardianEmail({
      to: guardianEmail,
      studentName: user.name,
      studentEmail: user.email,
      age: ageFromDob(user.dob),
      region: user.region,
      approveUrl: absoluteFromRequest(req, path),
    });
    emailSent = result.sent;
    emailError = result.error;
    if (result.sent) lastSent.set(user.id, Date.now());
  }

  return NextResponse.json({
    ok: true,
    token,
    url: path,
    guardianEmail,
    emailSent,
    throttled,
    emailError,
  });
}
