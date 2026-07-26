#!/usr/bin/env bash
set -euo pipefail

cd /opt/urgent-care/backend
for i in $(seq 1 45); do
  if curl -sf http://127.0.0.1:8001/health >/dev/null; then
    break
  fi
  sleep 2
done
docker compose -f docker-compose.prod.yml exec -T api \
  python scripts/create_admin.py --email test@yandex.ru --password test || true
