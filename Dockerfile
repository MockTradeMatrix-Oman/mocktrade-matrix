# syntax=docker/dockerfile:1

FROM node:24-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# Full dependency tree (needed to build Next.js and the Tailwind CSS).
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# Production-only tree for the runtime image.
FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# No secrets are required at build time. NEXT_PUBLIC_FIREBASE_* fall back to
# the values in lib/firebase.ts; override them as build args if you use a
# different Firebase project (they are inlined into the client bundle).
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    OCR_CACHE_DIR=/app/ocr-cache

# /app/data is the persistent volume: SQLite database + temporary uploads.
# /app/ocr-cache ships inside the image so the first ID check needs no download.
RUN apt-get update \
    && apt-get install -y --no-install-recommends gosu \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /app/data /app/ocr-cache \
    && chown -R node:node /app

COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/next.config.mjs ./next.config.mjs
COPY --from=builder --chown=node:node /app/server.mjs ./server.mjs
# server.mjs imports ./lib/arena-socket.mjs and ./lib/backup.mjs, so the folder
# must exist in the runtime image or the container exits on startup.
COPY --from=builder --chown=node:node /app/lib ./lib
COPY --from=builder --chown=node:node /app/scripts ./scripts
COPY --from=builder --chown=node:node /app/ocr-cache ./ocr-cache
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000
VOLUME ["/app/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.mjs"]
