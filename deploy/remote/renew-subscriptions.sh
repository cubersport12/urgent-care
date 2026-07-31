#!/usr/bin/env bash
# Run daily subscription renewals / scheduled tariff changes / grace downgrades.
set -euo pipefail

COMPOSE_DIR="${COMPOSE_DIR:-/opt/urgent-care/backend}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

cd "$COMPOSE_DIR"

if ! docker compose -f "$COMPOSE_FILE" ps --status running --services 2>/dev/null | grep -qx api; then
  echo "api is not running — skip renew"
  exit 0
fi

echo "Renewing subscriptions ($(date -u +%Y-%m-%dT%H:%M:%SZ))"
docker compose -f "$COMPOSE_FILE" exec -T api \
  python scripts/renew_subscriptions.py
