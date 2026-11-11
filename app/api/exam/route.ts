import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { startExam, submitExam } from "@/lib/exam";
import { notify } from "@/lib/trading";
import { emitToUser } from "@/lib/realtime";

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
      .max(40),
  }),
]);

/**
 * Starts or submits the final assessment. Eligibility and scoring both run on
 * the server; the answer key is never sent to the browser before submission.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }

  try {
    if (parsed.data.action === "start") {
      const result = startExam(user);
      return NextResponse.json({ ok: true, ...result });
    }

    const result = submitExam(user, parsed.data.attemptId, parsed.data.answers);
    if (result.passed) {
      notify(
        user.id,
        "success",
        "Completion Merit Certificate issued",
        `You passed the final assessment with ${result.percent}%. Open your certificate to print or download it.`
      );
      emitToUser(user.id, "certificate", { serial: result.certificate?.serial });
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The assessment could not be loaded.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
