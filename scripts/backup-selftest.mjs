/**
 * Offline self-test for the ephemeral-disk backup layer.
 *
 * Spins up a tiny in-memory object store, uploads a snapshot, deletes the
 * database (simulating a container restart), restores it, and verifies the
 * rows survived. No network access, no credentials.
 *
 *   node scripts/backup-selftest.mjs
 */

import { createServer } from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const checks = [];
const check = (name, ok, detail = "") => {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
};

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mtm-backup-"));
process.env.DATA_DIR = dir;
process.env.BACKUP_TOKEN = "test-token";
process.env.BACKUP_INTERVAL_MS = "60000";

const store = { body: null, puts: 0 };
const server = createServer((req, res) => {
  if (req.headers.authorization !== "Bearer test-token") {
    res.writeHead(401).end("unauthorized");
    return;
  }
  if (req.method === "PUT") {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      store.body = Buffer.concat(chunks);
      store.puts += 1;
      res.writeHead(200, { "content-type": "application/json" }).end('{"ok":true}');
    });
    return;
  }
  if (req.method === "GET") {
    if (!store.body) return res.writeHead(404).end("not found");
    res.writeHead(200, { "content-type": "application/octet-stream" }).end(store.body);
    return;
  }
  res.writeHead(405).end();
});

await new Promise((r) => server.listen(0, "127.0.0.1", r));
process.env.BACKUP_URL = `http://127.0.0.1:${server.address().port}/object/mocktrade.db`;

const { backupDatabase, restoreDatabase, dbPath } = await import("../lib/backup.mjs");

// An existing database with data, as if users had been trading.
fs.mkdirSync(dir, { recursive: true });
const seedDb = new DatabaseSync(dbPath());
seedDb.exec("PRAGMA journal_mode=WAL");
seedDb.exec("CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT)");
const insert = seedDb.prepare("INSERT INTO users (email) VALUES (?)");
for (let i = 0; i < 25; i++) insert.run(`user${i}@example.com`);
seedDb.close();

const snap = await backupDatabase("selftest");
check("snapshot uploaded", snap.ok === true && store.puts === 1, `${snap.bytes} bytes`);
check("snapshot is a valid SQLite file", store.body?.subarray(0, 15).toString() === "SQLite format 3");

// Snapshot must not be a raw copy of a WAL database (no pending sidecar).
check("snapshot is WAL-free", !fs.existsSync(`${dir}/.snapshot-${process.pid}.db`));

// Simulate the container being recycled.
fs.rmSync(dbPath(), { force: true });
fs.rmSync(`${dbPath()}-wal`, { force: true });
fs.rmSync(`${dbPath()}-shm`, { force: true });
check("database removed", !fs.existsSync(dbPath()));

const restored = await restoreDatabase();
check("restore reported success", restored.ok === true, `${restored.bytes} bytes`);

const checkDb = new DatabaseSync(dbPath());
const count = checkDb.prepare("SELECT COUNT(*) AS n FROM users").get().n;
check("rows survived the restart", count === 25, `${count} rows`);
checkDb.close();

// A second boot with an existing file must not overwrite live data.
const again = await restoreDatabase();
check("existing database is not overwritten", again.ok === false && again.reason === "database-already-present");

// Missing object must degrade to "no snapshot", never throw.
const savedUrl = process.env.BACKUP_URL;
process.env.BACKUP_URL = savedUrl.replace("/object/mocktrade.db", "/object/missing.db");
store.body = null;
fs.rmSync(dbPath(), { force: true });
const empty = await restoreDatabase();
check("missing snapshot is handled", empty.ok === false && empty.reason === "no-snapshot", empty.reason);

// Unconfigured deploys (real disk, local dev) are inert.
process.env.BACKUP_URL = "";
const inert = await backupDatabase("selftest");
check("disabled when unconfigured", inert.ok === false && inert.reason === "not-configured");

server.closeAllConnections?.();
server.close();
await new Promise((r) => setTimeout(r, 50));
fs.rmSync(dir, { recursive: true, force: true });

const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
process.exitCode = failed.length ? 1 : 0;
