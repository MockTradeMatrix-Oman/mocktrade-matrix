import { NextResponse } from "next/server";
import { z } from "zod";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { all, one, run, now, tx, ADMIN_EMAIL, type User } from "@/lib/db";
import { hashPassword, setSession } from "@/lib/auth";
import { initials, MODES } from "@/lib/finance";
import crypto from "node:crypto";
import { mailConfigured, sendGuardianEmail } from "@/lib/mail";
import { absoluteFromRequest, createOrRefreshGuardianRequest, guardianPath } from "@/lib/guardian";

export const runtime = "nodejs";

/**
 * Google sign-in via Firebase.
 *
 * The browser gets a Firebase ID token from the Google popup. We verify that
 * JWT here against Google's public keys (no service account needed), then mint
 * our own browser-session cookie. Firebase is never trusted for authorisation
 * beyond the verified email — KYC, admin role and capital stay server-side.
 */
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "matrix-cf52e";
const ISSUER = `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`;

const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);

const schema = z.object({
  idToken: z.string().min(20),
  intent: z.enum(["login", "signup"]).default("login"),
  termsAccepted: z.boolean().default(false),
  profile: z
    .object({
      name: z.string().trim().max(60).optional(),
      mode: z.string().trim().max(30).optional(),
      region: z.enum(["IN", "US"]).optional(),
      dob: z.string().trim().max(20).optional(),
      guardianEmail: z.string().trim().email().max(120).optional().or(z.literal("")),
    })
    .optional(),
});

type FirebasePayload = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
};

function ageFrom(dob?: string) {
  if (!dob) return 30;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return 30;
  return (Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000);
}

function cleanName(value: string | undefined, email: string) {
  const raw = (value ?? "").replace(/[^\p{L}\p{N} .'-]/gu, " ").replace(/\s+/g, " ").trim();
  if (raw.length >= 2) return raw.slice(0, 60);
  const local = email.split("@")[0].replace(/[._-]+/g, " ").trim();
  return (local.length >= 2 ? local : "New learner").slice(0, 60);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Google sign-in request was incomplete." }, { status: 400 });

  let payload: FirebasePayload;
  try {
    const verified = await jwtVerify(parsed.data.idToken, JWKS, {
      issuer: ISSUER,
      audience: FIREBASE_PROJECT_ID,
    });
    payload = verified.payload as FirebasePayload;
  } catch {
    return NextResponse.json(
      { error: "That Google token could not be verified. Try signing in again." },
      { status: 401 }
    );
  }

  const email = String(payload.email ?? "").toLowerCase().trim();
  if (!email || payload.email_verified !== true || !payload.sub) {
    return NextResponse.json(
      { error: "Google did not share a verified email address for this account." },
      { status: 401 }
    );
  }

  const existing = one<User>("SELECT * FROM users WHERE lower(email) = lower(?)", email);

  if (existing) {
    // The admin console is password-only by design.
    if (existing.role === "admin" || email === ADMIN_EMAIL.toLowerCase()) {
      return NextResponse.json(
        { error: "The admin console requires the administrator password, not Google sign-in." },
        { status: 403 }
      );
    }
    run("UPDATE users SET last_seen = ? WHERE id = ?", now(), existing.id);
    await setSession(existing.id);
    return NextResponse.json({ ok: true, redirect: "/dashboard", name: existing.name, created: false });
  }

  // Signing in with Google from the login page creates the account on first
  // use (same defaults as password signup). The signup page additionally
  // requires the terms checkbox, so it sends termsAccepted=true.
  if (parsed.data.intent === "signup" && !parsed.data.termsAccepted) {
    return NextResponse.json({ error: "Accept the simulation terms to continue with Google." }, { status: 400 });
  }

  const profile = parsed.data.profile ?? {};
  const name = cleanName(profile.name || payload.name, email);
  const mode = MODES.some((m) => m.id === profile.mode) ? profile.mode! : "student";
  const region = profile.region === "US" ? "US" : "IN";
  const dob = profile.dob && !Number.isNaN(new Date(profile.dob).getTime()) ? profile.dob : undefined;
  const guardianEmail = profile.guardianEmail || "";
  const minor = ageFrom(dob) < 18;
  if (minor && !guardianEmail) {
    return NextResponse.json(
      { error: "A guardian email is required for learners under 18." },
      { status: 400 }
    );
  }

  // Google accounts have no local password. Store an unguessable hash so the
  // password form cannot ever be used to enter this account.
  const password_hash = await hashPassword(crypto.randomUUID());
  const ts = now();
  const cash = region === "IN" ? 100_000 : 10_000;
  const cryptoCash = region === "IN" ? 15_000 : 1_500;
  const modules = all<{ id: number }>("SELECT id FROM modules WHERE is_published = 1 ORDER BY order_index");

  const uid = tx(() => {
    const r = run(
      `INSERT INTO users (email,password_hash,name,mode,region,avatar,credits,cash,crypto_cash,start_capital,xp,streak,
        id_verified,guardian_status,guardian_email,terms_accepted,crash_done,accent,dob,created_at,last_seen)
       VALUES (?,?,?,?,?,?,100,?,?,?,0,1,0,?,?,1,0,'emerald',?,?,?)`,
      email, password_hash, name, mode, region, initials(name),
      cash, cryptoCash, cash, minor ? "pending" : "not_required", minor ? guardianEmail : null,
      dob || null, ts, ts
    );
    const id = r.lastId;
    modules.forEach((m, i) => {
      run("INSERT INTO module_progress (user_id,module_id,status,score,completed_at) VALUES (?,?,?,?,?)",
        id, m.id, i === 0 ? "unlocked" : "locked", 0, null);
    });
    run("INSERT INTO notifications (user_id,type,title,body,read,created_at) VALUES (?,?,?,?,0,?)",
      id, "success", "Welcome to MockTrade Matrix",
      "Your account is ready. Verify your ID whenever you want to start trading.", ts);
    return id;
  });

  // Under-18 accounts trigger a real consent email to the guardian immediately.
  let guardianEmailSent = false;
  if (minor && guardianEmail) {
    try {
      const token = createOrRefreshGuardianRequest(uid, guardianEmail);
      if (mailConfigured()) {
        const sent = await sendGuardianEmail({
          to: guardianEmail,
          studentName: name,
          studentEmail: email,
          age: ageFrom(dob),
          region,
          approveUrl: absoluteFromRequest(req, guardianPath(token)),
        });
        guardianEmailSent = sent.sent;
      }
    } catch {
      // Never fail account creation because mail is unavailable.
    }
  }

  await setSession(uid);
  return NextResponse.json({ ok: true, redirect: "/dashboard", name, created: true, guardianEmailSent });
}
