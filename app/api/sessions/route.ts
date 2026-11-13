import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { isPremium } from "@/lib/plans";
import { setRsvp } from "@/lib/sessions";

const schema = z.object({
  action: z.enum(["rsvp", "cancel"]),
  sessionId: z.number().int().positive(),
});

/**
 * RSVP for a scheduled expert session. Expert sessions are a Premium feature;
 * Institution access includes Premium, so the same check covers both.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  if (!isPremium(user)) {
    return NextResponse.json(
      { error: "Expert sessions are included with Premium." },
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

  try {
    const attendees = setRsvp(user.id, parsed.data.sessionId, parsed.data.action === "rsvp");
    return NextResponse.json({
      ok: true,
      attending: parsed.data.action === "rsvp",
      attendees,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The RSVP could not be saved.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
