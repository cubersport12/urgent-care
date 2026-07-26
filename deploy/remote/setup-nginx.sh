#!/usr/bin/env bash
set -euo pipefail

install -m 644 /opt/urgent-care/deploy/nginx/urgent-care.conf /etc/nginx/sites-available/urgent-care
chmod +x /opt/urgent-care/deploy/enable-ssl.sh
chmod +x /opt/urgent-care/deploy/remote/*.sh

# Prefer existing SSL site (trouble-dent.ru); do not re-enable IP-only HTTP over it.
if [[ -e /etc/nginx/sites-enabled/urgent-care-ssl ]]; then
  DOMAIN="$(awk '/server_name/ {print $2; exit}' /etc/nginx/sites-available/urgent-care-ssl | tr -d ';')"
  DOMAIN="${DOMAIN:-trouble-dent.ru}"
  DOMAIN="${DOMAIN#www.}"
  install -m 644 /opt/urgent-care/deploy/nginx/snippets/urgent-care-ssl.conf.example \
    /etc/nginx/snippets/urgent-care-ssl.conf
  sed "s/YOUR_DOMAIN/${DOMAIN}/g" \
    /opt/urgent-care/deploy/nginx/urgent-care-ssl.server.conf.example \
    > /etc/nginx/sites-available/urgent-care-ssl
  rm -f /etc/nginx/sites-enabled/urgent-care
  ln -sfn /etc/nginx/sites-available/urgent-care-ssl /etc/nginx/sites-enabled/urgent-care-ssl
  echo "nginx: keeping SSL site for ${DOMAIN}"
else
  ln -sfn /etc/nginx/sites-available/urgent-care /etc/nginx/sites-enabled/urgent-care
  echo "nginx: HTTP site enabled (no SSL site present)"
fi

nginx -t
systemctl reload nginx
