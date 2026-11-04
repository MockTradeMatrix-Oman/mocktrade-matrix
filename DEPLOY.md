# Deploying MockTrade Matrix

This app is a **long-running Node 24 server**, not a set of static pages. It needs:

- a custom HTTP server (`server.mjs`) for Next.js **and Socket.IO** (`/api/socket`),
- a **persistent disk** for the SQLite database (`/app/data/mocktrade.db`),
- **one process / one replica** (SQLite has a single writer and the market engine must not run twice),
- an **always-on** instance (the price engine, crash drills, news and AI loops are timers inside the process),
- **HTTPS** in production (session cookies are `Secure`),
- a writable child process for OCR (`tesseract.js` via `scripts/ocr.mjs`).

Because of the above, **Netlify is not supported as-is**, and a serverless/edge rewrite is not possible without replacing the custom server, Socket.IO, SQLite and the engine timers. Use any Docker host: **Render, Railway, Fly.io, a VPS, or your own machine behind a reverse proxy**.

---

## 1. Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `AUTH_SECRET` | **Yes in production** | Signs session JWTs and authenticates `/api/engine/start`. Must be unique and random. The server refuses to boot without it, or if it is still the development value. |
| `PORT` | No (default `3000`) | Port to listen on. Render/Railway/Fly set this automatically. |
| `HOST` | No (default `0.0.0.0`) | Interface to bind. Keep the default on a host. |
| `COOKIE_SECURE` | No | Leave unset on HTTPS. Set to `false` only when testing a production build over `http://localhost`. |
| `OCR_CACHE_DIR` | Baked into the image | Location of the Tesseract language file. The Docker image sets `/app/ocr-cache`. |
| `NEXT_PUBLIC_FIREBASE_*` | No | Google sign-in config. The defaults in `lib/firebase.ts` target the existing Firebase project. These values are **inlined at build time**; changing them requires rebuilding, not just restarting. |

Generate a production secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Never commit `.env.local`, and never reuse the development secret. Changing `AUTH_SECRET` later is safe for data but signs every user out.

---

## 2. Run with Docker

Build:

```bash
docker build -t mocktrade-matrix .
```

Run (the named volume is the database — do not delete it):

```bash
docker volume create mocktrade-data

docker run -d --name mocktrade \
  -p 3000:3000 \
  -e AUTH_SECRET="paste-the-generated-secret" \
  -v mocktrade-data:/app/data \
  --restart unless-stopped \
  mocktrade-matrix
```

Open <http://localhost:3000>. For this local HTTP test only, add `-e COOKIE_SECURE=false`; otherwise the browser will not store the session cookie.

Check health:

```bash
curl http://localhost:3000/api/health
# {"ok":true,"db":"ok","engine":{"started":true,...}}
```

Logs:

```bash
docker logs -f mocktrade
```

### Updating

```bash
docker build -t mocktrade-matrix .
docker stop mocktrade
docker rm mocktrade
# run the same docker run command again with the SAME volume
```

The SQLite database, WAL files and temporary uploads live in the volume. Back it up before upgrades:

```bash
docker run --rm -v mocktrade-data:/data -v "%cd%":/backup alpine \
  tar czf /backup/mocktrade-backup.tgz -C /data .
```

(PowerShell: replace `%cd%` with `${PWD}`.)

---

## 3. Render free plan (zero cost) with object-storage persistence

A blueprint is included in `render.yaml` and is configured for the **free**
plan. Free web services have an **ephemeral disk**, so the SQLite file is
restored at boot and re-uploaded on a timer — see `lib/backup.mjs`.

How it behaves:

- Every 5 minutes (`BACKUP_INTERVAL_MS`) a `VACUUM INTO` snapshot is uploaded.
- On `SIGTERM` (spin-down, deploy, restart) one final snapshot is uploaded.
- On boot, if `data/mocktrade.db` is missing, the last snapshot is downloaded
  **before** anything opens the database.
- If backups are unconfigured the module is inert, so a normal disk host is
  unaffected.

Set up object storage (Supabase free tier, no card required):

1. Create a project at <https://supabase.com> (free plan).
2. **Storage → New bucket**, name it `backups`, keep it **private**.
3. **Project Settings → API**: copy the project URL and the `service_role` key.
4. Your URL is
   `https://<project-ref>.supabase.co/storage/v1/object/backups/mocktrade.db`.

Deploy:

1. Push this folder to a GitHub repository.
2. Render → **New → Blueprint** → pick the repository → apply.
3. In the service's **Environment** tab set:
   - `BACKUP_URL` — the URL from step 4
   - `BACKUP_TOKEN` — the `service_role` key
   - `BACKUP_APIKEY` — the same `service_role` key (Supabase checks it too)
4. Deploy and wait for `/api/health` to pass.

Carry over the existing data by uploading the current database as
`backups/mocktrade.db` before the first boot (make a consistent copy with
`sqlite3 data/mocktrade.db ".backup snapshot.db"`, or let the app itself write
one on shutdown).

Trade-offs you should know about:

- **Cold start.** After 15 minutes with no inbound requests the instance spins
  down; the next visit takes roughly 30–60 seconds to wake.
- **512 MB RAM / 0.1 CPU.** Fine for browsing, trading and the arena, but OCR
  during identity verification is the first thing that can run out of memory.
- **Up to 5 minutes of data** can be lost if the process is killed without
  `SIGTERM`, so the interval is the real durability knob.
- **750 instance-hours/month** are included, which is slightly more than a
  month, so one always-on instance fits. Keeping it awake 24/7 with a free
  uptime pinger (for example cron-job.org at 5-minute intervals) removes cold
  starts, but leaves no headroom.

Verify the mechanism locally before deploying:

```bash
node scripts/backup-selftest.mjs   # upload, wipe, restore, edge cases
node scripts/backup-boot-e2e.mjs   # real server boots from a saved snapshot
```

Prefer a paid instance with a real disk (`plan: starter` plus the `disk:` block)
when you can: it removes the snapshot interval, the cold starts and the 512 MB
ceiling entirely.

---

## 4. Railway / Fly.io / VPS

The same rules apply everywhere:

- **Railway:** deploy from the Dockerfile, add a volume mounted at `/app/data`, set `AUTH_SECRET`, use one replica, disable sleeping.
- **Fly.io:** `fly launch --dockerfile Dockerfile`, create a volume (`fly volumes create mocktrade_data --size 1`), mount it at `/app/data` in `fly.toml`, set the secret with `fly secrets set AUTH_SECRET=...`, keep `min_machines_running = 1` and one machine.
- **VPS:** run the Docker command above behind Caddy/Nginx with TLS, or run `npm ci && npm run build && npm start` under systemd with `NODE_ENV=production` and a persistent `data/` directory.

Always put HTTPS in front of the app. Socket.IO works through normal reverse proxies on the same origin; no extra path or CORS configuration is needed.

Mount permissions: the container runs as the unprivileged `node` user. If a bind mount denies writes, `chown -R 1000:1000` the host directory once.

---

## 5. Firebase / Google sign-in

Before real Google sign-in works in production:

1. Firebase Console → Authentication → Sign-in method → enable **Google**.
2. Authentication → Settings → **Authorized domains** → add the deployed hostname (for example `mocktrade-matrix.onrender.com`).
3. If you use a different Firebase project, set the `NEXT_PUBLIC_FIREBASE_*` values and rebuild the image.

Email/password accounts and the admin login do not depend on Firebase.

---

## 6. Keeping your existing accounts and data

A fresh volume starts with a new database (the admin account and learning modules are seeded automatically). To carry over the current local database instead:

1. Stop the local server so the SQLite WAL is flushed.
2. Copy `data/mocktrade.db`, `data/mocktrade.db-wal` and `data/mocktrade.db-shm` (all three) into the mounted volume before the first start.
3. Start the container. Do not merge two databases; replace all three files together.

With a local Docker volume:

```bash
docker run --rm -v mocktrade-data:/data -v "${PWD}/data:/backup:ro" alpine \
  sh -c "rm -f /data/mocktrade.db*; cp /backup/mocktrade.db* /data/"
```

On Render, use the service shell/SCP access to upload the three files into the disk at `/app/data`, then restart the service. Never commit the database or its backup: it contains password hashes and user records.

---

## 7. Post-deploy checklist

1. `/api/health` returns `ok: true` and `engine.started: true`.
2. Sign up, sign out, sign in again (the app intentionally has no persistent auto-login).
3. Admin login with the typed password (not pre-filled) reaches `/admin`.
4. Markets show live prices (the engine started) and both IN/US lists work.
5. A trade is blocked until identity verification, then succeeds after verification.
6. Document upload completes; the temporary image is deleted; only the extracted fields/hash are stored.
7. Guardian consent link opens and approves.
8. Shop purchase adds simulated capital.
9. Portfolio report downloads as CSV/HTML/JSON.
10. Admin can grant institution access; that account sees the Institution tab and can join/create a classroom.
11. Restart the container and confirm users, trades and classrooms are still present (proves the volume is working).

---

## 8. Things that will break production

- Using Netlify, Vercel static/serverless, or any read-only filesystem.
- Running more than one replica, or running `next start` alongside `server.mjs` (two engines, two SQLite writers).
- On a host with a persistent disk: deleting or not mounting `/app/data`.
- On a free/ephemeral host: leaving `BACKUP_URL` and `BACKUP_TOKEN` unset, which silently means the database is wiped on every restart.
- Setting `BACKUP_URL` but pointing it at a **public** bucket: it holds password hashes and user records.
- Starting with `NODE_ENV=production` and no `AUTH_SECRET`, or with the development secret (the server exits on purpose).
- Serving over plain HTTP in production while cookies are `Secure`.
- Changing `NEXT_PUBLIC_FIREBASE_*` only at runtime after the image was built.

---

## 9. Useful commands

```bash
npm ci                 # install exact dependencies
npm run dev            # development (node server.mjs)
npm run build          # production build
npm start              # production server
npx tsc --noEmit       # type check
npm run test:backup    # backup/restore unit checks
node scripts/backup-boot-e2e.mjs   # boot from a saved snapshot
```

The admin console uses the `admin` account and a typed password; it is not exposed as a public route without that login. Keep the `data/` directory private — it contains the live database.
