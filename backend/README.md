# Urgent Care API

FastAPI backend for `mobile-app` and `content-builder-web-app`.

## Stack

- FastAPI + SQLAlchemy async + Alembic
- Postgres 16
- MinIO (S3) for media (`cubersport12` bucket, keys `public/...`)
- JWT auth (access + refresh)

## Quick start

```bash
cp .env.example .env
# edit JWT_SECRET

docker compose up -d postgres minio redis
pip install -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Or full stack: `docker compose up --build`.

Production (VPS): see [`../deploy/README.md`](../deploy/README.md) and `docker compose -f docker-compose.prod.yml up -d --build`.

## Redis file cache

The API optionally caches MinIO object bytes and `Content-Type` in Redis. Cache keys use the `urgent-care:file:v1` namespace and a digest of the bucket and object key. Files larger than `FILE_CACHE_MAX_BYTES` bypass the cache; entries expire within `FILE_CACHE_TTL_SECONDS` (maximum 300 seconds). Successful writes and deletes through `S3Client` invalidate the cached object. Direct MinIO changes are picked up when the entry expires. If Redis is unavailable, reads continue from MinIO. Set `REDIS_URL` when running the API outside Compose; it is empty by default.

Future PostgreSQL content caches for tests, rescue scenarios, and articles must use a separate `urgent-care:content:v1:{kind}:{id}` namespace, check user access on each request, and invalidate after database commits. Those content caches are not implemented here.

Daily DB backups on the VPS: `/var/backups/urgent-care/` (cron via `deploy/remote/install-backup-cron.sh`).

### Billing / subscriptions

Tariffs and YooKassa live under `/api/v1/billing/*`. Content objects have `requiredTariffId`; non-admin users only see items whose tariff `rank` is ≤ their subscription rank.

Env in `backend/.env` (see `.env.example`):

- `YOOKASSA_SHOP_ID` / `YOOKASSA_SECRET_KEY` — from YooKassa cabinet (test keys start with `test_`)
- `YOOKASSA_RETURN_URL=troubledent://billing/return`
- `BILLING_ENFORCEMENT=true`

Empty shop/secret in non-prod → subscribe activates immediately **without** opening the payment page (mock).  
With keys set → API returns `confirmationUrl`, mobile opens YooKassa via `WebBrowser.openAuthSessionAsync`.

Restart the API after changing keys (`docker compose … up -d api` or uvicorn).

Daily renew script: `python scripts/renew_subscriptions.py` (VPS cron via `deploy/remote/install-renew-cron.sh`).

Docs: http://localhost:8000/docs · OpenAPI: http://localhost:8000/openapi.json

```bash
# Export OpenAPI without a running server
python scripts/export_openapi.py --out ../mobile-app/openapi.json

# Clients (with API running):
#   cd ../mobile-app && npm run sync-and-generate-api
#   cd ../content-builder-web-app && npm run sync-and-generate-api
```

## Create admin (content-builder)

```bash
python scripts/create_admin.py --email test@yandex.ru --password test
```

Content-builder boots with this login; mobile users register via `/auth/register`.
