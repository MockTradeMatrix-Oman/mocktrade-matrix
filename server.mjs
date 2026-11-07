import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { jwtVerify } from "jose";
import envPkg from "@next/env";
import { attachArena } from "./lib/arena-socket.mjs";
import { restoreDatabase, startAutoBackup, flushBackup, dbPath } from "./lib/backup.mjs";

const { loadEnvConfig } = envPkg;

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

// On hosts with an ephemeral disk the database is fetched back from object
// storage before any part of the app opens it. On a normal disk this is a no-op
// because the file already exists.
const restored = await restoreDatabase();
if (restored.ok) {
  console.log(`  [backup] restored ${(restored.bytes / 1024).toFixed(0)} KiB from object storage`);
} else if (restored.reason && restored.reason !== "not-configured") {
  console.log(`  [backup] no restore: ${restored.reason}`);
}

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT || 3000);

const DEV_SECRET = "mtm_dev_8f3a91c47be25d0fa6c1e9b7348d52ac1f0e6b9d";
const authSecret = process.env.AUTH_SECRET;

// A deployed instance must never run on the development secret: anyone could
// forge a session token. Fail fast instead of starting in an unsafe state.
if (!dev && (!authSecret || authSecret === DEV_SECRET)) {
  console.error(
    "\n  FATAL: AUTH_SECRET must be set to a unique, random value in production.\n" +
      "  Generate one with:  node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\"\n"
  );
  process.exit(1);
}

const secret = new TextEncoder().encode(authSecret || DEV_SECRET);

function readCookie(header = "", name) {
  const match = header.split(";").map((c) => c.trim()).find((c) => c.startsWith(name + "="));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

await app.prepare();

const httpServer = createServer((req, res) => {
  const pathname = new URL(req.url || "/", "http://localhost").pathname;
  if (pathname.startsWith("/api/socket")) return; // Socket.IO owns this path
  handle(req, res);
});

const io = new Server(httpServer, {
  path: "/api/socket",
  serveClient: false,
  pingInterval: 20000,
  pingTimeout: 25000,
  cors: { origin: true, credentials: true },
});

globalThis.__mtm_io = io;

io.use(async (socket, next) => {
  try {
    const token = readCookie(socket.request.headers.cookie, "mtm_token");
    if (!token) return next(new Error("unauthorized"));
    const { payload } = await jwtVerify(token, secret);
    socket.data.userId = Number(payload.uid);
    next();
  } catch {
    next(new Error("unauthorized"));
  }
});

let shuttingDown = false;

httpServer.on("error", (err) => {
  console.error("  server error:", err?.message || err);
  process.exit(1);
});

httpServer.listen(port, hostname, async () => {
  console.log(`\n  MockTrade Matrix running at http://${hostname}:${port}\n`);
  const key = authSecret || DEV_SECRET;

  // The arena opens its own handle on the shared SQLite file, so the Next side
  // must have created and migrated the schema first. On a brand-new container
  // (empty disk, no saved snapshot yet) the tables do not exist until a request
  // loads lib/db.ts, and touching the file too early attaches an arena that
  // can never save a match. /api/health imports lib/db, so it doubles as the
  // schema initialiser here.
  for (let attempt = 1; attempt <= 40; attempt++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (res.ok) break;
    } catch {
      /* server not ready yet */
    }
    if (attempt === 40) console.error("  [db] schema init did not confirm in time");
    await new Promise((r) => setTimeout(r, 750));
  }

  // Quiz arena: global skill-based matchmaking, authoritative scoring, powerups.
  try {
    attachArena(io, { dbPath: dbPath() });
    console.log("  [arena] matchmaking attached");
  } catch (err) {
    console.error("  [arena] failed to attach:", err?.message || err);
  }

  // Direct-message typing indicator. Purely a relay: the sender identity comes
  // from the authenticated socket, never from the client payload, so one
  // learner cannot impersonate another. Friendship is enforced by the HTTP
  // route that stores messages.
  io.on("connection", (socket) => {
    socket.on("dm:typing", (payload) => {
      const to = Number(payload?.to);
      const from = Number(socket.data.userId);
      if (!Number.isInteger(to) || to <= 0 || !Number.isInteger(from) || to === from) return;
      io.to(`user:${to}`).emit("dm:typing", { from, typing: Boolean(payload?.typing) });
    });
  });

  startAutoBackup();

  for (let attempt = 1; attempt <= 20; attempt++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/engine/start`, {
        method: "POST",
        headers: { "x-engine-key": key },
      });
      const body = await res.json().catch(() => ({}));
      console.log(`  engine: ${res.status} ${JSON.stringify(body)}`);
      if (res.ok) break;
    } catch (err) {
      if (attempt === 20) console.error("  engine boot failed:", err?.message || err);
    }
    await new Promise((r) => setTimeout(r, 750));
  }
});

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n  ${signal} received, shutting down...`);
  io.close();

  // Last snapshot before the container filesystem disappears. Bounded so a
  // slow/unreachable object store cannot hold the process open indefinitely.
  await Promise.race([
    flushBackup(),
    new Promise((r) => setTimeout(r, 8000)),
  ]);

  const force = setTimeout(() => process.exit(1), 15000);
  force.unref();
  httpServer.close(() => {
    clearTimeout(force);
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
