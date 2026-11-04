/**
 * End-to-end check of the Render-free boot path.
 *
 * Proves that a brand-new container (empty data directory) comes up with the
 * *saved* database, not a freshly seeded one:
 *   1. take a consistent snapshot of the live database,
 *   2. serve it from a local object-store stand-in,
 *   3. boot the real server with an empty DATA_DIR,
 *   4. confirm the restored rows (and the restore log line) are present.
 *
 *   node scripts/backup-boot-e2e.mjs
 */

import { createServer } from "node:http";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const root = process.cwd();
const liveDb = path.join(root, "data", "mocktrade.db");
const checks = [];
const check = (name, ok, detail = "") => {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
};

if (!fs.existsSync(liveDb)) {
  console.error("No live database at data/mocktrade.db — start the app once first.");
  process.exit(1);
}

const work = fs.mkdtempSync(path.join(os.tmpdir(), "mtm-boot-e2e-"));
const dataDir = path.join(work, "data");
const snapshot = path.join(work, "snapshot.db");

// Consistent copy of the running database (it is in WAL mode).
{
  const src = new DatabaseSync(liveDb);
  src.exec(`VACUUM INTO '${snapshot.replace(/'/g, "''")}'`);
  src.close();
}
const source = new DatabaseSync(snapshot, { readOnly: true });
const sourceUsers = source.prepare("SELECT COUNT(*) AS n FROM users").get().n;
const hasAdmin7 = Boolean(source.prepare("SELECT id FROM users WHERE id = 7").get());
source.close();
check("snapshot taken from live database", fs.statSync(snapshot).size > 4096, `${sourceUsers} users`);

const store = { body: fs.readFileSync(snapshot), gets: 0 };
const server = createServer((req, res) => {
  if (req.method === "GET") {
    store.gets += 1;
    res.writeHead(200, { "content-type": "application/octet-stream" }).end(store.body);
    return;
  }
  res.writeHead(200).end("{}");
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));

const port = 3110;
const env = {
  ...process.env,
  NODE_ENV: "production",
  PORT: String(port),
  DATA_DIR: dataDir,
  BACKUP_URL: `http://127.0.0.1:${server.address().port}/object/mocktrade.db`,
  BACKUP_TOKEN: "e2e-token",
  BACKUP_INTERVAL_MS: "600000",
};

let output = "";
const child = spawn(process.execPath, ["server.mjs"], { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] });
child.stdout.on("data", (d) => (output += d.toString()));
child.stderr.on("data", (d) => (output += d.toString()));

const deadline = Date.now() + 90_000;
let healthy = false;
while (Date.now() < deadline) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    if (res.ok) {
      healthy = true;
      break;
    }
  } catch {
    /* not listening yet */
  }
  await new Promise((r) => setTimeout(r, 1000));
}
check("server became healthy on an empty disk", healthy);

check("container fetched the snapshot", store.gets > 0, `${store.gets} GETs`);
check("restore was logged", /\[backup\] restored \d+ KiB/.test(output), output.split("\n").find((l) => l.includes("[backup]")) || "");
check("arena attached after restore", output.includes("[arena] matchmaking attached"));

const restoredPath = path.join(dataDir, "mocktrade.db");
if (fs.existsSync(restoredPath)) {
  const db = new DatabaseSync(restoredPath, { readOnly: true });
  const restoredUsers = db.prepare("SELECT COUNT(*) AS n FROM users").get().n;
  const restoredAdmin7 = Boolean(db.prepare("SELECT id FROM users WHERE id = 7").get());
  db.close();
  check("restored rows match the snapshot", restoredUsers === sourceUsers, `${restoredUsers}/${sourceUsers}`);
  if (hasAdmin7) check("restored the real admin account (id 7)", restoredAdmin7);
} else {
  check("database exists after boot", false);
}

child.kill("SIGKILL");
server.close();
server.closeAllConnections?.();
await new Promise((r) => setTimeout(r, 200));
fs.rmSync(work, { recursive: true, force: true });

const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
process.exitCode = failed.length ? 1 : 0;
