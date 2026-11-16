import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { isPremium } from "@/lib/plans";
import { lightningSummary, startLightning, submitLightning } from "@/lib/fun/lightning";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  return NextResponse.json({ ...lightningSummary(user.id), premium: isPremium(user) });
}

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start") }),
  z.object({
    action: z.literal("submit"),
    runId: z.number().int().positive(),
    answers: z
      .array(
        z.object({
          id: z.number().int().positive(),
          choice: z.number().int().min(0).max(9),
        })
      )
      .max(20),
    bestCombo: z.number().int().min(0).max(20).optional(),
  }),
]);

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  if (!isPremium(user)) {
    return NextResponse.json(
      { error: "Lightning Round is included with Premium.", premium: true },
      { status: 403 }
    );
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid Lightning Round request." }, { status: 400 });
  }

  try {
    if (parsed.data.action === "start") {
      const result = startLightning(user.id, user.region);
      return NextResponse.json({ ok: true, ...result });
    }
    const result = submitLightning(
      user.id,
      user.region,
      parsed.data.runId,
      parsed.data.answers,
      parsed.data.bestCombo ?? 0
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Lightning Round failed." },
      { status: 400 }
    );
  }
}
