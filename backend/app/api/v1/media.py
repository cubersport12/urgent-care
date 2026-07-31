"""Media upload / download / delete (MinIO proxy)."""
from __future__ import annotations

import mimetypes
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import Response
from pydantic import BaseModel, ConfigDict, Field
from starlette.responses import Response as StarletteResponse

from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin, get_current_user, get_db
from app.api.v1._content_access import assert_content_visible
from app.db.repositories.content import ArticleRepository
from app.models.user import User
from app.utils.s3 import get_s3_client

router = APIRouter(prefix="/media", tags=["media"])


class MediaUploadOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True, ser_json_by_alias=True)

    path: str
    file_name: str = Field(alias="fileName")

ALLOWED_PREFIX = "public/"


def _normalize_key(file_path: str) -> str:
    key = file_path.lstrip("/")
    if not key.startswith(ALLOWED_PREFIX):
        key = f"{ALLOWED_PREFIX}{key}"
    if ".." in key or key.startswith("/"):
        raise HTTPException(status_code=400, detail="Invalid path")
    return key


@router.get("/{file_path:path}")
async def download_media(
    file_path: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> Response:
    key = _normalize_key(file_path)
    # Article PDFs are stored as public/{articleId}.pdf
    name = key.removeprefix(ALLOWED_PREFIX)
    if name.endswith(".pdf"):
        article_id = name[:-4]
        article = await ArticleRepository(db).get(article_id)
        if article:
            await assert_content_visible(db, user, article)
    s3 = get_s3_client()
    try:
        body, content_type = await s3.get_object(key=key)
    except Exception as exc:
        raise HTTPException(status_code=404, detail="File not found") from exc
    return Response(content=body, media_type=content_type)


@router.post("", response_model=MediaUploadOut, status_code=status.HTTP_201_CREATED)
async def upload_media(
    _: Annotated[User, Depends(get_current_admin)],
    file: UploadFile = File(...),
    file_name: str | None = Form(None, alias="fileName"),
) -> MediaUploadOut:
    name = file_name or file.filename
    if not name:
        raise HTTPException(status_code=400, detail="fileName required")
    key = _normalize_key(name if name.startswith("public/") else f"public/{name}")
    data = await file.read()
    content_type = file.content_type or mimetypes.guess_type(name)[0] or "application/octet-stream"
    s3 = get_s3_client()
    await s3.ensure_bucket()
    await s3.upload_bytes(data=data, key=key, content_type=content_type)
    relative = key.removeprefix("public/")
    return MediaUploadOut(path=f"public/{relative}", file_name=relative)


@router.delete("/{file_path:path}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def delete_media(
    file_path: str,
    _: Annotated[User, Depends(get_current_admin)],
) -> StarletteResponse:
    key = _normalize_key(file_path)
    s3 = get_s3_client()
    ok = await s3.delete_file(key=key)
    if not ok:
        raise HTTPException(status_code=404, detail="File not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
