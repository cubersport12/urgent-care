#!/usr/bin/env bash
# Install daily Postgres backup cron for Urgent Care.
set -euo pipefail

SCRIPT=/opt/urgent-care/deploy/remote/backup-db.sh
CRON_FILE=/etc/cron.d/urgent-care-backup
LOG_FILE=/var/log/urgent-care-backup.log

chmod +x "$SCRIPT"
mkdir -p /var/backups/urgent-care
touch "$LOG_FILE"
chmod 640 "$LOG_FILE"

# 03:15 UTC daily
cat > "$CRON_FILE" <<EOF
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
0 3 * * * root ${SCRIPT} daily >> ${LOG_FILE} 2>&1
EOF
chmod 644 "$CRON_FILE"

echo "Installed ${CRON_FILE}"
cat "$CRON_FILE"
