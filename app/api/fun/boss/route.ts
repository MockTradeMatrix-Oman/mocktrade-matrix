import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { isPremium } from "@/lib/plans";
import { bossStatus, startBoss, submitBoss } from "@/lib/fun/bosses";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  return NextResponse.json({ ...bossStatus(user), premium: isPremium(user) });
}

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start") }),
  z.object({
    action: z.literal("submit"),
    attemptId: z.number().int().positive(),
    answers: z
      .array(
        z.object({
          id: z.number().int().positive(),
          choice: z.number().int().min(0).max(9),
        })
      )
      .max(20),
  }),
]);

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  if (!isPremium(user)) {
    return NextResponse.json(
      { error: "Boss battles are included with Premium.", premium: true },
      { status: 403 }
    );
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid boss request." }, { status: 400 });
  }

  try {
    if (parsed.data.action === "start") {
      const result = startBoss(user);
      return NextResponse.json({ ok: true, ...result });
    }
    const result = submitBoss(user, parsed.data.attemptId, parsed.data.answers);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Boss battle failed." },
      { status: 400 }
    );
  }
}
