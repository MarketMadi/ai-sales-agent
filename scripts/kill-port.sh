#!/usr/bin/env bash
# Free port 3000 so Next.js never silently bumps to 3001
set -euo pipefail

PORT="${PORT:-3000}"

if command -v fuser >/dev/null 2>&1; then
  fuser -k "${PORT}/tcp" 2>/dev/null || true
elif command -v lsof >/dev/null 2>&1; then
  lsof -ti:"${PORT}" | xargs -r kill -9 2>/dev/null || true
fi

sleep 0.5

if ss -tln 2>/dev/null | grep -q ":${PORT} "; then
  echo "Warning: port ${PORT} still in use" >&2
  exit 1
fi

echo "Port ${PORT} is free"
