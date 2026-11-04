import { NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { one, run, now, tx, type User } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { DOC_TYPES, verifyDocumentText, maskName, type DocType } from "@/lib/kyc";
import { emitToUser } from "@/lib/realtime";

export const runtime = "nodejs";
export const maxDuration = 60;

const execFileAsync = promisify(execFile);

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXT = [".jpg", ".jpeg", ".png", ".webp", ".bmp"];
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/bmp", "image/x-ms-bmp"];

const rate = ((globalThis as any).__mtm_doc_attempts ??= new Map<number, number[]>()) as Map<number, number[]>;

function limited(userId: number) {
  const cutoff = Date.now() - 10 * 60_000;
  const hits = (rate.get(userId) ?? []).filter((t) => t > cutoff);
  hits.push(Date.now());
  rate.set(userId, hits);
  return hits.length > 8;
}

function failure(status: number, error: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: false, error, ...extra }, { status });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return failure(401, "Sign in to verify your identity.");
  if (user.id_verified) {
    return NextResponse.json({
      ok: true,
      already: true,
      name: maskName(user.verified_name),
      address: user.verified_address,
    });
  }
  if (limited(user.id)) {
    return failure(429, "Too many attempts. Wait a few minutes before trying again.");
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return failure(400, "Upload a document image to continue.");
  }

  const file = form.get("file");
  const docType = String(form.get("docType") ?? "") as DocType;
  if (!(file instanceof File)) return failure(400, "No document image was received.");
  if (!DOC_TYPES.some((d) => d.id === docType)) return failure(400, "Choose a valid document type.");
  if (file.size < 4_000) return failure(422, "That image is too small to read. Try a full-resolution photo.");
  if (file.size > MAX_BYTES) return failure(413, "That image is larger than 10 MB. Use a smaller photo.");

  const ext = path.extname(file.name || "").toLowerCase();
  if (!ALLOWED_TYPES.includes(file.type) && !ALLOWED_EXT.includes(ext)) {
    return failure(415, "Upload a JPG, PNG, WEBP or BMP image of your document.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const hash = crypto.createHash("sha256").update(buffer).digest("hex");

  // A verified document may belong to exactly one account.
  const duplicate = one<{ user_id: number }>(
    "SELECT user_id FROM id_documents WHERE doc_hash = ? AND status = 'approved' AND user_id <> ? LIMIT 1",
    hash, user.id
  );
  if (duplicate) {
    return failure(409, "This document is already linked to another account. Use your own document.");
  }

  const tmpDir = path.join(process.cwd(), "data", "tmp");
  fs.mkdirSync(tmpDir, { recursive: true });
  const tmpFile = path.join(tmpDir, `doc-${user.id}-${crypto.randomUUID()}${ext || ".jpg"}`);

  let text = "";
  let confidence = 0;
  try {
    fs.writeFileSync(tmpFile, buffer);
    const script = path.join(process.cwd(), "scripts", "ocr.mjs");
    if (!fs.existsSync(script)) return failure(500, "The document reader is not installed on this server.");

    const { stdout } = await execFileAsync(process.execPath, [script, tmpFile], {
      cwd: process.cwd(),
      timeout: 45_000,
      maxBuffer: 4 * 1024 * 1024,
      windowsHide: true,
    });

    const parsed = JSON.parse(String(stdout).trim() || "{}") as { text?: string; confidence?: number; error?: string };
    if (parsed.error || typeof parsed.text !== "string") {
      return failure(422, "We could not read that image. Use a brighter, flatter photo with the whole card in frame.");
    }
    text = parsed.text;
    confidence = Number(parsed.confidence) || 0;
  } catch (err: any) {
    const timedOut = err?.killed || String(err?.message ?? "").includes("ETIMEDOUT");
    return failure(
      422,
      timedOut
        ? "Reading took too long. Try a smaller, sharper image."
        : "We could not read that image. Use a brighter, flatter photo with the whole card in frame."
    );
  } finally {
    try { fs.unlinkSync(tmpFile); } catch { /* already gone */ }
  }

  const result = verifyDocumentText({
    text,
    confidence,
    docType,
    accountName: user.name,
  });

  const ts = now();
  run(
    `INSERT INTO id_documents (user_id,doc_type,status,name,address,doc_hash,confidence,checks,reasons,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    user.id,
    docType,
    result.ok ? "approved" : "rejected",
    result.extractedName,
    result.extractedAddress,
    hash,
    result.confidence,
    JSON.stringify(result.checks),
    JSON.stringify(result.reasons),
    ts
  );

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: result.reasons[0] ?? "The document did not pass verification.",
        checks: result.checks,
        reasons: result.reasons,
        confidence: result.confidence,
        name: result.extractedName ? maskName(result.extractedName) : null,
        address: result.extractedAddress,
      },
      { status: 422 }
    );
  }

  tx(() => {
    run(
      "UPDATE users SET id_verified = 1, verified_name = ?, verified_address = ? WHERE id = ?",
      result.extractedName, result.extractedAddress, user.id
    );
    run(
      "INSERT INTO notifications (user_id,type,title,body,read,created_at) VALUES (?,?,?,?,0,?)",
      user.id, "success", "Identity verified",
      "Your ID matched your account name and address. Full access is unlocked.", ts
    );
  });

  emitToUser(user.id, "verification:update", {
    id_verified: 1,
    name: result.extractedName,
    address: result.extractedAddress,
  });
  emitToUser(user.id, "notification", {
    id: 0,
    type: "success",
    title: "Identity verified",
    body: "Your ID matched your account name and address. Full access is unlocked.",
    created_at: ts,
  });

  return NextResponse.json({
    ok: true,
    checks: result.checks,
    reasons: result.reasons,
    confidence: result.confidence,
    name: result.extractedName,
    address: result.extractedAddress,
  });
}
