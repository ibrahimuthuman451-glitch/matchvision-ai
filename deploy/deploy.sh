#!/usr/bin/env bash
# Idempotent production deploy for MatchVision AI on uthmaniy.co.com.
set -euo pipefail

cd "$(dirname "$0")"
COMPOSE_FILE="docker-compose.prod.yml"
APP_DOMAIN="${APP_DOMAIN:-uthmaniy.co.com}"

if [ ! -f .env ]; then
  echo "[deploy] No deploy/.env found; copying .env.example (edit it to add GEMINI_API_KEY)"
  cp .env.example .env
  chmod 600 .env
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "[deploy] Docker Compose v2 is required (docker compose)." >&2
  exit 1
fi

echo "[deploy] Pulling latest image (falls back to a local build)..."
if docker compose -f "$COMPOSE_FILE" pull web; then
  UP_ARGS="--no-build"
else
  echo "[deploy] Remote image unavailable, building locally."
  UP_ARGS="--build"
fi

docker compose -f "$COMPOSE_FILE" up -d --remove-orphans $UP_ARGS

echo "[deploy] Waiting for the application health endpoint..."
HEALTHY=0
for _ in $(seq 1 45); do
  if curl -fsS http://127.0.0.1:3000/api/health >/dev/null 2>&1; then
    HEALTHY=1
    break
  fi
  sleep 2
done

if [ "$HEALTHY" -ne 1 ]; then
  echo "[deploy] Application did not become healthy. Recent logs:" >&2
  docker compose -f "$COMPOSE_FILE" logs --tail=100 web >&2 || true
  exit 1
fi

echo "[deploy] Application healthy on 127.0.0.1:3000"

if curl -fsS --max-time 20 "https://${APP_DOMAIN}/api/health" >/dev/null 2>&1; then
  echo "[deploy] HTTPS endpoint healthy: https://${APP_DOMAIN}"
else
  echo "[deploy] HTTPS is not ready yet (DNS/firewall/certificate). Check: docker compose -f $COMPOSE_FILE logs caddy"
fi

docker compose -f "$COMPOSE_FILE" ps
