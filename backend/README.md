# Urgent Care API

FastAPI backend replacing direct Supabase access for `mobile-app` and `content-builder-web-app`.

## Stack

- FastAPI + SQLAlchemy async + Alembic
- Postgres 16
- MinIO (S3) for media (`cubersport12` bucket, keys `public/...`)
- JWT auth (access + refresh)

## Quick start

```bash
cp .env.example .env
# edit JWT_SECRET, optionally SUPABASE_* for migration

docker compose up -d postgres minio
pip install -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Or full stack: `docker compose up --build`.

Docs: http://localhost:8000/docs · OpenAPI: http://localhost:8000/openapi.json

```bash
# Export OpenAPI without a running server
python scripts/export_openapi.py --out ../mobile-app/openapi.json

# Clients (with API running):
#   cd ../mobile-app && npm run sync-and-generate-api
#   cd ../content-builder-web-app && npm run sync-and-generate-api
```

## Migrate from Supabase

```bash
# After schema is applied and .env has SUPABASE_URL + SUPABASE_SERVICE_KEY
python scripts/migrate_from_supabase.py
```

Copies users, content tables, stats, and storage objects into local Postgres + MinIO.

Migrated users get a temporary password (default `ChangeMeAfterMigration!`).

## Create admin (content-builder)

```bash
python scripts/create_admin.py --email test@yandex.ru --password test
```

Content-builder boots with this login; mobile users register via `/auth/register`.
