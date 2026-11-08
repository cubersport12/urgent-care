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

The API optionally caches MinIO object bytes, `Content-Type`, and `ETag` in Redis. Cache keys use the `urgent-care:file:v2` namespace and a digest of the bucket and object key. Files larger than `FILE_CACHE_MAX_BYTES` bypass the cache; entries expire within `FILE_CACHE_TTL_SECONDS` (maximum 300 seconds). Successful writes and deletes through `S3Client` invalidate the cached object. If Redis is unavailable, reads continue from MinIO. Set `REDIS_URL` when running the API outside Compose; it is empty by default.

## Redis learning-content cache

Published and admin-preview lists and item reads for folders, articles, tests, and rescue scenarios use Redis cache-aside with a 300-second TTL and a 1 MiB per-entry limit. Cache entries contain shared source DTOs. Publication, tariff, reward, and user-progress checks still run through the API for each request. Redis failures fall back to PostgreSQL.

The `content_cache_revision` setting changes in the same PostgreSQL transaction as writes to these four content tables, including bulk operations, publication changes, and trash recovery. A shared Redis cache generation lets an admin clear both the content and MinIO file caches without `FLUSHDB`. Old entries expire naturally. PDF cache hits check MinIO `ETag` and content type before returning bytes.

Use `CONTENT_CACHE_ENABLED=false` to disable the learning-content cache while retaining file caching. The admin settings page calls `POST /api/v1/system-settings/cache/clear`, which requires the admin role. `REDIS_URL` stays optional outside Compose.

### Run the cache tests

From `backend/`, run `python -m pytest -q -ra` for the backend suite. Use the following variables to connect the cache integration tests to disposable services.

| Variable | Test service |
| --- | --- |
| `CACHE_TEST_REDIS_URL` | Redis 7.4, for example `redis://127.0.0.1:6379/0` |
| `CACHE_TEST_POSTGRES_URL` | PostgreSQL 16 with pgvector enabled, using a `postgresql+asyncpg://` URL and a user that can create schemas |
| `CACHE_TEST_MINIO_ENDPOINT` | MinIO S3 API URL, for example `http://127.0.0.1:9002` |
| `CACHE_TEST_MINIO_ACCESS_KEY`, `CACHE_TEST_MINIO_SECRET_KEY` | Credentials that can create and remove a temporary bucket |

Enable pgvector once in the test database with `CREATE EXTENSION IF NOT EXISTS vector;`. The integration suite uses a separate PostgreSQL schema, Redis key prefix, and MinIO bucket for each applicable test. Without the service variables, pytest reports the integration cases as skipped.

```sh
python -m pytest -q -ra tests/test_content_cache.py tests/test_s3_file_cache.py tests/test_cache_integration.py tests/test_media_public.py
```

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
