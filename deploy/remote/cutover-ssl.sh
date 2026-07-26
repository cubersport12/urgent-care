#!/usr/bin/env bash
# Stop Supabase, disable its nginx site, enable urgent-care HTTPS
# using the existing trouble-dent.ru certificates.
set -euo pipefail

DOMAIN="${DOMAIN:-trouble-dent.ru}"
CERT_FULLCHAIN="${CERT_FULLCHAIN:-/etc/nginx/ssl/fullchain.pem}"
CERT_KEY="${CERT_KEY:-/etc/nginx/ssl/ssl.key}"
SSL_DIR=/etc/nginx/ssl/urgent-care
SNIPPET=/etc/nginx/snippets/urgent-care-ssl.conf
SITE_SSL=/etc/nginx/sites-available/urgent-care-ssl

echo "==> Stopping Supabase containers"
mapfile -t SUPA < <(docker ps -a --format '{{.Names}}' | grep -E '^supabase_' || true)
if ((${#SUPA[@]})); then
  docker stop "${SUPA[@]}" || true
  docker rm "${SUPA[@]}" || true
else
  echo "No supabase_* containers found"
fi

echo "==> Disabling supabase nginx site"
rm -f /etc/nginx/sites-enabled/supabase-https.conf
# keep sites-available copy if present
if [[ -f /etc/nginx/sites-enabled/supabase-https.conf ]]; then
  rm -f /etc/nginx/sites-enabled/supabase-https.conf
fi
# also remove common enabled name variants
rm -f /etc/nginx/sites-enabled/supabase-https

echo "==> Wiring urgent-care SSL to existing certs"
test -f "$CERT_FULLCHAIN"
test -f "$CERT_KEY"
mkdir -p "$SSL_DIR"
ln -sfn "$CERT_FULLCHAIN" "$SSL_DIR/fullchain.pem"
ln -sfn "$CERT_KEY" "$SSL_DIR/privkey.pem"

install -m 644 /opt/urgent-care/deploy/nginx/snippets/urgent-care-ssl.conf.example "$SNIPPET"
sed "s/YOUR_DOMAIN/${DOMAIN}/g" \
  /opt/urgent-care/deploy/nginx/urgent-care-ssl.server.conf.example > "$SITE_SSL"

rm -f /etc/nginx/sites-enabled/urgent-care
ln -sfn "$SITE_SSL" /etc/nginx/sites-enabled/urgent-care-ssl

echo "==> Updating backend .env for HTTPS"
ENV_FILE=/opt/urgent-care/backend/.env
if [[ -f "$ENV_FILE" ]]; then
  sed -i "s|^API_PUBLIC_BASE_URL=.*|API_PUBLIC_BASE_URL=https://${DOMAIN}|" "$ENV_FILE"
  sed -i "s|^CORS_ORIGINS=.*|CORS_ORIGINS=[\"https://${DOMAIN}\",\"https://www.${DOMAIN}\"]|" "$ENV_FILE"
  grep -E '^(API_PUBLIC_BASE_URL|CORS_ORIGINS)=' "$ENV_FILE"
fi

echo "==> Reloading nginx + restarting API"
nginx -t
systemctl reload nginx
cd /opt/urgent-care/backend
docker compose -f docker-compose.prod.yml up -d api

echo "==> Health checks"
for i in $(seq 1 30); do
  if curl -sf http://127.0.0.1:8001/health >/dev/null; then
    break
  fi
  sleep 2
done
# Local openssl trust store may not include the commercial CA chain; use -k for on-box checks.
curl -skf "https://${DOMAIN}/health"; echo
for path in / /content-builder/ /mobile-app/ /docs; do
  code=$(curl -sk -o /dev/null -w '%{http_code}' "https://${DOMAIN}${path}" || echo fail)
  echo "${path} -> ${code}"
done

echo "Cutover complete: https://${DOMAIN}/"
