#!/usr/bin/env bash
# Deploy Urgent Care to VPS (Linux / GitHub Actions).
# Usage:
#   ./scripts/deploy.sh
#   ./scripts/deploy.sh --skip-build
#   ./scripts/deploy.sh --skip-frontend
#   DEPLOY_HOST=trouble-dent.ru DEPLOY_USER=root DEPLOY_SSH_KEY=~/.ssh/id_ed25519 ./scripts/deploy.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="${DEPLOY_HOST:-77.91.90.39}"
USER="${DEPLOY_USER:-root}"
SSH_KEY="${DEPLOY_SSH_KEY:-${HOME}/.ssh/id_ed25519_gymai}"
SKIP_BUILD=0
SKIP_FRONTEND=0
PUBLIC_HOST="${DEPLOY_PUBLIC_HOST:-trouble-dent.ru}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-build) SKIP_BUILD=1 ;;
    --skip-frontend) SKIP_FRONTEND=1 ;;
    --host) HOST="$2"; shift ;;
    --user) USER="$2"; shift ;;
    --key) SSH_KEY="$2"; shift ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
  shift
done

SSH_TARGET="${USER}@${HOST}"
SSH=(ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new -o IdentitiesOnly=yes)
SCP=(scp -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new -o IdentitiesOnly=yes -r)

echo "==> Deploy target: ${SSH_TARGET}"
[[ -f "$SSH_KEY" ]] || { echo "SSH key not found: $SSH_KEY" >&2; exit 1; }

cd "$REPO_ROOT"

if [[ "$SKIP_BUILD" -eq 0 && "$SKIP_FRONTEND" -eq 0 ]]; then
  echo "==> Building start-page"
  (cd start-page && [[ -d node_modules ]] || npm install --legacy-peer-deps
   npm run build)

  echo "==> Building content-builder (VPS)"
  (cd content-builder-web-app && [[ -d node_modules ]] || npm ci --legacy-peer-deps
   npm run build:vps)

  echo "==> Building mobile-app web (VPS)"
  (cd mobile-app && [[ -d node_modules ]] || npm install
   npm run web:build:vps)
fi

echo "==> Preparing remote directories"
"${SSH[@]}" "$SSH_TARGET" "mkdir -p /opt/urgent-care/backend /opt/urgent-care/deploy /var/www/urgent-care"

echo "==> Uploading backend"
"${SCP[@]}" \
  backend/app \
  backend/alembic \
  backend/alembic.ini \
  backend/scripts \
  backend/pyproject.toml \
  backend/Dockerfile \
  backend/docker-compose.prod.yml \
  backend/.env.example \
  "${SSH_TARGET}:/opt/urgent-care/backend/"

echo "==> Uploading deploy/"
"${SCP[@]}" deploy "${SSH_TARGET}:/opt/urgent-care/"

if [[ "$SKIP_FRONTEND" -eq 0 ]]; then
  echo "==> Uploading static sites"
  [[ -d dist ]] || { echo "dist/ missing — run without --skip-build" >&2; exit 1; }

  # start-page files at dist root
  shopt -s nullglob
  start_items=(dist/*)
  for item in "${start_items[@]}"; do
    base="$(basename "$item")"
    [[ "$base" == "content-builder" || "$base" == "mobile-app" ]] && continue
    "${SCP[@]}" "$item" "${SSH_TARGET}:/var/www/urgent-care/"
  done

  if [[ -d dist/content-builder ]]; then
    "${SSH[@]}" "$SSH_TARGET" "rm -rf /var/www/urgent-care/content-builder"
    "${SCP[@]}" dist/content-builder "${SSH_TARGET}:/var/www/urgent-care/"
  fi
  if [[ -d dist/mobile-app ]]; then
    "${SSH[@]}" "$SSH_TARGET" "rm -rf /var/www/urgent-care/mobile-app"
    "${SCP[@]}" dist/mobile-app "${SSH_TARGET}:/var/www/urgent-care/"
  fi

  "${SSH[@]}" "$SSH_TARGET" "chmod -R a+rX /var/www/urgent-care"
fi

echo "==> Ensuring backend .env on server"
"${SSH[@]}" "$SSH_TARGET" "bash /opt/urgent-care/deploy/remote/bootstrap-env.sh ${PUBLIC_HOST}"

echo "==> Configuring nginx"
"${SSH[@]}" "$SSH_TARGET" "bash /opt/urgent-care/deploy/remote/setup-nginx.sh"

echo "==> Ensuring swap"
"${SSH[@]}" "$SSH_TARGET" "bash /opt/urgent-care/deploy/remote/ensure-swap.sh"

echo "==> DB backup (pre-deploy)"
"${SSH[@]}" "$SSH_TARGET" "bash /opt/urgent-care/deploy/remote/backup-db.sh pre-deploy"

echo "==> Installing daily DB backup cron"
"${SSH[@]}" "$SSH_TARGET" "bash /opt/urgent-care/deploy/remote/install-backup-cron.sh"

echo "==> Installing daily subscription renew cron"
"${SSH[@]}" "$SSH_TARGET" "bash /opt/urgent-care/deploy/remote/install-renew-cron.sh"

echo "==> Starting docker compose (prod)"
"${SSH[@]}" "$SSH_TARGET" "bash /opt/urgent-care/deploy/remote/start-stack.sh"

echo "==> Ensuring admin user"
"${SSH[@]}" "$SSH_TARGET" "bash /opt/urgent-care/deploy/remote/ensure-admin.sh"

echo ""
echo "Deploy complete."
echo "  https://${PUBLIC_HOST}/"
echo "  https://${PUBLIC_HOST}/content-builder/"
echo "  https://${PUBLIC_HOST}/mobile-app/"
echo "  https://${PUBLIC_HOST}/docs"
