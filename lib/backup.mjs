/**
 * Durable storage for the SQLite database on hosts with an ephemeral disk
 * (Render free, Koyeb, Cloud Run, etc.).
 *
 * The container filesystem is wiped on every restart, so the database is:
 *   1. restored from object storage at boot, before anything opens it, and
 *   2. uploaded as a consistent snapshot on a timer and on shutdown.
 *
 * `VACUUM INTO` is used instead of copying the file: the database runs in WAL
 * mode, so a plain copy can capture a torn database while a write is in flight.
 *
 * The storage endpoint is a plain HTTP object URL with a bearer token, which
 * covers Supabase Storage (free, no card) and any compatible service.
 *
 *   BACKUP_URL          full object URL, e.g.
 *                       https://<ref>.supabase.co/storage/v1/object/backups/mocktrade.db
 *   BACKUP_TOKEN        bearer token (Supabase service_role key)
 *   BACKUP_APIKEY       optional extra `apikey` header (Supabase requires it on
 *                       some plans)
 *   BACKUP_INTERVAL_MS  snapshot cadence, default 5 minutes, minimum 1 minute
 *
 * With the variables unset the module is inert, so local development and any
 * host with a real disk behave exactly as before.
 */

import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const MIN_DB_BYTES = 4096; // an empty SQLite file is 0 bytes; a schema is >4 KiB

export function dataDir() {
  return process.env.DATA_DIR || path.join(process.cwd(), "data");
}

export function dbPath() {
  return path.join(dataDir(), "mocktrade.db");
}

function config() {
  const url = (process.env.BACKUP_URL || "").trim();
  const token = (process.env.BACKUP_TOKEN || "").trim();
  const intervalMs = Math.max(60_000, Number(process.env.BACKUP_INTERVAL_MS || 300_000));
  return { url, token, intervalMs, enabled: Boolean(url && token) };
}

function headers() {
  const h = {
    Authorization: `Bearer ${process.env.BACKUP_TOKEN || ""}`,
    "Content-Type": "application/octet-stream",
  };
  if (process.env.BACKUP_APIKEY) h.apikey = process.env.BACKUP_APIKEY;
  return h;
}

/** Build a consistent, WAL-free copy of the live database at `target`. */
function vacuumInto(target) {
  const source = dbPath();
  fs.rmSync(target, { force: true });
  const handle = new DatabaseSync(source);
  try {
    handle.exec(`VACUUM INTO '${target.replace(/'/g, "''")}'`);
  } finally {
    try {
      handle.close();
    } catch {
      /* already closed */
    }
  }
  const size = fs.statSync(target).size;
  if (size < MIN_DB_BYTES) throw new Error(`snapshot is suspiciously small (${size} bytes)`);
  return size;
}

/**
 * Download the last snapshot when this instance has no database yet.
 * Never throws: a failed restore must not stop the server from booting, it
 * would only produce an empty database, and staying up is the better failure.
 */
export async function restoreDatabase({ force = false } = {}) {
  const cfg = config();
  if (!cfg.enabled) return { ok: false, reason: "not-configured" };

  const target = dbPath();
  if (!force && fs.existsSync(target) && fs.statSync(target).size >= MIN_DB_BYTES) {
    return { ok: false, reason: "database-already-present" };
  }

  try {
    fs.mkdirSync(dataDir(), { recursive: true });
    const res = await fetch(cfg.url, {
      headers: { ...headers(), "Cache-Control": "no-cache" },
    });

    // 400/404 is the normal "no snapshot has been written yet" answer.
    if (res.status === 400 || res.status === 404) return { ok: false, reason: "no-snapshot" };
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < MIN_DB_BYTES) return { ok: false, reason: `snapshot too small (${buf.length})` };

    // The snapshot is a complete database, so any stale WAL sidecars from a
    // previous run must not be replayed on top of it.
    fs.rmSync(`${target}-wal`, { force: true });
    fs.rmSync(`${target}-shm`, { force: true });

    const tmp = `${target}.restore`;
    fs.writeFileSync(tmp, buf);
    fs.renameSync(tmp, target);
    return { ok: true, bytes: buf.length };
  } catch (err) {
    return { ok: false, reason: err?.message || String(err) };
  }
}

/** Snapshot the database and upload it. Throws on failure so callers can log. */
export async function backupDatabase(reason = "auto") {
  const cfg = config();
  if (!cfg.enabled) return { ok: false, reason: "not-configured" };
  if (!fs.existsSync(dbPath())) return { ok: false, reason: "no-database" };

  const tmp = path.join(dataDir(), `.snapshot-${process.pid}.db`);
  try {
    // A writer can hold the lock for a few hundred ms; retry rather than losing
    // the whole interval.
    let size = 0;
    for (let attempt = 1; ; attempt++) {
      try {
        size = vacuumInto(tmp);
        break;
      } catch (err) {
        if (attempt >= 4) throw err;
        await new Promise((r) => setTimeout(r, 300 * attempt));
      }
    }
    const body = fs.readFileSync(tmp);
    if (body.length !== size) throw new Error(`snapshot size mismatch (${body.length} != ${size})`);

    const res = await fetch(cfg.url, {
      method: "PUT",
      headers: {
        ...headers(),
        // Supabase Storage: replace the existing object instead of erroring.
        "x-upsert": "true",
        "Cache-Control": "no-store",
      },
      body,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`);
    }
    return { ok: true, bytes: body.length, reason };
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

let timer = null;
let running = false;

async function tick(reason) {
  if (running) return; // never overlap two snapshots
  running = true;
  try {
    const result = await backupDatabase(reason);
    if (result.ok) {
      console.log(`  [backup] ${reason}: ${(result.bytes / 1024).toFixed(0)} KiB uploaded`);
    }
  } catch (err) {
    console.error(`  [backup] ${reason} failed:`, err?.message || err);
  } finally {
    running = false;
  }
}

/** Start the periodic upload loop. Returns false when backups are disabled. */
export function startAutoBackup() {
  const cfg = config();
  if (!cfg.enabled) return false;

  timer = setInterval(() => tick("auto"), cfg.intervalMs);
  timer.unref();

  console.log(
    `  [backup] every ${Math.round(cfg.intervalMs / 60_000)} min -> ${new URL(cfg.url).host}`
  );
  return true;
}

/**
 * Run one last upload during shutdown. Render sends SIGTERM before recycling a
 * container, so this is what keeps the data-loss window from stretching past
 * the last periodic snapshot.
 */
export async function flushBackup() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  if (!config().enabled) return;
  await tick("shutdown");
}
