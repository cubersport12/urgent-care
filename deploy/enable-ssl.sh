#!/usr/bin/env bash
# Enable TLS for urgent-care.
#
# Reuse existing VPS certs (trouble-dent.ru / former Supabase):
#   DOMAIN=trouble-dent.ru \
#   CERT_FULLCHAIN=/etc/nginx/ssl/fullchain.pem \
#   CERT_KEY=/etc/nginx/ssl/ssl.key \
#   ./enable-ssl.sh
#
# Or Let's Encrypt layout:
#   DOMAIN=example.com CERT_DIR=/etc/letsencrypt/live/example.com ./enable-ssl.sh
set -euo pipefail

DOMAIN="${DOMAIN:?Set DOMAIN=your.domain}"
CERT_DIR="${CERT_DIR:-/etc/letsencrypt/live/$DOMAIN}"
CERT_FULLCHAIN="${CERT_FULLCHAIN:-}"
CERT_KEY="${CERT_KEY:-}"
SSL_DIR=/etc/nginx/ssl/urgent-care
SNIPPET=/etc/nginx/snippets/urgent-care-ssl.conf
SITE_SSL=/etc/nginx/sites-available/urgent-care-ssl

mkdir -p "$SSL_DIR"

if [[ -n "$CERT_FULLCHAIN" && -n "$CERT_KEY" ]]; then
  SRC_FULLCHAIN=$CERT_FULLCHAIN
  SRC_KEY=$CERT_KEY
elif [[ -f "$CERT_DIR/fullchain.pem" && -f "$CERT_DIR/privkey.pem" ]]; then
  SRC_FULLCHAIN=$CERT_DIR/fullchain.pem
  SRC_KEY=$CERT_DIR/privkey.pem
elif [[ -f /etc/nginx/ssl/fullchain.pem && -f /etc/nginx/ssl/ssl.key ]]; then
  SRC_FULLCHAIN=/etc/nginx/ssl/fullchain.pem
  SRC_KEY=/etc/nginx/ssl/ssl.key
else
  echo "Missing certificate files. Set CERT_FULLCHAIN/CERT_KEY or CERT_DIR." >&2
  exit 1
fi

ln -sfn "$SRC_FULLCHAIN" "$SSL_DIR/fullchain.pem"
ln -sfn "$SRC_KEY" "$SSL_DIR/privkey.pem"

install -m 644 /opt/urgent-care/deploy/nginx/snippets/urgent-care-ssl.conf.example "$SNIPPET"
sed "s/YOUR_DOMAIN/$DOMAIN/g" /opt/urgent-care/deploy/nginx/urgent-care-ssl.server.conf.example > "$SITE_SSL"

rm -f /etc/nginx/sites-enabled/urgent-care
ln -sfn "$SITE_SSL" /etc/nginx/sites-enabled/urgent-care-ssl

nginx -t
systemctl reload nginx
echo "SSL enabled for $DOMAIN (cert: $SRC_FULLCHAIN)"
