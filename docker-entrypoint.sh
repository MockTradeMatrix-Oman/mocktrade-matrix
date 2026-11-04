#!/bin/sh
set -eu

# Cloud hosts often mount the persistent volume as root even though the app
# should not run as root. Fix ownership, then drop privileges.
if [ "$(id -u)" = "0" ]; then
  mkdir -p /app/data
  chown -R node:node /app/data || true
  exec gosu node "$@"
fi

exec "$@"
