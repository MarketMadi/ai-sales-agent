#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${PORT:-3000}"

bash "$ROOT/scripts/kill-port.sh"

cd "$ROOT/frontend"
exec npx next dev -p "$PORT"
