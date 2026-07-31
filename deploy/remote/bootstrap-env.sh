#!/usr/bin/env bash
set -euo pipefail

ENV_FILE=/opt/urgent-care/backend/.env
HOST_NAME="${1:?host}"

if [[ -n "${SUPABASE_KEY_B64:-}" ]]; then
  SUPABASE_KEY=$(printf '%s' "$SUPABASE_KEY_B64" | base64 -d)
else
  SUPABASE_KEY="${2:-}"
fi

if [[ -f "$ENV_FILE" ]]; then
  echo "backend .env already exists - leaving as-is"
  exit 0
fi

if [[ "$HOST_NAME" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  PUBLIC_BASE="http://${HOST_NAME}"
  CORS_JSON="[\"http://${HOST_NAME}\"]"
else
  PUBLIC_BASE="https://${HOST_NAME}"
  CORS_JSON="[\"https://${HOST_NAME}\",\"https://www.${HOST_NAME}\"]"
fi

JWT=$(openssl rand -hex 32)
cat > "$ENV_FILE" <<EOF
ENVIRONMENT=staging
DEBUG=false

API_HOST=0.0.0.0
API_PORT=8000
API_PUBLIC_BASE_URL=${PUBLIC_BASE}

DATABASE_URL=postgresql+asyncpg://urgent:urgent_pass@postgres:5432/urgent_care
DB_POOL_SIZE=5
DB_MAX_OVERFLOW=10
DB_ECHO=false

JWT_SECRET=${JWT}
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=43200
REFRESH_TOKEN_EXPIRE_DAYS=60
BCRYPT_ROUNDS=12

ADMIN_EMAIL=test@yandex.ru

S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET_MEDIA=cubersport12
S3_REGION=us-east-1

CORS_ORIGINS=${CORS_JSON}

# YooKassa — fill shop id/secret for live payments (empty → mock activate in non-prod)
YOOKASSA_SHOP_ID=
YOOKASSA_SECRET_KEY=
YOOKASSA_RETURN_URL=troubledent://billing/return
BILLING_ENFORCEMENT=true

SUPABASE_URL=https://trouble-dent.ru
SUPABASE_SERVICE_KEY=${SUPABASE_KEY}
EOF
chmod 600 "$ENV_FILE"
echo "Created /opt/urgent-care/backend/.env"
