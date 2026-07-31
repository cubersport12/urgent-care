#!/usr/bin/env bash
# Install daily subscription renew cron (alongside DB backup).
set -euo pipefail

SCRIPT=/opt/urgent-care/deploy/remote/renew-subscriptions.sh
CRON_FILE=/etc/cron.d/urgent-care-renew
LOG_FILE=/var/log/urgent-care-renew.log

chmod +x "$SCRIPT"
touch "$LOG_FILE"
chmod 640 "$LOG_FILE"

# 04:00 UTC daily (after 03:00 backup)
cat > "$CRON_FILE" <<EOF
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
0 4 * * * root ${SCRIPT} >> ${LOG_FILE} 2>&1
EOF
chmod 644 "$CRON_FILE"

echo "Installed ${CRON_FILE}"
cat "$CRON_FILE"
