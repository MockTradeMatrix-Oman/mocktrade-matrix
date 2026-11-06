/**
 * Guardian consent requests: one pending request per student, reused across
 * re-sends so the same private link keeps working until a decision is made.
 */

import { randomBytes } from "node:crypto";
import { one, run, now } from "@/lib/db";

export type GuardianRow = {
  id: number;
  token: string;
  guardian_email: string;
  status: string;
  created_at: number;
};

export function guardianPath(token: string) {
  return `/guardian/${token}`;
}

export function ageFromDob(dob: string | null) {
  if (!dob) return null;
  const born = new Date(dob);
  if (Number.isNaN(born.getTime())) return null;
  return Math.floor((Date.now() - born.getTime()) / (365.25 * 24 * 3600 * 1000));
}

/** Absolute URL for links inside email. Honours APP_URL behind proxies. */
export function absoluteFromRequest(req: Request, path: string) {
  const configured = process.env.APP_URL?.replace(/\/+$/, "");
  if (configured) return `${configured}${path}`;
  const url = new URL(req.url);
  const proto = req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host;
  return `${proto}://${host}${path}`;
}

export function createOrRefreshGuardianRequest(userId: number, guardianEmail: string) {
  const email = guardianEmail.toLowerCase();
  const pending = one<GuardianRow>(
    "SELECT id, token, guardian_email, status, created_at FROM guardian_requests WHERE user_id = ? AND status = 'pending' ORDER BY id DESC LIMIT 1",
    userId
  );

  let token = pending?.token;
  if (pending) {
    run("UPDATE guardian_requests SET guardian_email = ? WHERE id = ?", email, pending.id);
  } else {
    token = randomBytes(18).toString("base64url");
    run(
      "INSERT INTO guardian_requests (token,user_id,guardian_email,status,created_at) VALUES (?,?,?,'pending',?)",
      token, userId, email, now()
    );
  }

  run("UPDATE users SET guardian_email = ?, guardian_status = 'pending' WHERE id = ?", email, userId);
  return token!;
}
