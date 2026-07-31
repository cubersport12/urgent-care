# Deploy notes (VPS)

## Layout

- App: `/opt/urgent-care/`
- Static frontends: `/var/www/urgent-care`
  - `/` → start-page
  - `/content-builder/` → content builder
  - `/mobile-app/` → mobile web
- Nginx site: `/etc/nginx/sites-available/urgent-care`
- Compose: `cd /opt/urgent-care/backend && docker compose -f docker-compose.prod.yml …`

Host ports (localhost only): API `8001`, Postgres `5433`, MinIO `9100`/`9101` — chosen to coexist with Supabase (`54321`/`54322`) on the same VPS.

## Current (HTTPS on trouble-dent.ru)

Reuses the existing certs at `/etc/nginx/ssl/fullchain.pem` + `ssl.key` (formerly Supabase).

- Start page: `https://trouble-dent.ru/`
- Content builder: `https://trouble-dent.ru/content-builder/`
- Mobile web: `https://trouble-dent.ru/mobile-app/`
- API health: `https://trouble-dent.ru/health`
- Docs: `https://trouble-dent.ru/docs`
- API: `https://trouble-dent.ru/api/v1/…`

Supabase on this VPS should stay stopped (`deploy/remote/cutover-ssl.sh`).

## Release pipeline (APK + VPS deploy)

Production deploys run only when you **publish a GitHub Release**
(`.github/workflows/release.yml`):

1. Builds `TroubleDent.apk` → Actions artifact (+ attaches to the GitHub Release)
2. Builds start-page / content-builder / mobile web and deploys to the VPS

Required GitHub **repository secrets**:

| Secret | Purpose |
|--------|---------|
| `DEPLOY_SSH_KEY` | Private SSH key for `root@77.91.90.39` (full PEM / OpenSSH private key) |
| `DEEPSEEK_TOKEN` | Optional; content-builder AI features |

Settings → Secrets and variables → Actions → New repository secret.

Manual local deploy:

```powershell
.\scripts\deploy.ps1
# or
./scripts/deploy.sh
```

Optional flags:

```powershell
.\scripts\deploy.ps1 -SkipBuild          # upload existing dist/
.\scripts\deploy.ps1 -MigrateSupabase    # run migrate_from_supabase.py on server
.\scripts\deploy.ps1 -SkipFrontend       # backend + nginx only
```

SSH key default: `~\.ssh\id_ed25519_gymai` · host: `root@77.91.90.39`.

## SSL cutover (reuse Supabase certs)

```bash
# From a machine with SSH, or on the VPS after syncing deploy/:
bash /opt/urgent-care/deploy/remote/cutover-ssl.sh
```

Or manually:

```bash
DOMAIN=trouble-dent.ru \
  CERT_FULLCHAIN=/etc/nginx/ssl/fullchain.pem \
  CERT_KEY=/etc/nginx/ssl/ssl.key \
  /opt/urgent-care/deploy/enable-ssl.sh
```

Then set in `/opt/urgent-care/backend/.env`:
- `API_PUBLIC_BASE_URL=https://trouble-dent.ru`
- `CORS_ORIGINS=["https://trouble-dent.ru","https://www.trouble-dent.ru"]`

and `docker compose -f docker-compose.prod.yml up -d api`.

## Billing (YooKassa)

Set on the VPS in `/opt/urgent-care/backend/.env`:

- `YOOKASSA_SHOP_ID` / `YOOKASSA_SECRET_KEY` — from YooKassa cabinet
- `YOOKASSA_RETURN_URL=troubledent://billing/return` (mobile deep link; client may override)
- `BILLING_ENFORCEMENT=true` — filter content by tariff rank

Webhook URL (nginx already proxies `/api/`):  
`https://trouble-dent.ru/api/v1/billing/webhooks/yookassa`

Empty shop/secret in non-prod activates subscriptions without payment (mock).

Daily renewals (scheduled plan changes, charge retries, grace → free):

```bash
# manual
bash /opt/urgent-care/deploy/remote/renew-subscriptions.sh

# install / refresh cron (04:00 UTC)
bash /opt/urgent-care/deploy/remote/install-renew-cron.sh
```

Log: `/var/log/urgent-care-renew.log`

## Database backups

Daily cron (03:00 UTC) dumps Postgres to `/var/backups/urgent-care/` (kept 14 days).
`deploy.ps1` also runs a `pre-deploy` dump before stack update.

```bash
# manual
bash /opt/urgent-care/deploy/remote/backup-db.sh

# install / refresh cron
bash /opt/urgent-care/deploy/remote/install-backup-cron.sh

# restore (custom format)
cd /opt/urgent-care/backend
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_restore -U urgent -d urgent_care --clean --if-exists \
  < /var/backups/urgent-care/YYYYMMDDTHHMMSSZ_daily/urgent_care.dump
```

Log: `/var/log/urgent-care-backup.log`

## Restart stack

```bash
cd /opt/urgent-care/backend
docker compose -f docker-compose.prod.yml up -d
systemctl reload nginx
```

## Admin (content-builder)

```bash
cd /opt/urgent-care/backend
docker compose -f docker-compose.prod.yml exec api \
  python scripts/create_admin.py --email test@yandex.ru --password test
```
