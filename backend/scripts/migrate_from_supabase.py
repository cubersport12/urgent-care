"""Migrate data + storage from Supabase into local Postgres + MinIO.

Usage:
    # Ensure .env has DATABASE_URL, S3_*, SUPABASE_URL, SUPABASE_SERVICE_KEY
    python scripts/migrate_from_supabase.py
    python scripts/migrate_from_supabase.py --skip-storage
    python scripts/migrate_from_supabase.py --skip-users

Idempotent: upserts by primary key / unique constraints.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import mimetypes
import sys
from datetime import datetime
from pathlib import Path
from typing import Any
from uuid import UUID, uuid4

import httpx
import structlog
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

# Ensure backend root on path
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.core.config import settings  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.db.base import AsyncSessionLocal  # noqa: E402
from app.models.article import Article  # noqa: E402
from app.models.folder import Folder  # noqa: E402
from app.models.rescue import Rescue  # noqa: E402
from app.models.stats import ArticleStats, RescueStats, TestResult, TestStats  # noqa: E402
from app.models.test import Test  # noqa: E402
from app.models.user import User  # noqa: E402
from app.utils.s3 import get_s3_client  # noqa: E402

log = structlog.get_logger()

CONTENT_TABLES = ("folders", "articles", "tests", "rescue")
STATS_TABLES = ("articles_stats", "tests_stats", "rescue_stats", "test_results")

FOLDER_MAP = {
    "id": "id",
    "name": "name",
    "order": "order",
    "parentId": "parent_id",
}
ARTICLE_MAP = {
    **FOLDER_MAP,
    "nextRunArticle": "next_run_article",
    "timeRead": "time_read",
    "disableWhileNotPrevComplete": "disable_while_not_prev_complete",
    "hideWhileNotPrevComplete": "hide_while_not_prev_complete",
    "includeToStatistics": "include_to_statistics",
    "linksToArticles": "links_to_articles",
}
TEST_MAP = {
    **FOLDER_MAP,
    "minScore": "min_score",
    "maxErrors": "max_errors",
    "showCorrectAnswer": "show_correct_answer",
    "includeToStatistics": "include_to_statistics",
    "showSkipButton": "show_skip_button",
    "showNavigation": "show_navigation",
    "showBackButton": "show_back_button",
    "hidden": "hidden",
    "questions": "questions",
    "accessabilityConditions": "accessability_conditions",
}
RESCUE_MAP = {
    **FOLDER_MAP,
    "createdAt": "created_at",
    "description": "description",
    "data": "data",
}


def _require_supabase() -> tuple[str, str]:
    url = (settings.supabase_url or "").rstrip("/")
    key = settings.supabase_service_key or ""
    if not url or not key:
        raise SystemExit("SUPABASE_URL and SUPABASE_SERVICE_KEY are required in .env")
    return url, key


def _headers(key: str) -> dict[str, str]:
    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


async def fetch_all_rows(
    client: httpx.AsyncClient, base: str, key: str, table: str
) -> list[dict[str, Any]]:
    """Paginated PostgREST select *. Missing tables (404) → empty list."""
    rows: list[dict[str, Any]] = []
    page_size = 1000
    start = 0
    while True:
        end = start + page_size - 1
        resp = await client.get(
            f"{base}/rest/v1/{table}",
            params={"select": "*"},
            headers={**_headers(key), "Range": f"{start}-{end}"},
        )
        if resp.status_code == 404:
            log.warning("table_missing_skipped", table=table)
            return []
        if resp.status_code == 416:
            break
        resp.raise_for_status()
        batch = resp.json()
        if not batch:
            break
        rows.extend(batch)
        if len(batch) < page_size:
            break
        start += page_size
    log.info("fetched_table", table=table, count=len(rows))
    return rows


async def fetch_auth_users(client: httpx.AsyncClient, base: str, key: str) -> list[dict]:
    users: list[dict] = []
    page = 1
    per_page = 1000
    while True:
        resp = await client.get(
            f"{base}/auth/v1/admin/users",
            params={"page": page, "per_page": per_page},
            headers=_headers(key),
        )
        if resp.status_code >= 400:
            log.warning("auth_users_fetch_failed", status=resp.status_code, body=resp.text[:300])
            break
        data = resp.json()
        batch = data.get("users") if isinstance(data, dict) else data
        if not batch:
            break
        users.extend(batch)
        if len(batch) < per_page:
            break
        page += 1
    log.info("fetched_auth_users", count=len(users))
    return users


def remap(row: dict[str, Any], mapping: dict[str, str]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for src, dst in mapping.items():
        if src in row:
            out[dst] = row[src]
        elif dst in row:
            out[dst] = row[dst]
    return out


def parse_dt(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    s = str(value).replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(s)
    except ValueError:
        return None


async def upsert_model(session: AsyncSession, model, rows: list[dict], pk: str = "id") -> int:
    if not rows:
        return 0
    count = 0
    for row in rows:
        stmt = pg_insert(model).values(**row)
        update_cols = {k: stmt.excluded[k] for k in row if k != pk}
        stmt = stmt.on_conflict_do_update(index_elements=[pk], set_=update_cols)
        await session.execute(stmt)
        count += 1
    await session.commit()
    return count


def sort_by_parent(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Topological-ish order: parents before children."""
    by_id = {r["id"]: r for r in rows if r.get("id")}
    remaining = set(by_id)
    ordered: list[dict] = []
    while remaining:
        progress = False
        for rid in list(remaining):
            parent = by_id[rid].get("parent_id")
            if parent is None or parent not in remaining:
                ordered.append(by_id[rid])
                remaining.remove(rid)
                progress = True
        if not progress:
            # cycle / missing parent — append rest
            for rid in remaining:
                ordered.append(by_id[rid])
            break
    return ordered


async def migrate_users(session: AsyncSession, users: list[dict], temp_password: str) -> int:
    count = 0
    for u in users:
        uid = u.get("id")
        email = (u.get("email") or "").lower()
        if not uid or not email:
            continue
        meta = u.get("user_metadata") or {}
        full_name = meta.get("full_name") or meta.get("name") or ""
        role = "admin" if email == settings.admin_email.lower() else "user"
        # GoTrue encrypted_password is not always bcrypt-compatible for our verifier;
        # set a known temp password and log it once.
        row = {
            "id": UUID(str(uid)),
            "email": email,
            "full_name": full_name,
            "hashed_password": hash_password(temp_password),
            "role": role,
            "is_active": True,
        }
        stmt = pg_insert(User).values(**row)
        stmt = stmt.on_conflict_do_update(
            index_elements=["id"],
            set_={
                "email": email,
                "full_name": full_name,
                "role": role,
                "hashed_password": hash_password(temp_password),
            },
        )
        await session.execute(stmt)
        count += 1
    await session.commit()
    return count


async def migrate_content(session: AsyncSession, client: httpx.AsyncClient, base: str, key: str) -> dict:
    counts: dict[str, int] = {}
    folders = [remap(r, FOLDER_MAP) for r in await fetch_all_rows(client, base, key, "folders")]
    folders = sort_by_parent(folders)
    counts["folders"] = await upsert_model(session, Folder, folders)

    articles = [remap(r, ARTICLE_MAP) for r in await fetch_all_rows(client, base, key, "articles")]
    counts["articles"] = await upsert_model(session, Article, articles)

    tests = [remap(r, TEST_MAP) for r in await fetch_all_rows(client, base, key, "tests")]
    counts["tests"] = await upsert_model(session, Test, tests)

    rescue_rows = []
    for r in await fetch_all_rows(client, base, key, "rescue"):
        mapped = remap(r, RESCUE_MAP)
        if mapped.get("created_at"):
            mapped["created_at"] = parse_dt(mapped["created_at"])
        if mapped.get("description") is None:
            mapped["description"] = ""
        if mapped.get("data") is None:
            mapped["data"] = {}
        rescue_rows.append(mapped)
    counts["rescue"] = await upsert_model(session, Rescue, rescue_rows)
    return counts


async def migrate_stats(session: AsyncSession, client: httpx.AsyncClient, base: str, key: str) -> dict:
    counts: dict[str, int] = {}

    a_rows = []
    for r in await fetch_all_rows(client, base, key, "articles_stats"):
        a_rows.append(
            {
                "id": UUID(str(r["id"])) if r.get("id") else uuid4(),
                "client_id": str(r.get("clientId") or r.get("client_id") or ""),
                "article_id": str(r.get("articleId") or r.get("article_id") or ""),
                "readed": r.get("readed"),
                "created_at": parse_dt(r.get("createdAt") or r.get("created_at")) or datetime.utcnow(),
            }
        )
    a_rows = [x for x in a_rows if x["client_id"] and x["article_id"]]
    for row in a_rows:
        stmt = pg_insert(ArticleStats).values(**row)
        stmt = stmt.on_conflict_do_update(
            constraint="articles_stats_client_article_unique",
            set_={"readed": row["readed"], "created_at": row["created_at"]},
        )
        await session.execute(stmt)
    await session.commit()
    counts["articles_stats"] = len(a_rows)

    t_rows = []
    for r in await fetch_all_rows(client, base, key, "tests_stats"):
        started = parse_dt(r.get("startedAt") or r.get("started_at"))
        if not started:
            continue
        t_rows.append(
            {
                "id": UUID(str(r["id"])) if r.get("id") else uuid4(),
                "client_id": str(r.get("clientId") or r.get("client_id") or ""),
                "test_id": str(r.get("testId") or r.get("test_id") or ""),
                "started_at": started,
                "completed_at": parse_dt(r.get("completedAt") or r.get("completed_at")),
                "passed": r.get("passed"),
                "data": r.get("data"),
            }
        )
    t_rows = [x for x in t_rows if x["client_id"] and x["test_id"]]
    counts["tests_stats"] = await upsert_model(session, TestStats, t_rows)

    rs_rows = []
    for r in await fetch_all_rows(client, base, key, "rescue_stats"):
        started = parse_dt(r.get("startedAt") or r.get("started_at"))
        if not started:
            continue
        rs_rows.append(
            {
                "id": UUID(str(r["id"])) if r.get("id") else uuid4(),
                "client_id": str(r.get("clientId") or r.get("client_id") or ""),
                "rescue_id": str(r.get("rescueId") or r.get("rescue_id") or ""),
                "started_at": started,
                "completed_at": parse_dt(r.get("completedAt") or r.get("completed_at")),
                "passed": r.get("passed"),
                "data": r.get("data"),
            }
        )
    for row in rs_rows:
        if not row["client_id"] or not row["rescue_id"]:
            continue
        stmt = pg_insert(RescueStats).values(**row)
        stmt = stmt.on_conflict_do_update(
            constraint="rescue_stats_client_rescue_unique",
            set_={
                "started_at": row["started_at"],
                "completed_at": row["completed_at"],
                "passed": row["passed"],
                "data": row["data"],
            },
        )
        await session.execute(stmt)
    await session.commit()
    counts["rescue_stats"] = len(rs_rows)

    tr_rows = []
    for r in await fetch_all_rows(client, base, key, "test_results"):
        answers = r.get("answers")
        if isinstance(answers, str):
            try:
                answers = json.loads(answers)
            except json.JSONDecodeError:
                pass
        tr_rows.append(
            {
                "id": UUID(str(r["id"])) if r.get("id") else uuid4(),
                "client_id": str(r.get("clientId") or r.get("client_id") or "") or None,
                "test_id": str(r.get("testId") or r.get("test_id") or ""),
                "total_score": int(r.get("totalScore") or r.get("total_score") or 0),
                "total_errors": int(r.get("totalErrors") or r.get("total_errors") or 0),
                "is_passed": bool(r.get("isPassed") if r.get("isPassed") is not None else r.get("is_passed")),
                "answers": answers,
                "completed_at": parse_dt(r.get("completedAt") or r.get("completed_at")),
            }
        )
    tr_rows = [x for x in tr_rows if x["test_id"]]
    counts["test_results"] = await upsert_model(session, TestResult, tr_rows)
    return counts


async def migrate_storage(client: httpx.AsyncClient, base: str, key: str) -> dict[str, int]:
    """List objects via Storage API and copy into MinIO."""
    s3 = get_s3_client()
    await s3.ensure_bucket()
    copied = 0
    skipped = 0
    errors = 0

    # Supabase storage list (recursive via prefix walk)
    async def list_prefix(prefix: str) -> list[str]:
        keys: list[str] = []
        resp = await client.post(
            f"{base}/storage/v1/object/list/cubersport12",
            headers=_headers(key),
            json={"prefix": prefix, "limit": 1000},
        )
        if resp.status_code >= 400:
            log.warning("storage_list_failed", prefix=prefix, status=resp.status_code)
            return keys
        for item in resp.json() or []:
            name = item.get("name") or ""
            # folders end without id / have null metadata
            full = f"{prefix}{name}" if prefix.endswith("/") or not prefix else f"{prefix}/{name}"
            if item.get("id") is None and not item.get("metadata"):
                # directory
                keys.extend(await list_prefix(full if full.endswith("/") else full + "/"))
            else:
                keys.append(full.lstrip("/"))
        return keys

    object_keys = await list_prefix("public/")
    if not object_keys:
        # fallback: try empty prefix
        object_keys = await list_prefix("")

    log.info("storage_objects_found", count=len(object_keys))
    for key_path in object_keys:
        try:
            if await s3.object_exists(key=key_path):
                skipped += 1
                continue
            resp = await client.get(
                f"{base}/storage/v1/object/cubersport12/{key_path}",
                headers=_headers(key),
            )
            if resp.status_code >= 400:
                errors += 1
                log.warning("storage_download_failed", key=key_path, status=resp.status_code)
                continue
            ctype = (
                resp.headers.get("content-type")
                or mimetypes.guess_type(key_path)[0]
                or "application/octet-stream"
            )
            await s3.upload_bytes(data=resp.content, key=key_path, content_type=ctype)
            copied += 1
        except Exception as exc:
            errors += 1
            log.warning("storage_copy_error", key=key_path, error=str(exc))
    return {"copied": copied, "skipped": skipped, "errors": errors}


async def main_async(args: argparse.Namespace) -> None:
    base, key = _require_supabase()
    temp_password = args.temp_password
    async with httpx.AsyncClient(timeout=120.0) as client:
        async with AsyncSessionLocal() as session:
            summary: dict[str, Any] = {}
            if not args.skip_users:
                users = await fetch_auth_users(client, base, key)
                n = await migrate_users(session, users, temp_password)
                summary["users"] = n
                if n:
                    log.info(
                        "users_migrated_temp_password",
                        password=temp_password,
                        hint="All migrated users share this temporary password",
                    )
            summary["content"] = await migrate_content(session, client, base, key)
            summary["stats"] = await migrate_stats(session, client, base, key)
        if not args.skip_storage:
            summary["storage"] = await migrate_storage(client, base, key)
    print(json.dumps(summary, indent=2, default=str))


def main() -> None:
    parser = argparse.ArgumentParser(description="Migrate Supabase → local DB/MinIO")
    parser.add_argument("--skip-users", action="store_true")
    parser.add_argument("--skip-storage", action="store_true")
    parser.add_argument(
        "--temp-password",
        default="ChangeMeAfterMigration!",
        help="Temporary password assigned to all migrated users",
    )
    args = parser.parse_args()
    asyncio.run(main_async(args))


if __name__ == "__main__":
    main()
