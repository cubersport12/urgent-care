#!/usr/bin/env bash
set -euo pipefail

cd /opt/urgent-care/backend
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
