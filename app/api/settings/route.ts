import { NextResponse } from "next/server";
import { z } from "zod";
import { run, one, type User } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { FX_INR } from "@/lib/finance";
import { isArenaRegion } from "@/lib/regions";

const schema = z.object({
  name: z.string().min(2).max(60).optional(),
  mode: z.enum(["student", "beginner", "aspiring", "programmer", "experienced", "institution"]).optional(),
  region: z.enum(["IN", "US"]).optional(),
  arenaRegion: z.string().refine(isArenaRegion, "Unknown region.").optional(),
  accent: z.enum(["emerald", "violet", "cyan", "amber"]).optional(),
});

export async function PATCH(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid settings." }, { status: 400 });
  const { name, mode, region, arenaRegion, accent } = parsed.data;

  if (region && region !== session.region) {
    const factor = region === "IN" ? FX_INR : 1 / FX_INR;
    run(
      `UPDATE users SET region = ?, cash = cash * ?, crypto_cash = crypto_cash * ?, start_capital = start_capital * ? WHERE id = ?`,
      region, factor, factor, factor, session.id
    );
  }
  if (arenaRegion) run("UPDATE users SET arena_region = ? WHERE id = ?", arenaRegion, session.id);
  if (name) run("UPDATE users SET name = ? WHERE id = ?", name, session.id);
  if (mode) run("UPDATE users SET mode = ? WHERE id = ?", mode, session.id);
  if (accent) run("UPDATE users SET accent = ? WHERE id = ?", accent, session.id);

  const user = one<User>("SELECT * FROM users WHERE id = ?", session.id)!;
  return NextResponse.json({
    ok: true,
    user: {
      name: user.name, mode: user.mode, region: user.region, arenaRegion: user.arena_region, accent: user.accent,
      cash: user.cash, crypto_cash: user.crypto_cash, credits: user.credits,
    },
  });
}
