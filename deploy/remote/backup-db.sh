#!/usr/bin/env bash
# Dump Urgent Care Postgres DB (custom + gzipped SQL).
# Usage:
#   bash backup-db.sh                 # scheduled / manual
#   bash backup-db.sh pre-deploy      # tag before deploy
set -euo pipefail

TAG="${1:-daily}"
COMPOSE_DIR="${COMPOSE_DIR:-/opt/urgent-care/backend}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/urgent-care}"
KEEP_DAYS="${KEEP_DAYS:-14}"
DB_USER="${DB_USER:-urgent}"
DB_NAME="${DB_NAME:-urgent_care}"

STAMP=$(date -u +%Y%m%dT%H%M%SZ)
OUT_DIR="${BACKUP_ROOT}/${STAMP}_${TAG}"
mkdir -p "$OUT_DIR"

cd "$COMPOSE_DIR"

if ! docker compose -f "$COMPOSE_FILE" ps --status running --services 2>/dev/null | grep -qx postgres; then
  echo "postgres is not running — skip backup (${TAG})"
  rmdir "$OUT_DIR" 2>/dev/null || true
  exit 0
fi

DUMP_CUSTOM="${OUT_DIR}/${DB_NAME}.dump"
DUMP_SQL_GZ="${OUT_DIR}/${DB_NAME}.sql.gz"
META="${OUT_DIR}/meta.txt"

echo "Backing up ${DB_NAME} (${TAG}) -> ${OUT_DIR}"

docker compose -f "$COMPOSE_FILE" exec -T postgres \
  pg_dump -U "$DB_USER" -d "$DB_NAME" --format=custom --no-owner --no-acl \
  > "$DUMP_CUSTOM"

docker compose -f "$COMPOSE_FILE" exec -T postgres \
  pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --no-acl \
  | gzip -c > "$DUMP_SQL_GZ"

{
  echo "tag=${TAG}"
  echo "created_utc=${STAMP}"
  echo "db=${DB_NAME}"
  echo "user=${DB_USER}"
  echo "host=$(hostname -f 2>/dev/null || hostname)"
  echo "compose=${COMPOSE_DIR}/${COMPOSE_FILE}"
  ls -lh "$DUMP_CUSTOM" "$DUMP_SQL_GZ"
} > "$META"

chmod -R go-rwx "$OUT_DIR"

# prune old backups
find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -mtime "+${KEEP_DAYS}" -exec rm -rf {} +

echo "Backup OK: ${OUT_DIR}"
ls -lh "$DUMP_CUSTOM" "$DUMP_SQL_GZ"
