import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { cancelSession, createSession } from "@/lib/sessions";

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    title: z.string().trim().min(3).max(140),
    speaker: z.string().trim().min(2).max(120),
    bio: z.string().trim().max(600).optional(),
    startsAt: z.string().trim().min(1),
    durationMins: z.number().int().min(15).max(240),
    joinUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
  }),
  z.object({ action: z.literal("cancel"), id: z.number().int().positive() }),
]);

/**
 * Admin scheduling for expert sessions. A session must have a real title,
 * speaker and start time; there is no way to publish a placeholder session.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  if (user.role !== "admin") {
    return NextResponse.json(
      { error: "Only an administrator can schedule expert sessions." },
      { status: 403 }
    );
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 }
    );
  }
  const data = parsed.data;

  if (data.action === "cancel") {
    const session = cancelSession(data.id);
    if (!session) {
      return NextResponse.json({ error: "That session no longer exists." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, session });
  }

  const startsAt = Date.parse(data.startsAt);
  if (!Number.isFinite(startsAt)) {
    return NextResponse.json({ error: "Enter a valid start date and time." }, { status: 400 });
  }
  if (startsAt <= Date.now()) {
    return NextResponse.json(
      { error: "The session must start in the future so learners can RSVP." },
      { status: 400 }
    );
  }

  const session = createSession(user.id, {
    title: data.title,
    speaker: data.speaker,
    speakerBio: data.bio ?? null,
    startsAt,
    durationMins: data.durationMins,
    joinUrl: data.joinUrl || null,
  });
  return NextResponse.json({ ok: true, session });
}
