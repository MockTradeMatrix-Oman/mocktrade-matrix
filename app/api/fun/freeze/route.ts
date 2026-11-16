import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { buyStreakFreeze, freezeStatus } from "@/lib/fun/streak-freeze";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  return NextResponse.json({ ...freezeStatus(user.id), streak: user.streak });
}

export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });

  try {
    const result = buyStreakFreeze(user.id);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not buy a streak freeze." },
      { status: 400 }
    );
  }
}
